package com.proyect.CashSpring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "clientes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_clientes_cedula", columnNames = {"cedula"})
        }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ClienteEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name="telefono", nullable = false, length = 30)
    private String telefono;

    @Column(name="cedula", length = 50)
    private String cedula;

    @Column(name="ubicacion", length = 500)
    private String ubicacion;

    @Column(name="ubicacion_extra", length = 500)
    private String ubicacionExtra;

    @Column(name="notas", columnDefinition = "text")
    private String notas;

    @Builder.Default
    @Column(name="activo", nullable = false)
    private boolean activo = true;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PrestamoEntity> prestamos = new ArrayList<>();

    @CreationTimestamp
    @Column(name="created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name="updated_at", nullable = false)
    private Instant updatedAt;
}