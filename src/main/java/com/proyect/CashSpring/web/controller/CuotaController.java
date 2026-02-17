package com.proyect.CashSpring.web.controller;

import com.proyect.CashSpring.application.service.CuotaService;
import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.web.dto.cuota.CuotaCreateRequest;
import com.proyect.CashSpring.web.dto.cuota.CuotaResponse;
import com.proyect.CashSpring.web.dto.cuota.CuotaUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CuotaController {

    private final CuotaService cuotaService;

    public CuotaController(CuotaService cuotaService) {
        this.cuotaService = cuotaService;
    }

    // GET /api/prestamos/{prestamoId}/cuotas
    @GetMapping("/prestamos/{prestamoId}/cuotas")
    public List<CuotaResponse> listarPorPrestamo(@PathVariable Long prestamoId) {
        return cuotaService.listarPorPrestamo(prestamoId);
    }

    // GET /api/prestamos/{prestamoId}/cuotas?estado=PENDIENTE
    @GetMapping("/prestamos/{prestamoId}/cuotas/filtrar")
    public List<CuotaResponse> listarPorPrestamoYEstado(
            @PathVariable Long prestamoId,
            @RequestParam EstadoCuota estado
    ) {
        return cuotaService.listarPorPrestamoYEstado(prestamoId, estado);
    }

    // POST /api/cuotas
    @PostMapping("/cuotas")
    @ResponseStatus(HttpStatus.CREATED)
    public CuotaResponse crear(@Valid @RequestBody CuotaCreateRequest request) {
        return cuotaService.crear(request);
    }

    // PUT /api/cuotas/{cuotaId}
    @PutMapping("/cuotas/{cuotaId}")
    public CuotaResponse actualizar(@PathVariable Long cuotaId, @RequestBody CuotaUpdateRequest request) {
        return cuotaService.actualizar(cuotaId, request);
    }

    // GET /api/cuotas
@GetMapping("/cuotas")
public List<CuotaResponse> listarTodas() {
    return cuotaService.listarTodas();
}

}
