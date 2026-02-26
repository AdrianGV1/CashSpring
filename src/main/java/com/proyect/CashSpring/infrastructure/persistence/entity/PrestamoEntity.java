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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name="cliente_id", nullable = false)
    private ClienteEntity cliente;

    @Column(name="monto_prestado", nullable = false)
    private Long montoPrestado;

    @Builder.Default
    @Column(name="interes_base", nullable = false, precision = 5, scale = 4)
    private BigDecimal interesBase = new BigDecimal("0.2000");

    @Enumerated(EnumType.STRING)
    @Column(name="tipo_acuerdo", nullable = false, length = 40)
    private TipoAcuerdo tipoAcuerdo;

    @Column(name="fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name="total_objetivo", nullable = false)
    private Long totalObjetivo;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name="estado", nullable = false, length = 20)
    private EstadoPrestamo estado = EstadoPrestamo.ACTIVO;

    @OneToMany(mappedBy = "prestamo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("numeroCuota ASC")
    @Builder.Default
    private List<CuotaEntity> cuotas = new ArrayList<>();

    @OneToMany(mappedBy = "prestamo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("fechaPago ASC")
    @Builder.Default
    private List<PagoEntity> pagos = new ArrayList<>();

    @Builder.Default
    @Column(name = "monto_extendido", nullable = false)
    private Long montoExtendido = 0L;

    @Builder.Default
    @Column(name = "es_extendido", nullable = false)
    private Boolean esExtendido = false;

    @Builder.Default
    @Column(name = "numero_extensiones", nullable = false)
    private Integer numeroExtensiones = 0;

    @Builder.Default
    @Column(name = "penalizacion_acumulada", nullable = false)
    private Long penalizacionAcumulada = 0L;

    // Control de penalización: PAUSAR
    @Builder.Default
    @Column(name = "penalizacion_pausada", nullable = true)
    private Boolean penalizacionPausada = false;

    @Column(name = "fecha_pausa_penalizacion")
    private LocalDate fechaPausaPenalizacion;

    // Control de penalización: NEGOCIAR
    @Builder.Default
    @Column(name = "penalizacion_negociada", nullable = true)
    private Boolean penalizacionNegociada = false;

    @Column(name = "monto_negociado")
    private Long montoNegociado;

    @Column(name = "fecha_negociacion")
    private LocalDate fechaNegociacion;

    @CreationTimestamp
    @Column(name="created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name="updated_at", nullable = false)
    private Instant updatedAt;
}