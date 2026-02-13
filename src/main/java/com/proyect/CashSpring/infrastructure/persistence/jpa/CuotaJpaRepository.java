package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.infrastructure.persistence.entity.CuotaEntity;
import com.proyect.CashSpring.domain.enums.EstadoCuota;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CuotaJpaRepository extends JpaRepository<CuotaEntity, Long> {

    List<CuotaEntity> findByPrestamoIdOrderByNumeroCuotaAsc(Long prestamoId);

    List<CuotaEntity> findByPrestamoIdAndEstadoOrderByNumeroCuotaAsc(Long prestamoId, EstadoCuota estado);

    // Útil para encontrar cuotas vencidas (para atrasos)
    List<CuotaEntity> findByEstadoAndFechaVencimientoBefore(EstadoCuota estado, LocalDate fecha);
}
