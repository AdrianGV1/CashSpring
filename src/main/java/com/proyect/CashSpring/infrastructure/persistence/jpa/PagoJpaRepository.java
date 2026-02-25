package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.infrastructure.persistence.entity.PagoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PagoJpaRepository extends JpaRepository<PagoEntity, Long> {

    List<PagoEntity> findByPrestamoIdOrderByFechaPagoAsc(Long prestamoId);

    @Query("SELECT COALESCE(SUM(p.monto), 0) FROM PagoEntity p WHERE p.estadoAprobacion = 'APROBADO'")
    long sumTotalRecaudado();
}