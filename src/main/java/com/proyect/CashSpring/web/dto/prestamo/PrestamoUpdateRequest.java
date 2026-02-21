package com.proyect.CashSpring.web.dto.prestamo;

import com.proyect.CashSpring.domain.enums.TipoAcuerdo;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PrestamoUpdateRequest {

    private Long clienteId;
    private Long montoPrestado;
    private BigDecimal interesBase;
    private LocalDate fechaInicio;
    private TipoAcuerdo tipoAcuerdo;
    private Integer cantidadQuincenas;  // Número de quincenas (para QUINCENAS_DOBLES)
    private Long montoPorQuincena;     // Nuevo monto por quincena en caso de extensión

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }

    public Long getMontoPrestado() { return montoPrestado; }
    public void setMontoPrestado(Long montoPrestado) { this.montoPrestado = montoPrestado; }

    public BigDecimal getInteresBase() { return interesBase; }
    public void setInteresBase(BigDecimal interesBase) { this.interesBase = interesBase; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public TipoAcuerdo getTipoAcuerdo() { return tipoAcuerdo; }
    public void setTipoAcuerdo(TipoAcuerdo tipoAcuerdo) { this.tipoAcuerdo = tipoAcuerdo; }

    public Integer getCantidadQuincenas() { return cantidadQuincenas; }
    public void setCantidadQuincenas(Integer cantidadQuincenas) { this.cantidadQuincenas = cantidadQuincenas; }

    public Long getMontoPorQuincena() { return montoPorQuincena; }
    public void setMontoPorQuincena(Long montoPorQuincena) { this.montoPorQuincena = montoPorQuincena; }
}