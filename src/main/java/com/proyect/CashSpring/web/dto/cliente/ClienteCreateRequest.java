package com.proyect.CashSpring.web.dto.cliente;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClienteCreateRequest(

        @NotBlank(message = "nombre es obligatorio")
        @Size(max = 150, message = "nombre máximo 150 caracteres")
        String nombre,

        @NotBlank(message = "telefono es obligatorio")
        @Size(max = 30, message = "telefono máximo 30 caracteres")
        String telefono,

        @Size(max = 50, message = "cedula máximo 50 caracteres")
        String cedula,

        @NotBlank(message = "ubicacion es obligatoria")
        @Size(max = 500, message = "ubicacion máximo 500 caracteres")
        String ubicacion,

        @NotBlank(message = "ubicacionExtra es obligatoria")
        @Size(max = 500, message = "ubicacionExtra máximo 500 caracteres")
        String ubicacionExtra,

        @Size(max = 300, message = "ordenPatronal máximo 300 caracteres")
        String ordenPatronal,

        @Size(max = 1000)
        String fotoOrdenPatronal,

        @Size(max = 1000)
        String fotoCedulaFrente,

        @Size(max = 1000)
        String fotoCedulaDetras,

        @Size(max = 1000)
        String fotoUbicacion,

        @Size(max = 1000)
        String fotoUbicacionExtra,

        String notas
) {}
