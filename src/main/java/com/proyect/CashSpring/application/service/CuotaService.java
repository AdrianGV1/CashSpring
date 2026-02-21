package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.domain.enums.TipoAcuerdo;
import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.CuotaJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import com.proyect.CashSpring.web.dto.cuota.CuotaCreateRequest;
import com.proyect.CashSpring.web.dto.cuota.CuotaResponse;
import com.proyect.CashSpring.web.dto.cuota.CuotaUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class CuotaService {

    private final CuotaJpaRepository cuotaRepo;
    private final PrestamoJpaRepository prestamoRepo;

    public CuotaService(CuotaJpaRepository cuotaRepo, PrestamoJpaRepository prestamoRepo) {
        this.cuotaRepo = cuotaRepo;
        this.prestamoRepo = prestamoRepo;
    }

     @Transactional
    public void extenderPrestamo(Long prestamoId, Long montoExtendido) {
        // Verificar si el préstamo existe
        PrestamoEntity prestamo = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + prestamoId));

        // Verificar si el préstamo es del tipo QUINCENAS_DOBLES y si el cliente ha pagado al menos el 50%
        if (prestamo.getTipoAcuerdo() != TipoAcuerdo.QUINCENAS_DOBLES) {
            throw new IllegalArgumentException("Solo los préstamos con acuerdo QUINCENAS_DOBLES pueden ser extendidos.");
        }

        // Verificar que el cliente haya pagado al menos el 50% de la deuda
        long montoPagado = prestamo.getPagos().stream().mapToLong(pago -> pago.getMonto()).sum();
        long montoAdeudado = prestamo.getTotalObjetivo() - montoPagado;
        if (montoPagado < (prestamo.getTotalObjetivo() / 2)) {
            throw new IllegalArgumentException("Debe haber pagado al menos el 50% del préstamo para poder extenderlo.");
        }

        // Extender el préstamo
        long montoNuevo = prestamo.getMontoPrestado() + montoExtendido;
        long totalNuevo = montoNuevo * 2;
        prestamo.setMontoPrestado(montoNuevo);
        prestamo.setTotalObjetivo(totalNuevo);
        prestamo.setEsExtendido(true);  // Marcar el préstamo como extendido

        // Crear nuevas cuotas con el nuevo monto
        int numeroCuota = prestamo.getCuotas().size() + 1;
        LocalDate fechaVencimiento = prestamo.getFechaInicio().plusDays(15); // Sumar la primera cuota

        long montoCuota = totalNuevo / 13; // Ejemplo de 13 cuotas

        for (int i = numeroCuota; i <= 13; i++) {
            CuotaEntity cuota = CuotaEntity.builder()
                    .prestamo(prestamo)
                    .numeroCuota(i)
                    .fechaVencimiento(fechaVencimiento)
                    .montoObjetivo(montoCuota)
                    .estado(EstadoCuota.PENDIENTE)
                    .esCuotaExtendida(true)
                    .build();
            prestamo.getCuotas().add(cuota);
            fechaVencimiento = fechaVencimiento.plusDays(15);
        }

        // Guardar los cambios
        prestamoRepo.save(prestamo);
    }

    @Transactional(readOnly = true)
    public List<CuotaResponse> listarPorPrestamo(Long prestamoId) {
        return cuotaRepo.findByPrestamoIdOrderByNumeroCuotaAsc(prestamoId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CuotaResponse> listarPorPrestamoYEstado(Long prestamoId, EstadoCuota estado) {
        return cuotaRepo.findByPrestamoIdAndEstadoOrderByNumeroCuotaAsc(prestamoId, estado)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CuotaResponse crear(CuotaCreateRequest req) {

        PrestamoEntity prestamo = prestamoRepo.findById(req.getPrestamoId())
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + req.getPrestamoId()));

        CuotaEntity cuota = CuotaEntity.builder()
                .prestamo(prestamo)
                .numeroCuota(req.getNumeroCuota())
                .fechaVencimiento(req.getFechaVencimiento())
                .montoObjetivo(req.getMontoObjetivo())
                .build();

        CuotaEntity guardada = cuotaRepo.save(cuota);
        return toResponse(guardada);
    }

    @Transactional
    public CuotaResponse actualizar(Long cuotaId, CuotaUpdateRequest req) {

        CuotaEntity cuota = cuotaRepo.findById(cuotaId)
                .orElseThrow(() -> new IllegalArgumentException("Cuota no encontrada: " + cuotaId));

        if (req.getFechaVencimiento() != null) {
            cuota.setFechaVencimiento(req.getFechaVencimiento());
        }

        if (req.getMontoObjetivo() != null) {
            cuota.setMontoObjetivo(req.getMontoObjetivo());
        }

        if (req.getEstado() != null) {
            cuota.setEstado(req.getEstado());
        }

        if (req.getFechaCubierta() != null) {
            cuota.setFechaCubierta(req.getFechaCubierta());
        }

        CuotaEntity guardada = cuotaRepo.save(cuota);
        return toResponse(guardada);
    }

    private CuotaResponse toResponse(CuotaEntity c) {
        CuotaResponse r = new CuotaResponse();
        r.setCuotaId(c.getId());
        r.setPrestamoId(c.getPrestamo().getId());
        r.setClienteNombre(c.getPrestamo().getCliente().getNombre());
        r.setNumeroCuota(c.getNumeroCuota());
        r.setFechaVencimiento(c.getFechaVencimiento());
        r.setMontoObjetivo(c.getMontoObjetivo());
        r.setEstado(c.getEstado());
        r.setFechaCubierta(c.getFechaCubierta());
        r.setEsCuotaExtendida(c.getEsCuotaExtendida());
        r.setMontoCancelado(c.getMontoCancelado() != null ? c.getMontoCancelado() : 0L);
        return r;
    }

    @Transactional(readOnly = true)
public List<CuotaResponse> listarTodas() {
    return cuotaRepo.findAll()
            .stream()
            .map(this::toResponse)
            .toList();
}

}
