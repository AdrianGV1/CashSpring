package com.proyect.CashSpring.web.dto.cliente;

import java.time.Instant;

public record ClienteResponse(
        Long id,
        String nombre,
        String telefono,
        String cedula,
        Double latitud,
        Double longitud,
        String direccionReferencia,
        String notas,
        boolean activo,
        Instant createdAt,
        Instant updatedAt,
        // Links generados dinámicamente
        String googleMapsUrl,
        String wazeUrl,
        String whatsappLocationUrl
) {}
