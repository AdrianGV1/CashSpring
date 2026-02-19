package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrestamoJpaRepository extends JpaRepository<PrestamoEntity, Long> {
    boolean existsByClienteIdAndEstado(Long clienteId, EstadoPrestamo estado);
}
