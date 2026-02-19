package com.proyect.CashSpring.web.controller;

import com.proyect.CashSpring.application.service.PrestamoService;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoCreateRequest;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoResponse;
import com.proyect.CashSpring.web.dto.prestamo.PrestamoUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/{id}")
    public PrestamoResponse obtener(@PathVariable Long id) {
        return prestamoService.obtenerPrestamo(id);
    }

}
