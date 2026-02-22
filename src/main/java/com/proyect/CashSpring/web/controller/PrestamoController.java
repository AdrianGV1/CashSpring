package com.proyect.CashSpring.web.controller;

import com.proyect.CashSpring.application.service.PrestamoService;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoCreateRequest;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoResponse;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/prestamos")
public class PrestamoController {

    private final PrestamoService prestamoService;

    public PrestamoController(PrestamoService prestamoService) {
        this.prestamoService = prestamoService;
    }

    // CREA préstamo para cualquiera de los 3 acuerdos
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrestamoResponse crear(@Valid @RequestBody PrestamoCreateRequest request) {
        return prestamoService.crearPrestamo(request);
    }

    // UPDATE préstamo (regenera cuotas si cambias monto/interés/fecha/acuerdo/cuotaFija)
    @PutMapping("/{id}")
    public PrestamoResponse actualizar(@PathVariable Long id, @RequestBody PrestamoUpdateRequest request) {
        return prestamoService.actualizarPrestamo(id, request);
    }

    @GetMapping
    public java.util.List<PrestamoResponse> listar() {
        return prestamoService.listarPrestamos();
    }

    @GetMapping("/cliente/{clienteId}")
    public java.util.List<PrestamoResponse> listarPorCliente(@PathVariable Long clienteId) {
        return prestamoService.listarPrestamosPorCliente(clienteId);
    }

    @GetMapping("/{id}")
    public PrestamoResponse obtener(@PathVariable Long id) {
        return prestamoService.obtenerPrestamo(id);
    }

    // POST /api/prestamos/{id}/extender
    @PostMapping("/{id}/extender")
    public PrestamoResponse extender(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {
        Long montoExtendido = body.get("montoExtendido");
        if (montoExtendido == null || montoExtendido <= 0) {
            throw new IllegalArgumentException("montoExtendido debe ser un valor positivo.");
        }
        Long montoPorCuota = body.get("montoPorCuota"); // opcional, puede ser null
        return prestamoService.extenderPrestamo(id, montoExtendido, montoPorCuota);
    }

    // POST /api/prestamos/{id}/liquidar
    @PostMapping("/{id}/liquidar")
    public PrestamoResponse liquidar(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String fechaStr = (body != null) ? body.get("fechaLiquidacion") : null;
        LocalDate fecha = (fechaStr != null && !fechaStr.isBlank())
                ? LocalDate.parse(fechaStr)
                : LocalDate.now();
        return prestamoService.liquidarPrestamo(id, fecha);
    }

}
