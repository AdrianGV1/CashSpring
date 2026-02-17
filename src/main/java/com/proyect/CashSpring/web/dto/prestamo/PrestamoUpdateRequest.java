package com.proyect.CashSpring.web.dto.prestamo;

import com.proyect.CashSpring.domain.enums.TipoAcuerdo;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PrestamoUpdateRequest {

    // todos opcionales: si viene null, no se cambia
    private Long clienteId;
    private Long montoPrestado;
    private BigDecimal interesBase;
    private LocalDate fechaInicio;
    private TipoAcuerdo tipoAcuerdo;

    // PAGO_EN_MES
    private Long montoCuota1;
    private Long montoCuota2;

    // QUINCENAS_DOBLES (acuerdo 3)
    private Integer cantidadCuotas;

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

    public Long getMontoCuota1() { return montoCuota1; }
    public void setMontoCuota1(Long montoCuota1) { this.montoCuota1 = montoCuota1; }

    public Long getMontoCuota2() { return montoCuota2; }
    public void setMontoCuota2(Long montoCuota2) { this.montoCuota2 = montoCuota2; }

    public Integer getCantidadCuotas() { return cantidadCuotas; }
    public void setCantidadCuotas(Integer cantidadCuotas) { this.cantidadCuotas = cantidadCuotas; }
}
