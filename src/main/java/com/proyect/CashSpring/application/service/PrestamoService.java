package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.domain.enums.TipoAcuerdo;
import com.proyect.CashSpring.domain.enums.EstadoAprobacionPago;
import com.proyect.CashSpring.infrastructure.persistence.entity.ClienteEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PagoEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.ClienteJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PagoJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoCreateRequest;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoResponse;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoUpdateRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final PagoJpaRepository pagoRepo;
    private final PenalizacionService penalizacionService;

    @PersistenceContext
    private EntityManager em;

    public PrestamoService(ClienteJpaRepository clienteRepo, PrestamoJpaRepository prestamoRepo,
                          PagoJpaRepository pagoRepo, PenalizacionService penalizacionService) {
        this.clienteRepo = clienteRepo;
        this.prestamoRepo = prestamoRepo;
        this.pagoRepo = pagoRepo;
        this.penalizacionService = penalizacionService;
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    @Transactional
    public PrestamoResponse liquidarPrestamo(Long prestamoId, LocalDate fechaLiquidacion) {
        PrestamoEntity prestamo = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + prestamoId));

        if (prestamo.getEstado() != EstadoPrestamo.ACTIVO && prestamo.getEstado() != EstadoPrestamo.ATRASADO) {
            throw new IllegalArgumentException(
                    "Solo se pueden liquidar préstamos en estado ACTIVO o ATRASADO. Estado actual: " + prestamo.getEstado());
        }

        // Monto base de liquidación = montoPrestado + 20% de interés
        long montoBase = calcularTotalMontoMasInteres(prestamo.getMontoPrestado(), prestamo.getInteresBase());

        // Penalización vigente (normal, pausada o negociada → siempre en penalizacionAcumulada)
        long penalizacion = prestamo.getPenalizacionAcumulada() != null ? prestamo.getPenalizacionAcumulada() : 0L;

        // Total a cobrar = liquidación + penalización
        long montoTotal = montoBase + penalizacion;

        LocalDate fecha = (fechaLiquidacion != null) ? fechaLiquidacion : LocalDate.now();

        // Nota descriptiva con desglose
        String notaBase = "Liquidación anticipada del préstamo (capital + 20% interés: ₡" + montoBase
                + (penalizacion > 0 ? " + penalización: ₡" + penalizacion : "") + ")";

        // ── ADMIN: liquidar directamente ──────────────────────────────────────────
        if (isAdmin()) {
            PagoEntity pagoLiquidacion = PagoEntity.builder()
                    .prestamo(prestamo)
                    .monto(montoTotal)
                    .fechaPago(fecha)
                    .notas(notaBase)
                    .estadoAprobacion(EstadoAprobacionPago.APROBADO)
                    .esLiquidacion(true)
                    .build();
            em.persist(pagoLiquidacion);

            // Marcar cuotas PENDIENTES como CUBIERTA
            for (CuotaEntity cuota : prestamo.getCuotas()) {
                if (cuota.getEstado() == EstadoCuota.PENDIENTE) {
                    cuota.setEstado(EstadoCuota.CUBIERTA);
                    cuota.setFechaCubierta(fecha);
                }
            }

            // Marcar el préstamo como LIQUIDADO y limpiar penalización y controles
            prestamo.setEstado(EstadoPrestamo.LIQUIDADO);
            prestamo.setPenalizacionAcumulada(0L);
            prestamo.setPenalizacionPausada(false);
            prestamo.setFechaPausaPenalizacion(null);
            prestamo.setPenalizacionNegociada(false);
            prestamo.setMontoNegociado(null);
            prestamo.setFechaNegociacion(null);

            em.flush();
            return toResponse(prestamo);
        }

        // ── SUPERVISOR: crear solicitud EN_ESPERA ─────────────────────────────────
        boolean yaTieneSolicitud = prestamo.getPagos().stream()
                .anyMatch(p -> Boolean.TRUE.equals(p.getEsLiquidacion())
                        && p.getEstadoAprobacion() == EstadoAprobacionPago.EN_ESPERA);
        if (yaTieneSolicitud) {
            throw new IllegalStateException(
                    "Ya existe una solicitud de liquidación pendiente de aprobación para este préstamo.");
        }

        PagoEntity solicitudLiquidacion = PagoEntity.builder()
                .prestamo(prestamo)
                .monto(montoTotal)
                .fechaPago(fecha)
                .notas("Solicitud: " + notaBase)
                .estadoAprobacion(EstadoAprobacionPago.EN_ESPERA)
                .esLiquidacion(true)
                .build();
        pagoRepo.save(solicitudLiquidacion);

        return toResponse(prestamo);
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

        // Verificar que no haya penalización pendiente
        if (prestamo.getPenalizacionAcumulada() != null && prestamo.getPenalizacionAcumulada() > 0) {
            throw new IllegalArgumentException(
                "No se puede extender el préstamo mientras tenga penalización pendiente. " +
                "Debe pagar la penalización de ₡" + prestamo.getPenalizacionAcumulada() + " antes de extender."
            );
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
        prestamo.setMontoExtendido(prestamo.getMontoExtendido() + montoExtendido);
        prestamo.setEsExtendido(true);
        prestamo.setNumeroExtensiones(prestamo.getNumeroExtensiones() + 1);

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

        // Recolectar abonos parciales de cuotas PENDIENTES antes de eliminarlas.
        // Estos abonos se redistribuirán en las nuevas cuotas (de atrás hacia adelante).
        long carryOver = 0L;
        if (montoPorCuota != null && montoPorCuota > 0) {
            carryOver = prestamo.getCuotas().stream()
                    .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE
                            && c.getMontoCancelado() != null
                            && c.getMontoCancelado() > 0)
                    .mapToLong(CuotaEntity::getMontoCancelado)
                    .sum();

            // Eliminar TODAS las cuotas PENDIENTES (con o sin abono parcial).
            // Los abonos parciales se recolocan en las nuevas cuotas mediante el carry-over.
            prestamo.getCuotas().removeIf(c -> c.getEstado() == EstadoCuota.PENDIENTE);
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
        // Las nuevas cuotas cubren el saldo no representado por las cuotas CUBIERTA que se
        // conservaron: montoAdicional = totalNuevo - sum(montoObjetivo de cuotas mantenidas).
        // Las cuotas PENDIENTE fueron eliminadas completamente; sus abonos parciales (carryOver)
        // se redistribuyen en las últimas cuotas nuevas de atrás hacia adelante.
        long montoAdicional;
        if (montoPorCuota != null && montoPorCuota > 0) {
            // "Kept" = cuotasActivas que sobrevivieron (solo CUBIERTAs, pues todas las PENDIENTE
            // fueron eliminadas) + far-end CUBIERTAs. Los abonos parciales ya se capturaron en
            // carryOver y se redistribuirán en las nuevas cuotas.
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
        List<CuotaEntity> nuevasCuotas = new ArrayList<>();

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
            nuevasCuotas.add(cuota);
            fechaVencimiento = fechaVencimiento.plusDays(15);
        }

        // ─── REDISTRIBUIR CARRY-OVER en las nuevas cuotas (de atrás hacia adelante) ─
        // Los abonos recolectados de cuotas PENDIENTES eliminadas se aplican a las últimas
        // cuotas nuevas primero. Si el carry-over cubre por completo una cuota, se marca
        // CUBIERTA; si es parcial, queda como abono en montoCancelado.
        if (carryOver > 0 && !nuevasCuotas.isEmpty()) {
            long restante = carryOver;
            for (int i = nuevasCuotas.size() - 1; i >= 0 && restante > 0; i--) {
                CuotaEntity nc = nuevasCuotas.get(i);
                long toApply = Math.min(restante, nc.getMontoObjetivo());
                nc.setMontoCancelado(toApply);
                if (toApply >= nc.getMontoObjetivo()) {
                    nc.setEstado(EstadoCuota.CUBIERTA);
                    nc.setFechaCubierta(LocalDate.now());
                }
                restante -= toApply;
            }
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

    @Transactional
    public PrestamoResponse obtenerPrestamo(Long id) {
        PrestamoEntity p = prestamoRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + id));
        
        // Actualizar penalización y estado en tiempo real SOLO si hay cuotas PENDIENTES
        // Si ya no hay cuotas PENDIENTES, mantener el valor de BD (puede haber penalización aún sin pagar)
        if (p.getEstado() == EstadoPrestamo.ACTIVO || p.getEstado() == EstadoPrestamo.ATRASADO) {
            boolean tieneCuotasPendientes = p.getCuotas().stream()
                    .anyMatch(c -> c.getEstado() == EstadoCuota.PENDIENTE);
            
            // IMPORTANTE: NO recalcular si está pausada o negociada
            // En esos casos, la penalización solo debe cambiar con pagos, no con el cálculo automático
            boolean tieneControlActivo = Boolean.TRUE.equals(p.getPenalizacionPausada()) || 
                                         Boolean.TRUE.equals(p.getPenalizacionNegociada());
            
            if (tieneCuotasPendientes && !tieneControlActivo) {
                // Solo actualizar si hay cuotas PENDIENTES que puedan generar nueva penalización
                long penalizacionCalculada = penalizacionService.calcularPenalizacion(p);
                // Solo actualizar si la penalización AUMENTÓ (evita sobrescribir pagos parciales)
                if (penalizacionCalculada > p.getPenalizacionAcumulada()) {
                    p.setPenalizacionAcumulada(penalizacionCalculada);
                }
            }
            // Siempre actualizar el estado (puede cambiar de ACTIVO a ATRASADO o viceversa)
            penalizacionService.actualizarEstadoPrestamo(p);
            prestamoRepo.save(p);
        }
        
        return toResponse(p);
    }

    @Transactional
    public List<PrestamoResponse> listarPrestamos() {
        List<PrestamoEntity> prestamos = prestamoRepo.findAll();
        
        // Actualizar penalización y estado de préstamos activos/atrasados en tiempo real
        List<PrestamoEntity> prestamosActualizados = new ArrayList<>();
        for (PrestamoEntity p : prestamos) {
            if (p.getEstado() == EstadoPrestamo.ACTIVO || p.getEstado() == EstadoPrestamo.ATRASADO) {
                boolean tieneCuotasPendientes = p.getCuotas().stream()
                        .anyMatch(c -> c.getEstado() == EstadoCuota.PENDIENTE);
                
                // IMPORTANTE: NO recalcular si está pausada o negociada
                // En esos casos, la penalización solo debe cambiar con pagos, no con el cálculo automático
                boolean tieneControlActivo = Boolean.TRUE.equals(p.getPenalizacionPausada()) || 
                                             Boolean.TRUE.equals(p.getPenalizacionNegociada());
                
                if (tieneCuotasPendientes && !tieneControlActivo) {
                    // Solo actualizar si hay cuotas PENDIENTES que puedan generar nueva penalización
                    long penalizacionCalculada = penalizacionService.calcularPenalizacion(p);
                    // Solo actualizar si la penalización AUMENTÓ (evita sobrescribir pagos parciales)
                    if (penalizacionCalculada > p.getPenalizacionAcumulada()) {
                        p.setPenalizacionAcumulada(penalizacionCalculada);
                    }
                }
                // Siempre actualizar el estado
                penalizacionService.actualizarEstadoPrestamo(p);
                prestamosActualizados.add(p);
            }
        }
        if (!prestamosActualizados.isEmpty()) {
            prestamoRepo.saveAll(prestamosActualizados);
        }
        
        return prestamos.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<PrestamoResponse> listarPrestamosPorCliente(Long clienteId) {
        // Obtener préstamos del cliente ordenados: ACTIVO primero, luego por fecha de creación descendente
        List<PrestamoEntity> prestamos = prestamoRepo.findByClienteIdOrderByEstadoAscCreatedAtDesc(clienteId);
        
        // Actualizar penalización y estado de préstamos activos/atrasados en tiempo real
        List<PrestamoEntity> prestamosActualizados = new ArrayList<>();
        for (PrestamoEntity p : prestamos) {
            if (p.getEstado() == EstadoPrestamo.ACTIVO || p.getEstado() == EstadoPrestamo.ATRASADO) {
                boolean tieneCuotasPendientes = p.getCuotas().stream()
                        .anyMatch(c -> c.getEstado() == EstadoCuota.PENDIENTE);
                
                // IMPORTANTE: NO recalcular si está pausada o negociada
                // En esos casos, la penalización solo debe cambiar con pagos, no con el cálculo automático
                boolean tieneControlActivo = Boolean.TRUE.equals(p.getPenalizacionPausada()) || 
                                             Boolean.TRUE.equals(p.getPenalizacionNegociada());
                
                if (tieneCuotasPendientes && !tieneControlActivo) {
                    // Solo actualizar si hay cuotas PENDIENTES que puedan generar nueva penalización
                    long penalizacionCalculada = penalizacionService.calcularPenalizacion(p);
                    // Solo actualizar si la penalización AUMENTÓ (evita sobrescribir pagos parciales)
                    if (penalizacionCalculada > p.getPenalizacionAcumulada()) {
                        p.setPenalizacionAcumulada(penalizacionCalculada);
                    }
                }
                // Siempre actualizar el estado
                penalizacionService.actualizarEstadoPrestamo(p);
                prestamosActualizados.add(p);
            }
        }
        if (!prestamosActualizados.isEmpty()) {
            prestamoRepo.saveAll(prestamosActualizados);
        }
        
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
        resp.setNumeroExtensiones(p.getNumeroExtensiones() != null ? p.getNumeroExtensiones() : 0);

        // montoLiquidacion siempre calculado dinámicamente
        long montoLiq = calcularTotalMontoMasInteres(p.getMontoPrestado(), p.getInteresBase());
        resp.setMontoLiquidacion(montoLiq);

        // Usar el valor almacenado en BD (refleja la penalización real que se debe)
        // NO recalcular porque calcularPenalizacion() solo considera cuotas PENDIENTES vencidas,
        // y si ya se cubrieron todas las cuotas pero queda penalización por pagar, devolvería 0 incorrectamente
        resp.setPenalizacionAcumulada(p.getPenalizacionAcumulada());

        // Campos de control de penalización
        resp.setPenalizacionPausada(p.getPenalizacionPausada());
        resp.setFechaPausaPenalizacion(p.getFechaPausaPenalizacion());
        resp.setPenalizacionNegociada(p.getPenalizacionNegociada());
        resp.setMontoNegociado(p.getMontoNegociado());
        resp.setFechaNegociacion(p.getFechaNegociacion());

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

    // ============================================
    // MÉTODOS DE CONTROL DE PENALIZACIÓN
    // ============================================

    @Transactional
    public PrestamoResponse pausarPenalizacion(Long prestamoId) {
        PrestamoEntity p = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado"));

        if (Boolean.TRUE.equals(p.getPenalizacionPausada())) {
            throw new IllegalStateException("La penalización ya está pausada");
        }

        p.setPenalizacionPausada(true);
        p.setFechaPausaPenalizacion(LocalDate.now());
        prestamoRepo.save(p);

        return toResponse(p);
    }

    @Transactional
    public PrestamoResponse reanudarPenalizacion(Long prestamoId) {
        PrestamoEntity p = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado"));

        if (!Boolean.TRUE.equals(p.getPenalizacionPausada())) {
            throw new IllegalStateException("La penalización no está pausada");
        }

        p.setPenalizacionPausada(false);
        p.setFechaPausaPenalizacion(null);

        // Recalcular penalización actualizada
        Long penalizacionActual = penalizacionService.calcularPenalizacion(p);
        p.setPenalizacionAcumulada(penalizacionActual);

        prestamoRepo.save(p);

        return toResponse(p);
    }

    @Transactional
    public PrestamoResponse negociarPenalizacion(Long prestamoId, Long montoNegociado) {
        PrestamoEntity p = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado"));

        if (montoNegociado < 0) {
            throw new IllegalArgumentException("El monto negociado no puede ser negativo");
        }

        p.setPenalizacionNegociada(true);
        p.setMontoNegociado(montoNegociado);
        p.setFechaNegociacion(LocalDate.now());

        // La penalización pasa a ser el monto negociado
        p.setPenalizacionAcumulada(montoNegociado);

        prestamoRepo.save(p);

        return toResponse(p);
    }

    @Transactional
    public PrestamoResponse resetearPenalizacion(Long prestamoId) {
        PrestamoEntity p = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado"));

        // Limpiar todos los controles
        p.setPenalizacionPausada(false);
        p.setFechaPausaPenalizacion(null);
        p.setPenalizacionNegociada(false);
        p.setMontoNegociado(null);
        p.setFechaNegociacion(null);

        // Recalcular penalización normal
        Long penalizacionActual = penalizacionService.calcularPenalizacion(p);
        p.setPenalizacionAcumulada(penalizacionActual);

        prestamoRepo.save(p);

        return toResponse(p);
    }
}