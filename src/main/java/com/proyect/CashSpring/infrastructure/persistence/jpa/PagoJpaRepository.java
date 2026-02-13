package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.infrastructure.persistence.entity.PagoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PagoJpaRepository extends JpaRepository<PagoEntity, Long> {

    List<PagoEntity> findByPrestamoIdOrderByFechaPagoAsc(Long prestamoId);
}
