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

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
public class PagoService {

    private final PagoJpaRepository pagoRepo;
    private final PrestamoJpaRepository prestamoRepo;
    private final PenalizacionService penalizacionService;
    
    @PersistenceContext
    private EntityManager entityManager;

    public PagoService(PagoJpaRepository pagoRepo, PrestamoJpaRepository prestamoRepo, 
                      PenalizacionService penalizacionService) {
        this.pagoRepo = pagoRepo;
        this.prestamoRepo = prestamoRepo;
        this.penalizacionService = penalizacionService;
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

    @Transactional
    public void revertirPago(Long pagoId) {
        // 0. Validar que el pago existe y está APROBADO
        PagoEntity pago = pagoRepo.findById(pagoId)
                .orElseThrow(() -> new IllegalArgumentException("Pago no encontrado: " + pagoId));

        if (pago.getEstadoAprobacion() != EstadoAprobacionPago.APROBADO) {
            throw new IllegalArgumentException("Solo se pueden revertir pagos aprobados. Use rechazar para pagos en espera.");
        }

        PrestamoEntity prestamo = pago.getPrestamo();

        // 1. Obtener todos los pagos APROBADOS del préstamo, EXCEPTO el que vamos a revertir
        List<PagoEntity> pagosRestantes = pagoRepo.findByPrestamoIdOrderByFechaPagoAsc(prestamo.getId())
                .stream()
                .filter(p -> p.getEstadoAprobacion() == EstadoAprobacionPago.APROBADO)
                .filter(p -> !p.getId().equals(pagoId))
                .sorted(Comparator.comparing(PagoEntity::getFechaPago))
                .collect(java.util.stream.Collectors.toList());

        // 2. Resetear TODAS las cuotas del préstamo a estado inicial
        for (CuotaEntity cuota : prestamo.getCuotas()) {
            cuota.setMontoCancelado(0L);
            cuota.setEstado(EstadoCuota.PENDIENTE);
            cuota.setFechaCubierta(null);
        }

        // 3. Resetear estado y penalización del préstamo
        prestamo.setEstado(EstadoPrestamo.ACTIVO);
        prestamo.setPenalizacionAcumulada(0L);

        // 4. Eliminar el pago que queremos revertir
        pagoRepo.delete(pago);
        
        // 5. Forzar escritura a BD y limpiar caché de Hibernate
        entityManager.flush();
        entityManager.clear();

        // 6. Recargar préstamo fresh desde BD (sin caché)
        PrestamoEntity prestamoFresh = prestamoRepo.findById(prestamo.getId())
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado"));

        // 7. Volver a aplicar todos los pagos restantes en orden cronológico
        for (PagoEntity pagoRestante : pagosRestantes) {
            procesarCuotasConPago(prestamoFresh, pagoRestante.getMonto(), pagoRestante.getFechaPago());
        }

        // 8. Guardar el estado final y forzar a BD
        prestamoRepo.save(prestamoFresh);
        entityManager.flush();
    }

    /**
     * Procesa un pago aplicándolo con el siguiente orden de prioridad:
     * 
     * ORDEN DE APLICACIÓN DE PAGOS:
     * 0. Se actualiza la penalización si aumentó (pasaron más días)
     * 1. TODAS las cuotas ATRASADAS (ordenadas cronológicamente de más antigua a más reciente)
     * 2. PENALIZACIÓN completa (solo después de pagar todas las atrasadas)
     * 3. Cuotas PENDIENTES no vencidas (si aún sobra dinero)
     * 4. Se actualiza el estado del préstamo
     * 
     * NOTA: Se usa fechaPago para determinar qué cuotas están atrasadas,
     * lo cual es crítico al revertir pagos para mantener consistencia histórica.
     */
    private void procesarCuotasConPago(PrestamoEntity prestamo, Long montoPago, LocalDate fechaPago) {
        // ========== PASO 0: ACTUALIZAR PENALIZACIÓN SI AUMENTÓ ==========
        // IMPORTANTE: Solo recalcular si hay cuotas PENDIENTES que puedan generar nueva penalización
        // Si la penalización AUMENTÓ (pasaron más días), actualizarla
        // Si ya se pagó parte de la penalización, NO sobrescribir
        boolean tieneCuotasPendientes = prestamo.getCuotas().stream()
                .anyMatch(c -> c.getEstado() == EstadoCuota.PENDIENTE);
        
        if (tieneCuotasPendientes) {
            // Usar la fecha del pago para calcular la penalización correctamente
            // (importante al revertir pagos para mantener consistencia histórica)
            long penalizacionCalculada = penalizacionService.calcularPenalizacion(prestamo, fechaPago);
            
            // Solo actualizar si la nueva penalización es MAYOR a la actual
            // Esto permite que:
            // 1. La penalización aumente si pasaron más días
            // 2. La penalización NO se sobrescriba si ya se pagó parte
            if (penalizacionCalculada > prestamo.getPenalizacionAcumulada()) {
                prestamo.setPenalizacionAcumulada(penalizacionCalculada);
            }
        }

        long restante = montoPago;

        // ========== PASO 1: SEPARAR CUOTAS ATRASADAS Y PENDIENTES ==========
        // IMPORTANTE: Usar fechaPago para determinar qué cuotas están atrasadas
        // (crítico al revertir pagos para mantener consistencia histórica)
        
        // Cuotas ATRASADAS (vencidas antes de la fecha del pago) ordenadas de más antigua a más reciente
        List<CuotaEntity> cuotasAtrasadas = prestamo.getCuotas().stream()
                .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                .filter(c -> c.getFechaVencimiento().isBefore(fechaPago))
                .sorted(Comparator.comparing(CuotaEntity::getFechaVencimiento))
                .collect(java.util.stream.Collectors.toList());
        
        // Cuotas PENDIENTES pero NO vencidas (con vencimiento >= fechaPago)
        List<CuotaEntity> cuotasPendientes = prestamo.getCuotas().stream()
                .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                .filter(c -> !c.getFechaVencimiento().isBefore(fechaPago))
                .sorted(Comparator.comparing(CuotaEntity::getFechaVencimiento))
                .collect(java.util.stream.Collectors.toList());
        
        // ========== PASO 2: PAGAR TODAS LAS CUOTAS ATRASADAS PRIMERO ==========
        for (CuotaEntity cuota : cuotasAtrasadas) {
            if (restante <= 0) break;
            
            long falta = cuota.getMontoObjetivo() - cuota.getMontoCancelado();
            
            if (restante >= falta) {
                // Cubre la cuota completamente
                cuota.setMontoCancelado(cuota.getMontoObjetivo());
                cuota.setEstado(EstadoCuota.CUBIERTA);
                cuota.setFechaCubierta(fechaPago);
                restante -= falta;
            } else {
                // Abono parcial a esta cuota
                cuota.setMontoCancelado(cuota.getMontoCancelado() + restante);
                restante = 0;
            }
        }
        
        // ========== PASO 3: PAGAR PENALIZACIÓN (solo después de TODAS las atrasadas) ==========
        if (restante > 0 && prestamo.getPenalizacionAcumulada() > 0) {
            long penalizacionActual = prestamo.getPenalizacionAcumulada();
            
            if (restante >= penalizacionActual) {
                // El pago cubre toda la penalización
                prestamo.setPenalizacionAcumulada(0L);
                restante -= penalizacionActual;
            } else {
                // El pago cubre parte de la penalización
                prestamo.setPenalizacionAcumulada(penalizacionActual - restante);
                restante = 0;
            }
        }
        
        // ========== PASO 4: PAGAR CUOTAS PENDIENTES (no vencidas) si aún sobra ==========
        for (CuotaEntity cuota : cuotasPendientes) {
            if (restante <= 0) break;
            
            long falta = cuota.getMontoObjetivo() - cuota.getMontoCancelado();
            
            if (restante >= falta) {
                // Cubre la cuota completamente
                cuota.setMontoCancelado(cuota.getMontoObjetivo());
                cuota.setEstado(EstadoCuota.CUBIERTA);
                cuota.setFechaCubierta(fechaPago);
                restante -= falta;
            } else {
                // Abono parcial a esta cuota
                cuota.setMontoCancelado(cuota.getMontoCancelado() + restante);
                restante = 0;
            }
        }

        // ========== PASO 5: ACTUALIZAR ESTADO DEL PRÉSTAMO ==========
        penalizacionService.actualizarEstadoPrestamo(prestamo);
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