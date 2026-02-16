package com.proyect.CashSpring.web.dto.cliente;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClienteUpdateRequest(
        @NotBlank(message = "nombre es obligatorio")
        @Size(max = 150, message = "nombre máximo 150 caracteres")
        String nombre,

        @NotBlank(message = "telefono es obligatorio")
        @Size(max = 30, message = "telefono máximo 30 caracteres")
        String telefono,

        @Size(max = 50, message = "cedula máximo 50 caracteres")
        String cedula,

        @Size(max = 255, message = "direccion máximo 255 caracteres")
        String direccion,

        String notas,

        Boolean activo
) {}
