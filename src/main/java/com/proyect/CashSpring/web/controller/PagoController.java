package com.proyect.CashSpring.web.controller;

import com.proyect.CashSpring.application.service.PagoService;
import com.proyect.CashSpring.web.dto.pago.PagoCreateRequest;
import com.proyect.CashSpring.web.dto.pago.PagoResponse;
import com.proyect.CashSpring.web.dto.pago.PagoUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PagoController {

    private final PagoService pagoService;

    public PagoController(PagoService pagoService) {
        this.pagoService = pagoService;
    }

    // GET /api/pagos  -> lista completa
    @GetMapping("/pagos")
    public List<PagoResponse> listarTodos() {
        return pagoService.listarTodos();
    }

    // GET /api/pagos/solicitudes-pendientes -> solo solicitudes EN_ESPERA
    @GetMapping("/pagos/solicitudes-pendientes")
    @PreAuthorize("hasRole('ADMIN')")
    public List<PagoResponse> listarSolicitudesPendientes() {
        return pagoService.listarSolicitudesPendientes();
    }

    // GET /api/prestamos/{prestamoId}/pagos -> lista por préstamo
    @GetMapping("/prestamos/{prestamoId}/pagos")
    public List<PagoResponse> listarPorPrestamo(@PathVariable Long prestamoId) {
        return pagoService.listarPorPrestamo(prestamoId);
    }

    // POST /api/pagos
    @PostMapping("/pagos")
    @ResponseStatus(HttpStatus.CREATED)
    public PagoResponse crear(@Valid @RequestBody PagoCreateRequest request) {
        return pagoService.crear(request);
    }

    // PUT /api/pagos/{pagoId}
    @PutMapping("/pagos/{pagoId}")
    public PagoResponse actualizar(@PathVariable Long pagoId, @RequestBody PagoUpdateRequest request) {
        return pagoService.actualizar(pagoId, request);
    }

    // POST /api/pagos/{pagoId}/aprobar
    @PostMapping("/pagos/{pagoId}/aprobar")
    @PreAuthorize("hasRole('ADMIN')")
    public PagoResponse aprobar(@PathVariable Long pagoId) {
        return pagoService.aprobarPago(pagoId);
    }

    // DELETE /api/pagos/{pagoId}/rechazar
    @DeleteMapping("/pagos/{pagoId}/rechazar")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rechazar(@PathVariable Long pagoId) {
        pagoService.rechazarPago(pagoId);
    }
}
