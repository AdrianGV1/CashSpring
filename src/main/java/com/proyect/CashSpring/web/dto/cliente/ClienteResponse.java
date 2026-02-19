package com.proyect.CashSpring.web.dto.cliente;

import java.time.Instant;

public record ClienteResponse(
        Long id,
        String nombre,
        String telefono,
        String cedula,
        String ubicacion,
        String notas,
        boolean activo,
        Instant createdAt,
        Instant updatedAt,
        // Coordenadas extraídas del link (null si el link es corto o no parseable)
        Double latitud,
        Double longitud
) {}
