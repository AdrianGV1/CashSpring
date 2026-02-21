package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.infrastructure.persistence.entity.ClienteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ClienteJpaRepository extends JpaRepository<ClienteEntity, Long> {
    Optional<ClienteEntity> findByCedula(String cedula);
    Optional<ClienteEntity> findByTelefono(String telefono);
}
