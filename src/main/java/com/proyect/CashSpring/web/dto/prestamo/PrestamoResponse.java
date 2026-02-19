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

    private List<CuotaItem> cuotas;

    public static class CuotaItem {
        private Integer numeroCuota;
        private LocalDate fechaVencimiento;
        private Long montoObjetivo;

        public Integer getNumeroCuota() { return numeroCuota; }
        public void setNumeroCuota(Integer numeroCuota) { this.numeroCuota = numeroCuota; }

        public LocalDate getFechaVencimiento() { return fechaVencimiento; }
        public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }

        public Long getMontoObjetivo() { return montoObjetivo; }
        public void setMontoObjetivo(Long montoObjetivo) { this.montoObjetivo = montoObjetivo; }
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

    public List<CuotaItem> getCuotas() { return cuotas; }
    public void setCuotas(List<CuotaItem> cuotas) { this.cuotas = cuotas; }
}
