package com.proyect.CashSpring.infrastructure.persistence.entity;

import com.proyect.CashSpring.domain.enums.EstadoCuota;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
        name = "cuotas",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_cuota_prestamo_numero", columnNames = {"prestamo_id", "numero_cuota"})
        },
        indexes = {
                @Index(name = "idx_cuotas_prestamo_fecha", columnList = "prestamo_id, fecha_vencimiento")
        }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CuotaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Relación con préstamo ---
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name="prestamo_id", nullable = false)
    private PrestamoEntity prestamo;

    @Column(name="numero_cuota", nullable = false)
    private Integer numeroCuota;

    @Column(name="fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Column(name="monto_objetivo", nullable = false)
    private Long montoObjetivo; // CRC

    @Enumerated(EnumType.STRING)
    @Column(name="estado", nullable = false, length = 15)
    private EstadoCuota estado = EstadoCuota.PENDIENTE;

    @Column(name="fecha_cubierta")
    private LocalDate fechaCubierta;

    @CreationTimestamp
    @Column(name="created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name="updated_at", nullable = false)
    private Instant updatedAt;
}
