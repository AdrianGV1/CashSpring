package com.proyect.CashSpring.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
        name = "pagos",
        indexes = {
                @Index(name = "idx_pagos_prestamo_fecha", columnList = "prestamo_id, fecha_pago")
        }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PagoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Relación con préstamo ---
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name="prestamo_id", nullable = false)
    private PrestamoEntity prestamo;

    @Column(name="fecha_pago", nullable = false)
    private LocalDate fechaPago;

    @Column(name="monto", nullable = false)
    private Long monto; // CRC

    @Column(name="notas", columnDefinition = "text")
    private String notas;

    @CreationTimestamp
    @Column(name="created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
