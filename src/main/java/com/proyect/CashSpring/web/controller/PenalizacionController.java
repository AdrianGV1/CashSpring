package com.proyect.CashSpring.web.controller;

import com.proyect.CashSpring.application.service.PenalizacionService;
import com.proyect.CashSpring.infrastructure.persistence.entity.PrestamoEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/penalizaciones")
public class PenalizacionController {

    private final PenalizacionService penalizacionService;
    private final PrestamoJpaRepository prestamoRepo;

    public PenalizacionController(PenalizacionService penalizacionService, PrestamoJpaRepository prestamoRepo) {
        this.penalizacionService = penalizacionService;
        this.prestamoRepo = prestamoRepo;
    }

    /**
     * GET /api/penalizaciones/{prestamoId}
     * Calcula y muestra la penalización actual de un préstamo
     */
    @GetMapping("/{prestamoId}")
    public ResponseEntity<Map<String, Object>> obtenerPenalizacion(@PathVariable Long prestamoId) {
        PrestamoEntity prestamo = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + prestamoId));

        long penalizacion = penalizacionService.calcularPenalizacion(prestamo);
        String info = penalizacionService.obtenerInformacionPenalizacion(prestamo);

        Map<String, Object> response = new HashMap<>();
        response.put("prestamoId", prestamoId);
        response.put("penalizacionActual", penalizacion);
        response.put("penalizacionAlmacenada", prestamo.getPenalizacionAcumulada());
        response.put("estado", prestamo.getEstado());
        response.put("informacion", info);
        response.put("constantes", Map.of(
            "penalizacionDiaria", PenalizacionService.PENALIZACION_DIARIA,
            "diasGracia", PenalizacionService.DIAS_GRACIA
        ));

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/penalizaciones/{prestamoId}/actualizar
     * Fuerza la actualización de penalización de un préstamo específico
     */
    @PostMapping("/{prestamoId}/actualizar")
    public ResponseEntity<Map<String, Object>> actualizarPenalizacion(@PathVariable Long prestamoId) {
        penalizacionService.actualizarPenalizacionPrestamo(prestamoId);

        PrestamoEntity prestamo = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado: " + prestamoId));

        Map<String, Object> response = new HashMap<>();
        response.put("prestamoId", prestamoId);
        response.put("penalizacionAcumulada", prestamo.getPenalizacionAcumulada());
        response.put("estado", prestamo.getEstado());
        response.put("mensaje", "Penalización actualizada correctamente");

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/penalizaciones/actualizar-todos
     * Ejecuta manualmente el job de actualización de penalizaciones para todos los préstamos
     */
    @PostMapping("/actualizar-todos")
    public ResponseEntity<Map<String, String>> actualizarTodasPenalizaciones() {
        penalizacionService.actualizarPenalizacionesDiarias();

        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Proceso de actualización ejecutado correctamente");
        response.put("nota", "Revisa los logs de la consola para ver los resultados");

        return ResponseEntity.ok(response);
    }
}
