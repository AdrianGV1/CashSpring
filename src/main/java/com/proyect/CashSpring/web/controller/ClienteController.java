package com.proyect.CashSpring.web.controller;

import com.proyect.CashSpring.application.service.ClienteService;
import com.proyect.CashSpring.web.dto.cliente.ClienteCreateRequest;
import com.proyect.CashSpring.web.dto.cliente.ClienteResponse;
import com.proyect.CashSpring.web.dto.cliente.ClienteUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteResponse create(@Valid @RequestBody ClienteCreateRequest req) {
        return clienteService.create(req);
    }

    @GetMapping
    public List<ClienteResponse> findAll() {
        return clienteService.findAll();
    }

    @GetMapping("/disponibles")
    public List<ClienteResponse> findDisponibles() {
        return clienteService.findClientesDisponiblesParaPrestamo();
    }

    @GetMapping("/{id}")
    public ClienteResponse findById(@PathVariable Long id) {
        return clienteService.findById(id);
    }

    @PutMapping("/{id}")
    public ClienteResponse update(@PathVariable Long id, @Valid @RequestBody ClienteUpdateRequest req) {
        return clienteService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        clienteService.delete(id);
    }
}
