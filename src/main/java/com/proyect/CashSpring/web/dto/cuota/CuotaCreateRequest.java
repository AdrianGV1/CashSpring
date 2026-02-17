package com.proyect.CashSpring.web.dto.cuota;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public class CuotaCreateRequest {

    @NotNull
    private Long prestamoId;

    @NotNull
    @Positive
    private Integer numeroCuota;

    @NotNull
    private LocalDate fechaVencimiento;

    @NotNull
    @Positive
    private Long montoObjetivo; // CRC

    public Long getPrestamoId() { return prestamoId; }
    public void setPrestamoId(Long prestamoId) { this.prestamoId = prestamoId; }

    public Integer getNumeroCuota() { return numeroCuota; }
    public void setNumeroCuota(Integer numeroCuota) { this.numeroCuota = numeroCuota; }

    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }

    public Long getMontoObjetivo() { return montoObjetivo; }
    public void setMontoObjetivo(Long montoObjetivo) { this.montoObjetivo = montoObjetivo; }
}
