package com.proyect.CashSpring.infrastructure.persistence.jpa;

import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PrestamoJpaRepository extends JpaRepository<PrestamoEntity, Long> {

    boolean existsByClienteIdAndEstado(Long clienteId, EstadoPrestamo estado);

    List<PrestamoEntity> findByClienteIdOrderByEstadoAscCreatedAtDesc(Long clienteId);

    @Query("SELECT COUNT(p) FROM PrestamoEntity p WHERE p.estado = :estado")
    long countByEstado(@Param("estado") EstadoPrestamo estado);

    default long countActivos() {
        return countByEstado(EstadoPrestamo.ACTIVO);
    }
}