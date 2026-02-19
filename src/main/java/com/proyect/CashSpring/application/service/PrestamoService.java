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

    // Validar campos obligatorios del cliente
    if (req.getCedula() == null || req.getCedula().isBlank())
        throw new IllegalArgumentException("La cédula es obligatoria.");
    if (req.getNombre() == null || req.getNombre().isBlank())
        throw new IllegalArgumentException("El nombre es obligatorio.");
    if (req.getTelefono() == null || req.getTelefono().isBlank())
        throw new IllegalArgumentException("El teléfono es obligatorio.");
    if (req.getUbicacion() == null || req.getUbicacion().isBlank())
        throw new IllegalArgumentException("La ubicación es obligatoria.");

    // Verificar que la cédula no esté registrada
    if (clienteRepo.findByCedula(req.getCedula().trim()).isPresent()) {
        throw new IllegalArgumentException("Ya existe un cliente registrado con esa cédula.");
    }

    // Crear el cliente nuevo
    ClienteEntity cliente = ClienteEntity.builder()
            .nombre(req.getNombre().trim())
            .telefono(req.getTelefono().trim())
            .cedula(req.getCedula().trim())
            .ubicacion(req.getUbicacion().trim())
            .notas(req.getNotas())
            .activo(true)
            .build();
    cliente = clienteRepo.save(cliente);

    // Si el campo 'interesBase' es null, asignamos el valor por defecto
    BigDecimal interes = (req.getInteresBase() == null) ? new BigDecimal("0.2000") : req.getInteresBase();

    // Crear el objeto de préstamo
    PrestamoEntity prestamo = PrestamoEntity.builder()
            .cliente(cliente)
            .montoPrestado(req.getMontoPrestado())
            .interesBase(interes)
            .tipoAcuerdo(req.getTipoAcuerdo())
            .fechaInicio(req.getFechaInicio())
            .estado(EstadoPrestamo.ACTIVO)
            .build();

    // Aplicar el acuerdo y generar las cuotas dependiendo del tipo de acuerdo
    aplicarAcuerdoYGenerarCuotas(
            prestamo,
            req.getTipoAcuerdo(),
            req.getCantidadQuincenas(),
            req.getMontoPorQuincena()
    );

    // Guardar el préstamo en la base de datos
    PrestamoEntity guardado = prestamoRepo.save(prestamo);

    // Mapear el objeto guardado a la respuesta
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

        // Parámetros que afectan cuotas (por ahora solo PAGO_EN_MES)
        if (req.getCantidadQuincenas() != null) {
            requiereRecalculo = true;
        }

        if (requiereRecalculo) {
            prestamo.getCuotas().clear();

            // En UPDATE todavía NO permitimos cambiar el montoPorQuincena.
            // Como no se guarda en BD, por ahora bloqueamos recalcular QUINCENAS_DOBLES en update.
            if (prestamo.getTipoAcuerdo() == TipoAcuerdo.QUINCENAS_DOBLES) {
                throw new IllegalArgumentException("Por ahora no se permite recalcular QUINCENAS_DOBLES en update, porque el montoPorQuincena solo se define al crear. Luego lo habilitamos.");
            }

            aplicarAcuerdoYGenerarCuotas(
                    prestamo,
                    prestamo.getTipoAcuerdo(),
                    req.getCantidadQuincenas(),
                    null
            );

            prestamo.setEstado(EstadoPrestamo.ACTIVO);
        }

        PrestamoEntity guardado = prestamoRepo.save(prestamo);
        return toResponse(guardado);
    }

    @Transactional(readOnly = true)
    public PrestamoResponse obtenerPrestamo(Long id) {
        PrestamoEntity p = prestamoRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + id));
        return toResponse(p);
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
            Integer cantidadQuincenas, // SOLO PAGO_EN_MES
            Long montoPorQuincena      // SOLO QUINCENAS_DOBLES
    ) {
        if (acuerdo == null) throw new IllegalArgumentException("tipoAcuerdo es obligatorio");

        switch (acuerdo) {
            case PENALIZACION_POR_DIA -> aplicarAcuerdo1(prestamo);
            case PAGO_EN_MES -> aplicarAcuerdo2Variable(prestamo, cantidadQuincenas);
            case QUINCENAS_DOBLES -> aplicarAcuerdo3(prestamo, montoPorQuincena);
        }
    }

    // Acuerdo 1: 1 cuota a 15 días, total = monto + monto*interes
    private void aplicarAcuerdo1(PrestamoEntity prestamo) {
        long totalObjetivo = calcularTotalMontoMasInteres(prestamo.getMontoPrestado(), prestamo.getInteresBase());
        prestamo.setTotalObjetivo(totalObjetivo);

        LocalDate venc = prestamo.getFechaInicio().plusDays(15);
        prestamo.getCuotas().add(crearCuota(prestamo, 1, venc, totalObjetivo));
    }

    /**
     * ACUERDO 2 (PAGO_EN_MES) VARIABLE: 2 a 10 quincenas
     * - Cada cuota = (montoPrestado / N) + (montoPrestado * interesBase)
     * - La última absorbe el residuo del (montoPrestado / N)
     */
    private void aplicarAcuerdo2Variable(PrestamoEntity prestamo, Integer cantidadQuincenas) {

        if (cantidadQuincenas == null || cantidadQuincenas < 2 || cantidadQuincenas > 10) {
            throw new IllegalArgumentException("En PAGO_EN_MES, cantidadQuincenas debe ser entre 2 y 10");
        }

        long montoPrestado = prestamo.getMontoPrestado();

        // interés por quincena (por defecto 20% del préstamo)
        long interesPorQuincena = BigDecimal.valueOf(montoPrestado)
                .multiply(prestamo.getInteresBase()) // ej: 0.2000
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();

        // principal por quincena
        long base = montoPrestado / cantidadQuincenas;
        long residuo = montoPrestado - (base * cantidadQuincenas);

        // total = principal + (interés por quincena * N)
        long totalObjetivo = montoPrestado + (interesPorQuincena * cantidadQuincenas);
        prestamo.setTotalObjetivo(totalObjetivo);

        LocalDate venc = prestamo.getFechaInicio().plusDays(15);

        for (int i = 1; i <= cantidadQuincenas; i++) {
            long principal = base;
            if (i == cantidadQuincenas) principal = base + residuo;

            long montoCuota = principal + interesPorQuincena;

            prestamo.getCuotas().add(crearCuota(prestamo, i, venc, montoCuota));
            venc = venc.plusDays(15);
        }
    }

    // Acuerdo 3: total = monto*2, se paga con monto fijo por quincena, último absorbe residuo
    private void aplicarAcuerdo3(PrestamoEntity prestamo, Long montoPorQuincena) {
        if (montoPorQuincena == null || montoPorQuincena <= 0) {
            throw new IllegalArgumentException("En QUINCENAS_DOBLES, montoPorQuincena es obligatorio y > 0");
        }

        long totalObjetivo = prestamo.getMontoPrestado() * 2;
        prestamo.setTotalObjetivo(totalObjetivo);

        long restante = totalObjetivo;
        int numero = 1;
        LocalDate venc = prestamo.getFechaInicio().plusDays(15);

        while (restante > 0) {
            long montoCuota = Math.min(montoPorQuincena, restante);
            prestamo.getCuotas().add(crearCuota(prestamo, numero, venc, montoCuota));

            restante -= montoCuota;
            numero++;
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
        resp.setClienteNombre(p.getCliente().getNombre());
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
