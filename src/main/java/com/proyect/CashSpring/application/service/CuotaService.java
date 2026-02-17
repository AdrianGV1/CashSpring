package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.CuotaJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import com.proyect.CashSpring.web.dto.cuota.CuotaCreateRequest;
import com.proyect.CashSpring.web.dto.cuota.CuotaResponse;
import com.proyect.CashSpring.web.dto.cuota.CuotaUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CuotaService {

    private final CuotaJpaRepository cuotaRepo;
    private final PrestamoJpaRepository prestamoRepo;

    public CuotaService(CuotaJpaRepository cuotaRepo, PrestamoJpaRepository prestamoRepo) {
        this.cuotaRepo = cuotaRepo;
        this.prestamoRepo = prestamoRepo;
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
        r.setNumeroCuota(c.getNumeroCuota());
        r.setFechaVencimiento(c.getFechaVencimiento());
        r.setMontoObjetivo(c.getMontoObjetivo());
        r.setEstado(c.getEstado());
        r.setFechaCubierta(c.getFechaCubierta());
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
