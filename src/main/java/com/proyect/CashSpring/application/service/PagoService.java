package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.infrastructure.persistence.entity.PagoEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PagoJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import com.proyect.CashSpring.web.dto.pago.PagoCreateRequest;
import com.proyect.CashSpring.web.dto.pago.PagoResponse;
import com.proyect.CashSpring.web.dto.pago.PagoUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        PagoEntity pago = PagoEntity.builder()
                .prestamo(prestamo)
                .fechaPago(req.getFechaPago())
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
