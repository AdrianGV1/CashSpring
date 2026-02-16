package com.proyect.CashSpring.web.dto.cliente;

import java.time.Instant;

public record ClienteResponse(
        Long id,
        String nombre,
        String telefono,
        String cedula,
        String direccion,
        String notas,
        boolean activo,
        Instant createdAt,
        Instant updatedAt
) {}
