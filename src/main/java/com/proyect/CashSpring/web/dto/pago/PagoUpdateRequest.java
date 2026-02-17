package com.proyect.CashSpring.web.dto.pago;

import java.time.LocalDate;

public class PagoUpdateRequest {

    // opcionales
    private LocalDate fechaPago;
    private Long monto;
    private String notas;

    public LocalDate getFechaPago() { return fechaPago; }
    public void setFechaPago(LocalDate fechaPago) { this.fechaPago = fechaPago; }

    public Long getMonto() { return monto; }
    public void setMonto(Long monto) { this.monto = monto; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
