package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.infrastructure.persistence.entity.ClienteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ClienteJpaRepository extends JpaRepository<ClienteEntity, Long> {

    Optional<ClienteEntity> findByCedula(String cedula);
    Optional<ClienteEntity> findByTelefono(String telefono);

    @Query("SELECT COUNT(c) FROM ClienteEntity c WHERE c.activo = true")
    long countActivos();
}