package com.proyect.CashSpring.infrastructure.persistence.entity;

import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.domain.enums.TipoAcuerdo;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prestamos")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PrestamoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Relación con cliente ---
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name="cliente_id", nullable = false)
    private ClienteEntity cliente;

    // --- Datos del préstamo ---
    @Column(name="monto_prestado", nullable = false)
    private Long montoPrestado; // CRC

    @Column(name="interes_base", nullable = false, precision = 5, scale = 4)
    private BigDecimal interesBase = new BigDecimal("0.2000");

    @Enumerated(EnumType.STRING)
    @Column(name="tipo_acuerdo", nullable = false, length = 40)
    private TipoAcuerdo tipoAcuerdo;

    @Column(name="fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    // Total a pagar SIN multas (según acuerdo)
    @Column(name="total_objetivo", nullable = false)
    private Long totalObjetivo; // CRC

    @Enumerated(EnumType.STRING)
    @Column(name="estado", nullable = false, length = 20)
    private EstadoPrestamo estado = EstadoPrestamo.ACTIVO;

    // --- Relaciones ---
    @OneToMany(mappedBy = "prestamo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("numeroCuota ASC")
    @Builder.Default
    private List<CuotaEntity> cuotas = new ArrayList<>();

    @OneToMany(mappedBy = "prestamo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("fechaPago ASC")
    @Builder.Default
    private List<PagoEntity> pagos = new ArrayList<>();

    @CreationTimestamp
    @Column(name="created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name="updated_at", nullable = false)
    private Instant updatedAt;
}
