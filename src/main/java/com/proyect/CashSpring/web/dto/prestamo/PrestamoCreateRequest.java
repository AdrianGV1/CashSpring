package com.proyect.CashSpring.web.dto.prestamo;

import com.proyect.CashSpring.domain.enums.TipoAcuerdo;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PrestamoCreateRequest {

    @NotNull
    private Long clienteId;

    @NotNull
    @Positive
    private Long montoPrestado; // CRC

    // Opcional: si viene null, usamos 0.2000
    private BigDecimal interesBase;

    @NotNull
    private LocalDate fechaInicio;

    @NotNull
    private TipoAcuerdo tipoAcuerdo;

    /**
     * SOLO para PAGO_EN_MES (2 cuotas):
     * Si no se mandan, el sistema lo divide 50/50.
     * Si se mandan, deben sumar totalObjetivo.
     */
    private Long montoCuota1;
    private Long montoCuota2;

    /**
     * SOLO para QUINCENAS_DOBLES:
     * cantidad de cuotas (quincenas) en las que se va a pagar.
     * El sistema calcula el monto de cada cuota y el residuo va en la última.
     */
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
