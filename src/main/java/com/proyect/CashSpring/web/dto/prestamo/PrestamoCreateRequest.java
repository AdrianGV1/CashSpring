package com.proyect.CashSpring.web.dto.prestamo;

import com.proyect.CashSpring.domain.enums.TipoAcuerdo;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PrestamoCreateRequest {

    private Long clienteId;

    // Los campos del cliente son opcionales aquí porque:
    // - Si clienteId != null -> se usa cliente existente, no se necesitan estos campos
    // - Si clienteId == null -> se crea nuevo cliente, el servicio valida que estos campos estén
    private String nombre;

    private String telefono;

    private String cedula;

    private String ubicacion;

    private String ubicacionExtra;

    private String ordenPatronal;

    private String fotoOrdenPatronal;

    private String fotoCedulaFrente;

    private String fotoCedulaDetras;

    private String fotoUbicacion;

    private String fotoUbicacionExtra;

    private String notas;

    private BigDecimal interesBase;

    @NotNull
    private LocalDate fechaInicio;

    @NotNull
    private TipoAcuerdo tipoAcuerdo;

    @NotNull
    @Positive
    private Long montoPrestado;

    private Integer cantidadQuincenas;

    private Long montoPorQuincena;

    // Getters y Setters

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

    public String getUbicacionExtra() { return ubicacionExtra; }
    public void setUbicacionExtra(String ubicacionExtra) { this.ubicacionExtra = ubicacionExtra; }

    public String getOrdenPatronal() { return ordenPatronal; }
    public void setOrdenPatronal(String ordenPatronal) { this.ordenPatronal = ordenPatronal; }

    public String getFotoOrdenPatronal() { return fotoOrdenPatronal; }
    public void setFotoOrdenPatronal(String fotoOrdenPatronal) { this.fotoOrdenPatronal = fotoOrdenPatronal; }

    public String getFotoCedulaFrente() { return fotoCedulaFrente; }
    public void setFotoCedulaFrente(String fotoCedulaFrente) { this.fotoCedulaFrente = fotoCedulaFrente; }

    public String getFotoCedulaDetras() { return fotoCedulaDetras; }
    public void setFotoCedulaDetras(String fotoCedulaDetras) { this.fotoCedulaDetras = fotoCedulaDetras; }

    public String getFotoUbicacion() { return fotoUbicacion; }
    public void setFotoUbicacion(String fotoUbicacion) { this.fotoUbicacion = fotoUbicacion; }

    public String getFotoUbicacionExtra() { return fotoUbicacionExtra; }
    public void setFotoUbicacionExtra(String fotoUbicacionExtra) { this.fotoUbicacionExtra = fotoUbicacionExtra; }

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
