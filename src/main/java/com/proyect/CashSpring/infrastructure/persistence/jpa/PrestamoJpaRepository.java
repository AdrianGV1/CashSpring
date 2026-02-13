package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrestamoJpaRepository extends JpaRepository<PrestamoEntity, Long> {
}
