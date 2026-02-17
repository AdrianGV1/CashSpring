package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.domain.enums.TipoAcuerdo;
import com.proyect.CashSpring.infrastructure.persistence.entity.ClienteEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.ClienteJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoCreateRequest;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoResponse;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class PrestamoService {

    private final ClienteJpaRepository clienteRepo;
    private final PrestamoJpaRepository prestamoRepo;

    public PrestamoService(ClienteJpaRepository clienteRepo, PrestamoJpaRepository prestamoRepo) {
        this.clienteRepo = clienteRepo;
        this.prestamoRepo = prestamoRepo;
    }

    @Transactional
    public PrestamoResponse crearPrestamo(PrestamoCreateRequest req) {

        ClienteEntity cliente = clienteRepo.findById(req.getClienteId())
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado: " + req.getClienteId()));

        BigDecimal interes = (req.getInteresBase() == null) ? new BigDecimal("0.2000") : req.getInteresBase();

        PrestamoEntity prestamo = PrestamoEntity.builder()
                .cliente(cliente)
                .montoPrestado(req.getMontoPrestado())
                .interesBase(interes)
                .tipoAcuerdo(req.getTipoAcuerdo())
                .fechaInicio(req.getFechaInicio())
                .estado(EstadoPrestamo.ACTIVO)
                .build();

        aplicarAcuerdoYGenerarCuotas(
                prestamo,
                req.getTipoAcuerdo(),
                req.getMontoCuota1(),
                req.getMontoCuota2(),
                req.getCantidadCuotas()
        );

        PrestamoEntity guardado = prestamoRepo.save(prestamo);
        return toResponse(guardado);
    }

    @Transactional
    public PrestamoResponse actualizarPrestamo(Long prestamoId, PrestamoUpdateRequest req) {

        PrestamoEntity prestamo = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + prestamoId));

        boolean requiereRecalculo = false;

        if (req.getClienteId() != null && !req.getClienteId().equals(prestamo.getCliente().getId())) {
            ClienteEntity cliente = clienteRepo.findById(req.getClienteId())
                    .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado: " + req.getClienteId()));
            prestamo.setCliente(cliente);
        }

        if (req.getMontoPrestado() != null && !req.getMontoPrestado().equals(prestamo.getMontoPrestado())) {
            prestamo.setMontoPrestado(req.getMontoPrestado());
            requiereRecalculo = true;
        }

        if (req.getInteresBase() != null && !req.getInteresBase().equals(prestamo.getInteresBase())) {
            prestamo.setInteresBase(req.getInteresBase());
            requiereRecalculo = true;
        }

        if (req.getFechaInicio() != null && !req.getFechaInicio().equals(prestamo.getFechaInicio())) {
            prestamo.setFechaInicio(req.getFechaInicio());
            requiereRecalculo = true;
        }

        if (req.getTipoAcuerdo() != null && req.getTipoAcuerdo() != prestamo.getTipoAcuerdo()) {
            prestamo.setTipoAcuerdo(req.getTipoAcuerdo());
            requiereRecalculo = true;
        }

        // Si cambias parámetros que afectan cuotas (en tu UpdateRequest deben existir estos campos)
        if (req.getMontoCuota1() != null || req.getMontoCuota2() != null || req.getCantidadCuotas() != null) {
            requiereRecalculo = true;
        }

        if (requiereRecalculo) {
            prestamo.getCuotas().clear();
            aplicarAcuerdoYGenerarCuotas(
                    prestamo,
                    prestamo.getTipoAcuerdo(),
                    req.getMontoCuota1(),
                    req.getMontoCuota2(),
                    req.getCantidadCuotas()
            );
            prestamo.setEstado(EstadoPrestamo.ACTIVO);
        }

        PrestamoEntity guardado = prestamoRepo.save(prestamo);
        return toResponse(guardado);
    }

    @Transactional(readOnly = true)
    public List<PrestamoResponse> listarPrestamos() {
        return prestamoRepo.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // -----------------------------
    // LÓGICA DE ACUERDOS (cuotas)
    // -----------------------------

    private void aplicarAcuerdoYGenerarCuotas(
            PrestamoEntity prestamo,
            TipoAcuerdo acuerdo,
            Long montoCuota1,
            Long montoCuota2,
            Integer cantidadCuotas
    ) {
        if (acuerdo == null) throw new IllegalArgumentException("tipoAcuerdo es obligatorio");

        switch (acuerdo) {
            case PENALIZACION_POR_DIA -> aplicarAcuerdo1(prestamo);
            case PAGO_EN_MES -> aplicarAcuerdo2(prestamo, montoCuota1, montoCuota2);
            case QUINCENAS_DOBLES -> aplicarAcuerdo3(prestamo, cantidadCuotas);
        }
    }

    // Acuerdo 1: 1 cuota a 15 días, total = monto + monto*interes
    private void aplicarAcuerdo1(PrestamoEntity prestamo) {
        long totalObjetivo = calcularTotalMontoMasInteres(prestamo.getMontoPrestado(), prestamo.getInteresBase());
        prestamo.setTotalObjetivo(totalObjetivo);

        LocalDate venc = prestamo.getFechaInicio().plusDays(15);
        prestamo.getCuotas().add(crearCuota(prestamo, 1, venc, totalObjetivo));
    }

    // Acuerdo 2: interés doble, 2 cuotas (15 y 30 días)
    private void aplicarAcuerdo2(PrestamoEntity prestamo, Long montoCuota1, Long montoCuota2) {
        BigDecimal interesDoble = prestamo.getInteresBase().multiply(new BigDecimal("2"));
        long totalObjetivo = calcularTotalMontoMasInteres(prestamo.getMontoPrestado(), interesDoble);
        prestamo.setTotalObjetivo(totalObjetivo);

        long c1;
        long c2;

        if (montoCuota1 == null && montoCuota2 == null) {
            c1 = totalObjetivo / 2;
            c2 = totalObjetivo - c1;
        } else if (montoCuota1 != null && montoCuota2 != null) {
            if (montoCuota1 + montoCuota2 != totalObjetivo) {
                throw new IllegalArgumentException("En PAGO_EN_MES, montoCuota1 + montoCuota2 debe ser igual a totalObjetivo (" + totalObjetivo + ")");
            }
            c1 = montoCuota1;
            c2 = montoCuota2;
        } else {
            throw new IllegalArgumentException("En PAGO_EN_MES, o envías ambas cuotas (montoCuota1 y montoCuota2) o no envías ninguna");
        }

        LocalDate v1 = prestamo.getFechaInicio().plusDays(15);
        LocalDate v2 = prestamo.getFechaInicio().plusDays(30);

        prestamo.getCuotas().add(crearCuota(prestamo, 1, v1, c1));
        prestamo.getCuotas().add(crearCuota(prestamo, 2, v2, c2));
    }

    // Acuerdo 3: total = monto*2, se paga en N quincenas (cantidadCuotas)
    private void aplicarAcuerdo3(PrestamoEntity prestamo, Integer cantidadCuotas) {
        if (cantidadCuotas == null || cantidadCuotas <= 0) {
            throw new IllegalArgumentException("En QUINCENAS_DOBLES, cantidadCuotas es obligatoria y > 0");
        }

        long totalObjetivo = prestamo.getMontoPrestado() * 2;
        prestamo.setTotalObjetivo(totalObjetivo);

        long base = totalObjetivo / cantidadCuotas;
        long residuo = totalObjetivo - (base * cantidadCuotas);

        LocalDate venc = prestamo.getFechaInicio().plusDays(15);

        for (int i = 1; i <= cantidadCuotas; i++) {
            long monto = base;
            if (i == cantidadCuotas) monto = base + residuo; // último absorbe residuo
            prestamo.getCuotas().add(crearCuota(prestamo, i, venc, monto));
            venc = venc.plusDays(15);
        }
    }

    private CuotaEntity crearCuota(PrestamoEntity prestamo, int numero, LocalDate venc, long monto) {
        return CuotaEntity.builder()
                .prestamo(prestamo)
                .numeroCuota(numero)
                .fechaVencimiento(venc)
                .montoObjetivo(monto)
                .estado(EstadoCuota.PENDIENTE)
                .build();
    }

    private long calcularTotalMontoMasInteres(Long montoPrestado, BigDecimal interes) {
        BigDecimal monto = BigDecimal.valueOf(montoPrestado);
        BigDecimal total = monto.add(monto.multiply(interes));
        return total.setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    // -----------------------------
    // MAPPER RESPONSE
    // -----------------------------

    private PrestamoResponse toResponse(PrestamoEntity p) {
        PrestamoResponse resp = new PrestamoResponse();
        resp.setPrestamoId(p.getId());
        resp.setClienteId(p.getCliente().getId());
        resp.setMontoPrestado(p.getMontoPrestado());
        resp.setInteresBase(p.getInteresBase());
        resp.setTipoAcuerdo(p.getTipoAcuerdo());
        resp.setFechaInicio(p.getFechaInicio());
        resp.setTotalObjetivo(p.getTotalObjetivo());
        resp.setEstado(p.getEstado());

        List<PrestamoResponse.CuotaItem> cuotas = new ArrayList<>();
        for (CuotaEntity c : p.getCuotas()) {
            PrestamoResponse.CuotaItem item = new PrestamoResponse.CuotaItem();
            item.setNumeroCuota(c.getNumeroCuota());
            item.setFechaVencimiento(c.getFechaVencimiento());
            item.setMontoObjetivo(c.getMontoObjetivo());
            cuotas.add(item);
        }
        resp.setCuotas(cuotas);

        return resp;
    }
}
