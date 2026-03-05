package com.proyect.CashSpring.web.dto.cliente;

import java.time.Instant;

public record ClienteResponse(
        Long id,
        String nombre,
        String telefono,
        String cedula,
        // Ubicación principal (obligatoria)
        String ubicacion,
        Double latitud,
        Double longitud,
        String googleMapsUrl,
        String appleMapsUrl,
        // Ubicación extra (opcional)
        String ubicacionExtra,
        Double latitudExtra,
        Double longitudExtra,
        String googleMapsUrlExtra,
        String appleMapsUrlExtra,
        // Otros
        String notas,
        boolean activo,
        Instant createdAt,
        Instant updatedAt,
        // Documentos
        String ordenPatronal,
        String fotoOrdenPatronal,
        String fotoCedulaFrente,
        String fotoCedulaDetras,
        String fotoUbicacion,
        String fotoUbicacionExtra
) {}
