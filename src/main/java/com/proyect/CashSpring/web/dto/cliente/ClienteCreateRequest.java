package com.proyect.CashSpring.web.dto.cliente;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record ClienteCreateRequest(
        @NotBlank(message = "nombre es obligatorio")
        @Size(max = 150, message = "nombre máximo 150 caracteres")
        String nombre,

        @NotBlank(message = "telefono es obligatorio")
        @Size(max = 30, message = "telefono máximo 30 caracteres")
        String telefono,

        @Size(max = 50, message = "cedula máximo 50 caracteres")
        String cedula,

        // Coordenadas geográficas (formato decimal)
        @DecimalMin(value = "-90.0", message = "latitud debe estar entre -90 y 90")
        @DecimalMax(value = "90.0", message = "latitud debe estar entre -90 y 90")
        Double latitud,

        @DecimalMin(value = "-180.0", message = "longitud debe estar entre -180 y 180")
        @DecimalMax(value = "180.0", message = "longitud debe estar entre -180 y 180")
        Double longitud,

        @Size(max = 255, message = "direccionReferencia máximo 255 caracteres")
        String direccionReferencia,

        String notas
) {}
