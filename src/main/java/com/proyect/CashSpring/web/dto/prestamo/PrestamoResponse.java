package com.proyect.CashSpring.web.dto.prestamo;

import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.domain.enums.TipoAcuerdo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class PrestamoResponse {

    private Long prestamoId;
    private Long clienteId;
    private String clienteNombre;

    private Long montoPrestado;
    private BigDecimal interesBase;

    private TipoAcuerdo tipoAcuerdo;
    private LocalDate fechaInicio;

    private Long totalObjetivo;
    private EstadoPrestamo estado;

    private Boolean esExtendido;
    private Long montoExtendido;
    private Integer numeroExtensiones;

    private Long montoLiquidacion;
    private Long penalizacionAcumulada;

    // Campos de control de penalización
    private Boolean penalizacionPausada;
    private LocalDate fechaPausaPenalizacion;
    private Boolean penalizacionNegociada;
    private Long montoNegociado;
    private LocalDate fechaNegociacion;

    private List<CuotaItem> cuotas;

    public static class CuotaItem {
        private Integer numeroCuota;
        private LocalDate fechaVencimiento;
        private Long montoObjetivo;
        private Long montoCancelado;
        private Boolean esCuotaExtendida;

        public Integer getNumeroCuota() { return numeroCuota; }
        public void setNumeroCuota(Integer numeroCuota) { this.numeroCuota = numeroCuota; }

        public LocalDate getFechaVencimiento() { return fechaVencimiento; }
        public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }

        public Long getMontoObjetivo() { return montoObjetivo; }
        public void setMontoObjetivo(Long montoObjetivo) { this.montoObjetivo = montoObjetivo; }

        public Long getMontoCancelado() { return montoCancelado; }
        public void setMontoCancelado(Long montoCancelado) { this.montoCancelado = montoCancelado; }

        public Boolean getEsCuotaExtendida() { return esCuotaExtendida; }
        public void setEsCuotaExtendida(Boolean esCuotaExtendida) { this.esCuotaExtendida = esCuotaExtendida; }
    }

    public Long getPrestamoId() { return prestamoId; }
    public void setPrestamoId(Long prestamoId) { this.prestamoId = prestamoId; }

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public Long getMontoPrestado() { return montoPrestado; }
    public void setMontoPrestado(Long montoPrestado) { this.montoPrestado = montoPrestado; }

    public BigDecimal getInteresBase() { return interesBase; }
    public void setInteresBase(BigDecimal interesBase) { this.interesBase = interesBase; }

    public TipoAcuerdo getTipoAcuerdo() { return tipoAcuerdo; }
    public void setTipoAcuerdo(TipoAcuerdo tipoAcuerdo) { this.tipoAcuerdo = tipoAcuerdo; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public Long getTotalObjetivo() { return totalObjetivo; }
    public void setTotalObjetivo(Long totalObjetivo) { this.totalObjetivo = totalObjetivo; }

    public EstadoPrestamo getEstado() { return estado; }
    public void setEstado(EstadoPrestamo estado) { this.estado = estado; }

    public Boolean getEsExtendido() { return esExtendido; }
    public void setEsExtendido(Boolean esExtendido) { this.esExtendido = esExtendido; }

    public Long getMontoExtendido() { return montoExtendido; }
    public void setMontoExtendido(Long montoExtendido) { this.montoExtendido = montoExtendido; }

    public Integer getNumeroExtensiones() { return numeroExtensiones; }
    public void setNumeroExtensiones(Integer numeroExtensiones) { this.numeroExtensiones = numeroExtensiones; }

    public Long getMontoLiquidacion() { return montoLiquidacion; }
    public void setMontoLiquidacion(Long montoLiquidacion) { this.montoLiquidacion = montoLiquidacion; }

    public Long getPenalizacionAcumulada() { return penalizacionAcumulada; }
    public void setPenalizacionAcumulada(Long penalizacionAcumulada) { this.penalizacionAcumulada = penalizacionAcumulada; }

    public Boolean getPenalizacionPausada() { return penalizacionPausada; }
    public void setPenalizacionPausada(Boolean penalizacionPausada) { this.penalizacionPausada = penalizacionPausada; }

    public LocalDate getFechaPausaPenalizacion() { return fechaPausaPenalizacion; }
    public void setFechaPausaPenalizacion(LocalDate fechaPausaPenalizacion) { this.fechaPausaPenalizacion = fechaPausaPenalizacion; }

    public Boolean getPenalizacionNegociada() { return penalizacionNegociada; }
    public void setPenalizacionNegociada(Boolean penalizacionNegociada) { this.penalizacionNegociada = penalizacionNegociada; }

    public Long getMontoNegociado() { return montoNegociado; }
    public void setMontoNegociado(Long montoNegociado) { this.montoNegociado = montoNegociado; }

    public LocalDate getFechaNegociacion() { return fechaNegociacion; }
    public void setFechaNegociacion(LocalDate fechaNegociacion) { this.fechaNegociacion = fechaNegociacion; }

    public List<CuotaItem> getCuotas() { return cuotas; }
    public void setCuotas(List<CuotaItem> cuotas) { this.cuotas = cuotas; }
}
