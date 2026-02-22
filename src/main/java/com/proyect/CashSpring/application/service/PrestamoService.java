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
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class PrestamoService {

    private final ClienteJpaRepository clienteRepo;
    private final PrestamoJpaRepository prestamoRepo;

    @PersistenceContext
    private EntityManager em;

    public PrestamoService(ClienteJpaRepository clienteRepo, PrestamoJpaRepository prestamoRepo) {
        this.clienteRepo = clienteRepo;
        this.prestamoRepo = prestamoRepo;
    }

     @Transactional
    public PrestamoResponse extenderPrestamo(Long prestamoId, Long montoExtendido, Long montoPorCuota) {
        // Verificar si el préstamo existe
        PrestamoEntity prestamo = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + prestamoId));

        // Verificar si el préstamo es del tipo QUINCENAS_DOBLES
        if (prestamo.getTipoAcuerdo() != TipoAcuerdo.QUINCENAS_DOBLES) {
            throw new IllegalArgumentException("Solo los préstamos con acuerdo QUINCENAS_DOBLES pueden ser extendidos.");
        }

        // Verificar que el cliente haya pagado al menos el 50% de la deuda
        long montoPagado = prestamo.getPagos().stream().mapToLong(pago -> pago.getMonto()).sum();
        if (montoPagado < (prestamo.getTotalObjetivo() / 2)) {
            throw new IllegalArgumentException("Debe haber pagado al menos el 50% del préstamo para poder extenderlo.");
        }

        // Actualizar totales del préstamo
        long montoNuevo = prestamo.getMontoPrestado() + montoExtendido;
        long totalNuevo = montoNuevo * 2;
        prestamo.setMontoPrestado(montoNuevo);
        prestamo.setTotalObjetivo(totalNuevo);
        prestamo.setMontoExtendido(montoExtendido);
        prestamo.setEsExtendido(true);

        // Monto por cuota: si no se indicó, usar el monto de la primera cuota existente
        long mpc;
        if (montoPorCuota != null && montoPorCuota > 0) {
            mpc = montoPorCuota;
        } else {
            mpc = prestamo.getCuotas().stream()
                    .min(Comparator.comparing(CuotaEntity::getNumeroCuota))
                    .map(CuotaEntity::getMontoObjetivo)
                    .orElse(montoExtendido * 2);
        }

        // Si se especificó un nuevo monto por cuota, eliminar SOLO las cuotas PENDIENTES
        // que aún no tienen ningún pago parcial. Las cuotas con pago parcial (montoCancelado > 0)
        // son intocables: el cliente ya abonó algo sobre ellas y deben liquidarse por su monto original.
        if (montoPorCuota != null && montoPorCuota > 0) {
            prestamo.getCuotas().removeIf(c ->
                    c.getEstado() == EstadoCuota.PENDIENTE
                    && (c.getMontoCancelado() == null || c.getMontoCancelado() == 0));
            // Forzar flush para que los DELETE lleguen a BD ANTES de los INSERT de las nuevas
            // cuotas, evitando violar el unique constraint (prestamo_id, numero_cuota).
            em.flush();
        }

        // ─── IDENTIFICAR CUOTAS "LEJANAS CUBIERTAS" ────────────────────────────────
        // Son las cuotas CUBIERTA que tienen alguna cuota PENDIENTE/parcial ANTES que ellas
        // (es decir, fueron pagadas por exceso desde el final, no secuencialmente).
        List<CuotaEntity> todasOrdenadas = prestamo.getCuotas().stream()
                .sorted(Comparator.comparing(CuotaEntity::getNumeroCuota))
                .collect(java.util.stream.Collectors.toList());

        // Encontrar el límite del bloque CUBIERTA secuencial desde el inicio
        int limiteSecuencial = 0;
        for (CuotaEntity c : todasOrdenadas) {
            if (c.getEstado() == EstadoCuota.CUBIERTA) {
                limiteSecuencial = c.getNumeroCuota();
            } else {
                break; // primer PENDIENTE/parcial rompe la secuencia
            }
        }

        final int limiteSeq = limiteSecuencial;

        // Far-end CUBIERTAs: CUBIERTA con número > limiteSecuencial
        List<CuotaEntity> farEndCubiertas = todasOrdenadas.stream()
                .filter(c -> c.getEstado() == EstadoCuota.CUBIERTA && c.getNumeroCuota() > limiteSeq)
                .sorted(Comparator.comparing(CuotaEntity::getNumeroCuota))
                .collect(java.util.stream.Collectors.toList());

        // Cuotas "activas" (todo menos las far-end): define el bloque central de la tabla
        List<CuotaEntity> cuotasActivas = todasOrdenadas.stream()
                .filter(c -> !(c.getEstado() == EstadoCuota.CUBIERTA && c.getNumeroCuota() > limiteSeq))
                .collect(java.util.stream.Collectors.toList());

        int ultimoNumeroActivo = cuotasActivas.stream()
                .mapToInt(CuotaEntity::getNumeroCuota)
                .max()
                .orElse(0);

        LocalDate ultimaFechaActiva = cuotasActivas.stream()
                .max(Comparator.comparing(CuotaEntity::getNumeroCuota))
                .map(CuotaEntity::getFechaVencimiento)
                .orElse(prestamo.getFechaInicio());

        // ─── CREAR CUOTAS DE EXTENSIÓN después del bloque activo ───────────────────
        // Las nuevas cuotas deben cubrir exactamente el saldo no representado por cuotas existentes:
        //   montoAdicional = totalNuevo - sum(montoObjetivo de TODAS las cuotas que se conservan)
        // ¿Por qué NO usar (totalNuevo - montoPagado - montoParcialesObjetivo)?
        //   Porque montoPagado ya incluye los abonos parciales, y montoParcialesObjetivo los volvería
        //   a descontar, generando una doble resta y un saldo incorrecto.
        long montoAdicional;
        if (montoPorCuota != null && montoPorCuota > 0) {
            // "Kept" = cuotasActivas que sobrevivieron (CUBIERTA + PENDIENTE-parcial) + far-end CUBIERTAs
            long objetivoKept = java.util.stream.Stream
                    .concat(cuotasActivas.stream(), farEndCubiertas.stream())
                    .mapToLong(CuotaEntity::getMontoObjetivo)
                    .sum();
            montoAdicional = Math.max(0, totalNuevo - objetivoKept);
        } else {
            montoAdicional = montoExtendido * 2;
        }
        long numNuevas = (montoAdicional > 0) ? (montoAdicional + mpc - 1) / mpc : 0;

        // ANTES de crear las nuevas cuotas, asignar números temporales negativos a las
        // far-end para que no choquen con los números que vamos a crear (unique constraint).
        // Se hace flush() explícito para forzar a Hibernate a enviar los UPDATEs a la BD
        // ANTES de los INSERTs de las nuevas cuotas (Hibernate hace INSERT antes que UPDATE).
        if (!farEndCubiertas.isEmpty()) {
            int tmp = -1;
            for (CuotaEntity fe : farEndCubiertas) {
                fe.setNumeroCuota(tmp--);
            }
            em.flush(); // fuerza los UPDATE a BD antes de los INSERT de extensión
        }

        LocalDate fechaVencimiento = ultimaFechaActiva.plusDays(15);

        for (int i = 1; i <= numNuevas; i++) {
            long montoCuota = (i < numNuevas) ? mpc : (montoAdicional - mpc * (numNuevas - 1));
            CuotaEntity cuota = CuotaEntity.builder()
                    .prestamo(prestamo)
                    .numeroCuota(ultimoNumeroActivo + i)
                    .fechaVencimiento(fechaVencimiento)
                    .montoObjetivo(montoCuota)
                    .estado(EstadoCuota.PENDIENTE)
                    .esCuotaExtendida(true)
                    .build();
            prestamo.getCuotas().add(cuota);
            fechaVencimiento = fechaVencimiento.plusDays(15);
        }

        // ─── REPOSICIONAR las far-end CUBIERTAs al final con nuevas fechas ─────────
        // Ahora asignamos los números definitivos y las fechas al final de todo.
        // fechaVencimiento ya apunta al slot siguiente al último de extensión.
        if (!farEndCubiertas.isEmpty()) {
            int siguienteNumero = ultimoNumeroActivo + (int) numNuevas + 1;
            for (CuotaEntity fe : farEndCubiertas) {
                fe.setNumeroCuota(siguienteNumero++);
                fe.setFechaVencimiento(fechaVencimiento);
                fechaVencimiento = fechaVencimiento.plusDays(15);
            }
        }

        // Guardar los cambios
        PrestamoEntity guardado = prestamoRepo.save(prestamo);
        return toResponse(guardado);
    }

    @Transactional
    public PrestamoResponse crearPrestamo(PrestamoCreateRequest req) {
        ClienteEntity cliente;

        // Caso 1: Usar cliente existente
        if (req.getClienteId() != null) {
            cliente = clienteRepo.findById(req.getClienteId())
                    .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado con ID: " + req.getClienteId()));

            // Validar que el cliente NO tenga préstamos activos o atrasados
            boolean tienePrestamosActivos = cliente.getPrestamos().stream()
                    .anyMatch(prestamo -> 
                        prestamo.getEstado() == EstadoPrestamo.ACTIVO || 
                        prestamo.getEstado() == EstadoPrestamo.ATRASADO
                    );

            if (tienePrestamosActivos) {
                throw new IllegalArgumentException(
                    "El cliente ya tiene un préstamo activo o atrasado. " +
                    "Debe liquidar todos sus préstamos antes de solicitar uno nuevo."
                );
            }
        }
        // Caso 2: Crear nuevo cliente
        else {
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

            // Verificar que el teléfono no esté registrado
            if (clienteRepo.findByTelefono(req.getTelefono().trim()).isPresent()) {
                throw new IllegalArgumentException("Ya existe un cliente registrado con ese teléfono.");
            }

            // Crear el cliente nuevo
            cliente = ClienteEntity.builder()
                    .nombre(req.getNombre().trim())
                    .telefono(req.getTelefono().trim())
                    .cedula(req.getCedula().trim())
                    .ubicacion(req.getUbicacion().trim())
                    .notas(req.getNotas())
                    .activo(true)
                    .build();
            cliente = clienteRepo.save(cliente);
        }

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

    @Transactional(readOnly = true)
    public List<PrestamoResponse> listarPrestamosPorCliente(Long clienteId) {
        // Obtener préstamos del cliente ordenados: ACTIVO primero, luego por fecha de creación descendente
        List<PrestamoEntity> prestamos = prestamoRepo.findByClienteIdOrderByEstadoAscCreatedAtDesc(clienteId);
        
        // Ordenar manualmente: ACTIVO/ATRASADO primero, luego PAGADO
        return prestamos.stream()
                .sorted((p1, p2) -> {
                    // ACTIVO y ATRASADO van primero
                    boolean p1Activo = p1.getEstado() == EstadoPrestamo.ACTIVO || p1.getEstado() == EstadoPrestamo.ATRASADO;
                    boolean p2Activo = p2.getEstado() == EstadoPrestamo.ACTIVO || p2.getEstado() == EstadoPrestamo.ATRASADO;
                    
                    if (p1Activo && !p2Activo) return -1;
                    if (!p1Activo && p2Activo) return 1;
                    
                    // Si ambos son activos o ambos pagados, ordenar por fecha de creación descendente
                    return p2.getCreatedAt().compareTo(p1.getCreatedAt());
                })
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
        resp.setEsExtendido(p.getEsExtendido());
        resp.setMontoExtendido(p.getMontoExtendido());

        List<PrestamoResponse.CuotaItem> cuotas = new ArrayList<>();
        for (CuotaEntity c : p.getCuotas()) {
            PrestamoResponse.CuotaItem item = new PrestamoResponse.CuotaItem();
            item.setNumeroCuota(c.getNumeroCuota());
            item.setFechaVencimiento(c.getFechaVencimiento());
            item.setMontoObjetivo(c.getMontoObjetivo());
            item.setMontoCancelado(c.getMontoCancelado() != null ? c.getMontoCancelado() : 0L);
            item.setEsCuotaExtendida(c.getEsCuotaExtendida());
            cuotas.add(item);
        }
        resp.setCuotas(cuotas);

        return resp;
    }
}