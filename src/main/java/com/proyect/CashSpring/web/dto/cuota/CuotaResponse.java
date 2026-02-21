package com.proyect.CashSpring.web.dto.cuota;

import com.proyect.CashSpring.domain.enums.EstadoCuota;

import java.time.LocalDate;

public class CuotaResponse {

    private Long cuotaId;
    private Long prestamoId;
    private String clienteNombre;

    private Integer numeroCuota;
    private LocalDate fechaVencimiento;
    private Long montoObjetivo; // CRC

    private EstadoCuota estado;
    private LocalDate fechaCubierta;
    private Boolean esCuotaExtendida;
    private Long montoCancelado;

    public Long getCuotaId() { return cuotaId; }
    public void setCuotaId(Long cuotaId) { this.cuotaId = cuotaId; }

    public Long getPrestamoId() { return prestamoId; }
    public void setPrestamoId(Long prestamoId) { this.prestamoId = prestamoId; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public Integer getNumeroCuota() { return numeroCuota; }
    public void setNumeroCuota(Integer numeroCuota) { this.numeroCuota = numeroCuota; }

    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }

    public Long getMontoObjetivo() { return montoObjetivo; }
    public void setMontoObjetivo(Long montoObjetivo) { this.montoObjetivo = montoObjetivo; }

    public EstadoCuota getEstado() { return estado; }
    public void setEstado(EstadoCuota estado) { this.estado = estado; }

    public LocalDate getFechaCubierta() { return fechaCubierta; }
    public void setFechaCubierta(LocalDate fechaCubierta) { this.fechaCubierta = fechaCubierta; }

    public Boolean getEsCuotaExtendida() { return esCuotaExtendida; }
    public void setEsCuotaExtendida(Boolean esCuotaExtendida) { this.esCuotaExtendida = esCuotaExtendida; }

    public Long getMontoCancelado() { return montoCancelado; }
    public void setMontoCancelado(Long montoCancelado) { this.montoCancelado = montoCancelado; }
}
