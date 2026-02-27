package com.proyect.CashSpring.web.dto.pago;

import com.proyect.CashSpring.domain.enums.EstadoAprobacionPago;

import java.time.LocalDate;

public class PagoResponse {

    private Long pagoId;
    private Long prestamoId;
    private String clienteNombre; // Para mostrar en el dashboard
    private String clienteCedula;

    private LocalDate fechaPago;
    private Long monto; // CRC
    private String notas;
    private EstadoAprobacionPago estadoAprobacion;
    private Boolean esLiquidacion;

    public Long getPagoId() { return pagoId; }
    public void setPagoId(Long pagoId) { this.pagoId = pagoId; }

    public Long getPrestamoId() { return prestamoId; }
    public void setPrestamoId(Long prestamoId) { this.prestamoId = prestamoId; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteCedula() { return clienteCedula; }
    public void setClienteCedula(String clienteCedula) { this.clienteCedula = clienteCedula; }

    public LocalDate getFechaPago() { return fechaPago; }
    public void setFechaPago(LocalDate fechaPago) { this.fechaPago = fechaPago; }

    public Long getMonto() { return monto; }
    public void setMonto(Long monto) { this.monto = monto; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public EstadoAprobacionPago getEstadoAprobacion() { return estadoAprobacion; }
    public void setEstadoAprobacion(EstadoAprobacionPago estadoAprobacion) { this.estadoAprobacion = estadoAprobacion; }

    public Boolean getEsLiquidacion() { return esLiquidacion; }
    public void setEsLiquidacion(Boolean esLiquidacion) { this.esLiquidacion = esLiquidacion; }
}
