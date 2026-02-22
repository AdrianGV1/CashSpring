package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.domain.enums.EstadoAprobacionPago;
import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PagoEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PagoJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import com.proyect.CashSpring.web.dto.pago.PagoCreateRequest;
import com.proyect.CashSpring.web.dto.pago.PagoResponse;
import com.proyect.CashSpring.web.dto.pago.PagoUpdateRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
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

        // Determinar el estado de aprobación según el rol del usuario
        EstadoAprobacionPago estadoAprobacion = isAdmin() 
                ? EstadoAprobacionPago.APROBADO 
                : EstadoAprobacionPago.EN_ESPERA;

        // Crear el pago
        PagoEntity pago = PagoEntity.builder()
                .prestamo(prestamo)
                .fechaPago(fechaPago)
                .monto(req.getMonto())
                .notas(req.getNotas())
                .estadoAprobacion(estadoAprobacion)
                .build();

        PagoEntity guardado = pagoRepo.save(pago);

        // Solo procesar cuotas si es ADMIN (estado APROBADO)
        if (estadoAprobacion == EstadoAprobacionPago.APROBADO) {
            procesarCuotasConPago(prestamo, req.getMonto(), fechaPago);
            prestamoRepo.save(prestamo);
        }

        return toResponse(guardado);
    }

    @Transactional
    public PagoResponse aprobarPago(Long pagoId) {
        PagoEntity pago = pagoRepo.findById(pagoId)
                .orElseThrow(() -> new IllegalArgumentException("Pago no encontrado: " + pagoId));

        if (pago.getEstadoAprobacion() != EstadoAprobacionPago.EN_ESPERA) {
            throw new IllegalArgumentException("El pago ya fue procesado");
        }

        // Cambiar estado a APROBADO
        pago.setEstadoAprobacion(EstadoAprobacionPago.APROBADO);

        // Procesar las cuotas del préstamo
        PrestamoEntity prestamo = pago.getPrestamo();
        procesarCuotasConPago(prestamo, pago.getMonto(), pago.getFechaPago());
        prestamoRepo.save(prestamo);

        return toResponse(pagoRepo.save(pago));
    }

    @Transactional
    public void rechazarPago(Long pagoId) {
        PagoEntity pago = pagoRepo.findById(pagoId)
                .orElseThrow(() -> new IllegalArgumentException("Pago no encontrado: " + pagoId));

        if (pago.getEstadoAprobacion() != EstadoAprobacionPago.EN_ESPERA) {
            throw new IllegalArgumentException("El pago ya fue procesado");
        }

        // Simplemente eliminar el pago rechazado
        pagoRepo.delete(pago);
    }

    private void procesarCuotasConPago(PrestamoEntity prestamo, Long montoPago, LocalDate fechaPago) {
        // Cuotas pendientes ordenadas de más antigua (menor número) a más reciente
        List<CuotaEntity> pendientesAsc = prestamo.getCuotas().stream()
                .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                .sorted(Comparator.comparing(CuotaEntity::getNumeroCuota))
                .collect(java.util.stream.Collectors.toList());

        if (pendientesAsc.isEmpty()) {
            return;
        }

        long restante = montoPago;

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

        // Si todas las cuotas están cubiertas, marcar el préstamo como PAGADO
        boolean todasCubiertas = !prestamo.getCuotas().isEmpty() &&
                prestamo.getCuotas().stream().allMatch(c -> c.getEstado() == EstadoCuota.CUBIERTA);
        if (todasCubiertas) {
            prestamo.setEstado(EstadoPrestamo.PAGADO);
        }
    }

    @Transactional(readOnly = true)
    public List<PagoResponse> listarSolicitudesPendientes() {
        return pagoRepo.findAll()
                .stream()
                .filter(p -> p.getEstadoAprobacion() == EstadoAprobacionPago.EN_ESPERA)
                .map(this::toResponse)
                .toList();
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
        r.setClienteNombre(p.getPrestamo().getCliente().getNombre());
        r.setClienteCedula(p.getPrestamo().getCliente().getCedula());
        r.setFechaPago(p.getFechaPago());
        r.setMonto(p.getMonto());
        r.setNotas(p.getNotas());
        r.setEstadoAprobacion(p.getEstadoAprobacion());
        return r;
    }
}