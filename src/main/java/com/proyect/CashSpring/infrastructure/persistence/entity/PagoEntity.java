package com.proyect.CashSpring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "pagos")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PagoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name="prestamo_id", nullable = false)
    private PrestamoEntity prestamo;

    @Column(name="fecha_pago", nullable = false)
    private LocalDate fechaPago;

    @Column(name="monto", nullable = false)
    private Long monto;

    @Column(name="notas", columnDefinition = "TEXT")
    private String notas;

    @CreationTimestamp
    @Column(name="created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name="updated_at", nullable = false)
    private Instant updatedAt;
}