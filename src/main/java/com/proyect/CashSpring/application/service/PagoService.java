package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PagoEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PagoJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import com.proyect.CashSpring.web.dto.pago.PagoCreateRequest;
import com.proyect.CashSpring.web.dto.pago.PagoResponse;
import com.proyect.CashSpring.web.dto.pago.PagoUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
public class PagoService {

    private final PagoJpaRepository pagoRepo;
    private final PrestamoJpaRepository prestamoRepo;

    public PagoService(PagoJpaRepository pagoRepo, PrestamoJpaRepository prestamoRepo) {
        this.pagoRepo = pagoRepo;
        this.prestamoRepo = prestamoRepo;
    }

    @Transactional(readOnly = true)
    public List<PagoResponse> listarTodos() {
        return pagoRepo.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PagoResponse> listarPorPrestamo(Long prestamoId) {
        return pagoRepo.findByPrestamoIdOrderByFechaPagoAsc(prestamoId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PagoResponse crear(PagoCreateRequest req) {

        PrestamoEntity prestamo = prestamoRepo.findById(req.getPrestamoId())
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + req.getPrestamoId()));

        LocalDate fechaPago = req.getFechaPago() != null ? req.getFechaPago() : LocalDate.now();

        // Cuotas pendientes ordenadas de más antigua (menor número) a más reciente
        List<CuotaEntity> pendientesAsc = prestamo.getCuotas().stream()
                .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                .sorted(Comparator.comparing(CuotaEntity::getNumeroCuota))
                .collect(java.util.stream.Collectors.toList());

        if (pendientesAsc.isEmpty()) {
            prestamoRepo.save(prestamo);
            PagoEntity pago = PagoEntity.builder()
                    .prestamo(prestamo)
                    .fechaPago(fechaPago)
                    .monto(req.getMonto())
                    .notas(req.getNotas())
                    .build();
            return toResponse(pagoRepo.save(pago));
        }

        long restante = req.getMonto();

        // Paso 1: cancelar UNA SOLA cuota de la más cercana (menor número)
        CuotaEntity masProxima = pendientesAsc.get(0);
        long faltaProxima = masProxima.getMontoObjetivo() - masProxima.getMontoCancelado();

        if (restante >= faltaProxima) {
            // Cubre la cuota más próxima completamente
            masProxima.setMontoCancelado(masProxima.getMontoObjetivo());
            masProxima.setEstado(EstadoCuota.CUBIERTA);
            masProxima.setFechaCubierta(fechaPago);
            restante -= faltaProxima;

            // Paso 2: el sobrante va a las cuotas MÁS LEJANAS (mayor número), de atrás hacia adelante
            // Se refresca la lista sin la cuota ya cubierta
            List<CuotaEntity> pendientesDesc = prestamo.getCuotas().stream()
                    .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                    .sorted(Comparator.comparing(CuotaEntity::getNumeroCuota).reversed())
                    .collect(java.util.stream.Collectors.toList());

            for (CuotaEntity cuota : pendientesDesc) {
                if (restante <= 0) break;
                long falta = cuota.getMontoObjetivo() - cuota.getMontoCancelado();
                if (restante >= falta) {
                    cuota.setMontoCancelado(cuota.getMontoObjetivo());
                    cuota.setEstado(EstadoCuota.CUBIERTA);
                    cuota.setFechaCubierta(fechaPago);
                    restante -= falta;
                } else {
                    // Abono parcial a esta cuota lejana
                    cuota.setMontoCancelado(cuota.getMontoCancelado() + restante);
                    restante = 0;
                }
            }
        } else {
            // No alcanza para cubrir ni la más próxima: abono parcial a ella
            masProxima.setMontoCancelado(masProxima.getMontoCancelado() + restante);
            restante = 0;
        }

        // Guardar cambios en cuotas (cascade desde prestamo)
        prestamoRepo.save(prestamo);

        PagoEntity pago = PagoEntity.builder()
                .prestamo(prestamo)
                .fechaPago(fechaPago)
                .monto(req.getMonto())
                .notas(req.getNotas())
                .build();

        PagoEntity guardado = pagoRepo.save(pago);
        return toResponse(guardado);
    }

    @Transactional
    public PagoResponse actualizar(Long pagoId, PagoUpdateRequest req) {

        PagoEntity pago = pagoRepo.findById(pagoId)
                .orElseThrow(() -> new IllegalArgumentException("Pago no encontrado: " + pagoId));

        if (req.getFechaPago() != null) {
            pago.setFechaPago(req.getFechaPago());
        }
        if (req.getMonto() != null) {
            pago.setMonto(req.getMonto());
        }
        if (req.getNotas() != null) {
            pago.setNotas(req.getNotas());
        }

        PagoEntity guardado = pagoRepo.save(pago);
        return toResponse(guardado);
    }

    private PagoResponse toResponse(PagoEntity p) {
        PagoResponse r = new PagoResponse();
        r.setPagoId(p.getId());
        r.setPrestamoId(p.getPrestamo().getId());
        r.setFechaPago(p.getFechaPago());
        r.setMonto(p.getMonto());
        r.setNotas(p.getNotas());
        return r;
    }
}