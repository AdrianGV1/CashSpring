package com.proyect.CashSpring.web.dto.cuota;

import com.proyect.CashSpring.domain.enums.EstadoCuota;

import java.time.LocalDate;

public class CuotaUpdateRequest {

    // Todos opcionales (si viene null, no se cambia)
    private LocalDate fechaVencimiento;
    private Long montoObjetivo;

    private EstadoCuota estado;
    private LocalDate fechaCubierta;

    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }

    public Long getMontoObjetivo() { return montoObjetivo; }
    public void setMontoObjetivo(Long montoObjetivo) { this.montoObjetivo = montoObjetivo; }

    public EstadoCuota getEstado() { return estado; }
    public void setEstado(EstadoCuota estado) { this.estado = estado; }

    public LocalDate getFechaCubierta() { return fechaCubierta; }
    public void setFechaCubierta(LocalDate fechaCubierta) { this.fechaCubierta = fechaCubierta; }
}
