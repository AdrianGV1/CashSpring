package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.infrastructure.persistence.entity.ClienteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClienteJpaRepository extends JpaRepository<ClienteEntity, Long> {
}
