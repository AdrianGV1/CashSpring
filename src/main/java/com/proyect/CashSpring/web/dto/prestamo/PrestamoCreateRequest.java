package com.proyect.CashSpring.web.dto.prestamo;

import com.proyect.CashSpring.domain.enums.TipoAcuerdo;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PrestamoCreateRequest {

    // Opcional: si se envía clienteId se puede usar para referencia, pero ya no es obligatorio
    private Long clienteId;

    private String nombre;

    private String telefono;

    @NotNull(message = "La cédula es obligatoria")
    private String cedula;

    private String ubicacion;

    private String notas;

    private BigDecimal interesBase;

    @NotNull
    private LocalDate fechaInicio;

    @NotNull
    private TipoAcuerdo tipoAcuerdo;

    @NotNull
    @Positive
    private Long montoPrestado; // CRC


    /**
     * SOLO para PAGO_EN_MES (Acuerdo 2):
     * cantidad de quincenas (2 a 10).
     */
    private Integer cantidadQuincenas;

    /**
     * SOLO para QUINCENAS_DOBLES (Acuerdo 3):
     * monto fijo por quincena (la última absorbe residuo).
     */
    private Long montoPorQuincena;

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getCedula() { return cedula; }
    public void setCedula(String cedula) { this.cedula = cedula; }

    public String getUbicacion() { return ubicacion; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

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

    public Long getMontoPrestado() { return montoPrestado; }
    public void setMontoPrestado(Long montoPrestado) { this.montoPrestado = montoPrestado; }
}
