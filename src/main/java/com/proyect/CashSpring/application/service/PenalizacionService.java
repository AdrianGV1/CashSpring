package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
public class PenalizacionService {

    // CONSTANTES DE PENALIZACIÓN
    public static final long PENALIZACION_DIARIA = 5000L; // ₡5,000 por día
    public static final int DIAS_GRACIA = 1; // 1 día de gracia después del vencimiento

    private final PrestamoJpaRepository prestamoRepo;

    public PenalizacionService(PrestamoJpaRepository prestamoRepo) {
        this.prestamoRepo = prestamoRepo;
    }

    /**
     * Calcula la penalización acumulada de un préstamo basado en sus cuotas vencidas.
     * La penalización es GLOBAL del préstamo, no individual por cuota.
     * 
     * Lógica con control de PAUSAR/NEGOCIAR:
     * 1. Si está NEGOCIADA → retorna el monto negociado (fijo)
     * 2. Si está PAUSADA → retorna la penalización acumulada actual (congelada)
     * 3. Si el préstamo está PAGADO/LIQUIDADO → retorna 0
     * 4. Si no hay cuotas pendientes → retorna 0
     * 5. Sino → calcula normalmente (días × 5000)
     * 
     * @param prestamo El préstamo a calcular
     * @param fechaReferencia Fecha de referencia para calcular días de atraso (null = hoy)
     */
    public long calcularPenalizacion(PrestamoEntity prestamo, LocalDate fechaReferencia) {
        // 1. Si está NEGOCIADA → retornar monto negociado (fijo)
        if (Boolean.TRUE.equals(prestamo.getPenalizacionNegociada()) && prestamo.getMontoNegociado() != null) {
            return prestamo.getMontoNegociado();
        }

        // 2. Si está PAUSADA → retornar penalización actual (congelada, no aumenta)
        if (Boolean.TRUE.equals(prestamo.getPenalizacionPausada())) {
            return prestamo.getPenalizacionAcumulada() != null ? prestamo.getPenalizacionAcumulada() : 0L;
        }

        // 3. Si el préstamo ya está PAGADO o LIQUIDADO, no hay penalización
        if (prestamo.getEstado() == EstadoPrestamo.PAGADO || 
            prestamo.getEstado() == EstadoPrestamo.LIQUIDADO) {
            return 0L;
        }

        // 4. Buscar la primera cuota PENDIENTE más antigua
        Optional<CuotaEntity> primeraCuotaPendiente = prestamo.getCuotas().stream()
                .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                .min((c1, c2) -> c1.getFechaVencimiento().compareTo(c2.getFechaVencimiento()));

        if (primeraCuotaPendiente.isEmpty()) {
            // No hay cuotas pendientes, no hay penalización
            return 0L;
        }

        // 5. Calcular penalización normal
        LocalDate fechaVencimiento = primeraCuotaPendiente.get().getFechaVencimiento();
        LocalDate fechaCalculo = (fechaReferencia != null) ? fechaReferencia : LocalDate.now();

        // Calcular días desde el vencimiento
        long diasDesdeVencimiento = ChronoUnit.DAYS.between(fechaVencimiento, fechaCalculo);

        // Si aún no ha vencido o está en el día de vencimiento, no hay penalización
        if (diasDesdeVencimiento <= 0) {
            return 0L;
        }

        // Restar el día de gracia
        long diasRetraso = diasDesdeVencimiento - DIAS_GRACIA;

        // Si aún está en período de gracia, no hay penalización
        if (diasRetraso <= 0) {
            return 0L;
        }

        // Calcular penalización: diasRetraso × 5000
        return diasRetraso * PENALIZACION_DIARIA;
    }

    /**
     * Sobrecarga para compatibilidad: usa fecha actual como referencia
     */
    public long calcularPenalizacion(PrestamoEntity prestamo) {
        return calcularPenalizacion(prestamo, null);
    }

    /**
     * Actualiza el estado del préstamo basado en si tiene cuotas vencidas y penalizaciones.
     * 
     * Lógica:
     * - Si tiene cuotas PENDIENTES vencidas (incluso en día de gracia) → ATRASADO
     * - Si todas las cuotas están CUBIERTA Y penalización es 0 → PAGADO
     * - Si cuotas están cubiertas pero hay penalización pendiente → ATRASADO
     * - Si no tiene cuotas pendientes vencidas → ACTIVO
     */
    public void actualizarEstadoPrestamo(PrestamoEntity prestamo) {
        // Si ya está LIQUIDADO, no cambiar
        if (prestamo.getEstado() == EstadoPrestamo.LIQUIDADO) {
            return;
        }

        // Verificar si todas las cuotas están cubiertas
        boolean todasCubiertas = !prestamo.getCuotas().isEmpty() &&
                prestamo.getCuotas().stream().allMatch(c -> c.getEstado() == EstadoCuota.CUBIERTA);

        // Verificar si la penalización está saldada
        boolean sinPenalizacion = prestamo.getPenalizacionAcumulada() == 0;

        // Solo marcar como PAGADO si TANTO las cuotas están cubiertas COMO la penalización está en 0
        if (todasCubiertas && sinPenalizacion) {
            prestamo.setEstado(EstadoPrestamo.PAGADO);
            return;
        }

        // Si las cuotas están cubiertas pero hay penalización pendiente, debe estar ATRASADO
        if (todasCubiertas && !sinPenalizacion) {
            prestamo.setEstado(EstadoPrestamo.ATRASADO);
            return;
        }

        // Buscar si hay cuotas PENDIENTES vencidas (considerando día de gracia)
        LocalDate hoy = LocalDate.now();
        boolean tieneCuotasVencidas = prestamo.getCuotas().stream()
                .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                .anyMatch(c -> {
                    // Una cuota está "vencida" si pasó su fecha de vencimiento
                    // El día de gracia ya marca como ATRASADO (pero sin cobrar aún)
                    long diasDesdeVencimiento = ChronoUnit.DAYS.between(c.getFechaVencimiento(), hoy);
                    return diasDesdeVencimiento > 0; // Más de 0 días = ya pasó el vencimiento
                });

        if (tieneCuotasVencidas) {
            prestamo.setEstado(EstadoPrestamo.ATRASADO);
        } else {
            prestamo.setEstado(EstadoPrestamo.ACTIVO);
        }
    }

    /**
     * Actualiza la penalización y estado de un préstamo específico
     */
    @Transactional
    public void actualizarPenalizacionPrestamo(Long prestamoId) {
        PrestamoEntity prestamo = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + prestamoId));

        // Solo actualizar si hay cuotas PENDIENTES que puedan generar nueva penalización
        boolean tieneCuotasPendientes = prestamo.getCuotas().stream()
                .anyMatch(c -> c.getEstado() == EstadoCuota.PENDIENTE);
        
        if (tieneCuotasPendientes) {
            long penalizacion = calcularPenalizacion(prestamo);
            prestamo.setPenalizacionAcumulada(penalizacion);
        }
        // Siempre actualizar el estado
        actualizarEstadoPrestamo(prestamo);
        
        prestamoRepo.save(prestamo);
    }

    /**
     * Job programado que se ejecuta todos los días a las 00:30 AM
     * Actualiza las penalizaciones de todos los préstamos ACTIVOS y ATRASADOS
     */
    @Scheduled(cron = "0 30 00 * * *", zone = "America/Costa_Rica") // Ejecutar a las 00:30 AM hora Costa Rica
    @Transactional
    public void actualizarPenalizacionesDiarias() {
        List<PrestamoEntity> prestamosActivos = prestamoRepo.findAll().stream()
                .filter(p -> p.getEstado() == EstadoPrestamo.ACTIVO || 
                            p.getEstado() == EstadoPrestamo.ATRASADO)
                .toList();

        for (PrestamoEntity prestamo : prestamosActivos) {
            // Solo actualizar si hay cuotas PENDIENTES que puedan generar nueva penalización
            // Si no hay cuotas PENDIENTES, mantener el valor de BD (penalización "congelada" sin pagar)
            boolean tieneCuotasPendientes = prestamo.getCuotas().stream()
                    .anyMatch(c -> c.getEstado() == EstadoCuota.PENDIENTE);
            
            if (tieneCuotasPendientes) {
                long penalizacion = calcularPenalizacion(prestamo);
                prestamo.setPenalizacionAcumulada(penalizacion);
            }
            // Siempre actualizar el estado
            actualizarEstadoPrestamo(prestamo);
        }

        prestamoRepo.saveAll(prestamosActivos);
        
        System.out.println("✅ Penalizaciones actualizadas: " + prestamosActivos.size() + " préstamos procesados");
    }

    /**
     * Método helper para obtener información de penalización de un préstamo
     */
    public String obtenerInformacionPenalizacion(PrestamoEntity prestamo) {
        long penalizacion = calcularPenalizacion(prestamo);
        
        if (penalizacion == 0) {
            return "Sin penalización";
        }

        Optional<CuotaEntity> primeraCuotaPendiente = prestamo.getCuotas().stream()
                .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                .min((c1, c2) -> c1.getFechaVencimiento().compareTo(c2.getFechaVencimiento()));

        if (primeraCuotaPendiente.isPresent()) {
            long diasDesdeVencimiento = ChronoUnit.DAYS.between(
                primeraCuotaPendiente.get().getFechaVencimiento(), 
                LocalDate.now()
            );
            long diasRetraso = diasDesdeVencimiento - DIAS_GRACIA;
            
            if (diasRetraso > 0) {
                return String.format("₡%,d (%d días × ₡%,d)", 
                    penalizacion, diasRetraso, PENALIZACION_DIARIA);
            } else if (diasDesdeVencimiento == 1) {
                return "Día de gracia (sin penalización aún)";
            }
        }

        return "Sin penalización";
    }
}
