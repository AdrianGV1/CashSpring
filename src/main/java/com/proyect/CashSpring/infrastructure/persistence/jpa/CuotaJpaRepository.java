package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CuotaJpaRepository extends JpaRepository<CuotaEntity, Long> {

    List<CuotaEntity> findByPrestamoIdOrderByNumeroCuotaAsc(Long prestamoId);

    List<CuotaEntity> findByPrestamoIdAndEstadoOrderByNumeroCuotaAsc(Long prestamoId, EstadoCuota estado);

    List<CuotaEntity> findByEstadoAndFechaVencimientoBefore(EstadoCuota estado, LocalDate fecha);

    @Query("SELECT COUNT(c) FROM CuotaEntity c WHERE c.estado = :estado")
    long countByEstado(@Param("estado") EstadoCuota estado);

    @Query("""
        SELECT COUNT(c)
        FROM CuotaEntity c
        WHERE c.estado = :estado
          AND c.fechaVencimiento < :hoy
    """)
    long countVencidas(@Param("estado") EstadoCuota estado, @Param("hoy") LocalDate hoy);

    @Query("""
        SELECT COALESCE(SUM(c.montoObjetivo - c.montoCancelado), 0)
        FROM CuotaEntity c
        WHERE c.estado = :estado
    """)
    long sumPorCobrar(@Param("estado") EstadoCuota estado);

    default long countPendientes() {
        return countByEstado(EstadoCuota.PENDIENTE);
    }

    default long countVencidasHoy() {
        return countVencidas(EstadoCuota.PENDIENTE, LocalDate.now());
    }

    default long sumTotalPorCobrar() {
        return sumPorCobrar(EstadoCuota.PENDIENTE);
    }
}