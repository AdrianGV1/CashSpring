package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.infrastructure.persistence.entity.ClienteEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.ClienteJpaRepository;
import com.proyect.CashSpring.web.dto.cliente.ClienteCreateRequest;
import com.proyect.CashSpring.web.dto.cliente.ClienteResponse;
import com.proyect.CashSpring.web.dto.cliente.ClienteUpdateRequest;
import com.proyect.CashSpring.web.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ClienteService {

    private final ClienteJpaRepository clienteRepo;

    public ClienteService(ClienteJpaRepository clienteRepo) {
        this.clienteRepo = clienteRepo;
    }

    @Transactional
    public ClienteResponse create(ClienteCreateRequest req) {
        ClienteEntity entity = ClienteEntity.builder()
                .nombre(req.nombre())
                .telefono(req.telefono())
                .cedula(req.cedula())
                .direccion(req.direccion())
                .notas(req.notas())
                .activo(true)
                .build();

        ClienteEntity saved = clienteRepo.save(entity);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> findAll() {
        return clienteRepo.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse findById(Long id) {
        return toResponse(findEntityOrThrow(id));
    }

    @Transactional
    public ClienteResponse update(Long id, ClienteUpdateRequest req) {
        ClienteEntity entity = findEntityOrThrow(id);

        entity.setNombre(req.nombre());
        entity.setTelefono(req.telefono());
        entity.setCedula(req.cedula());
        entity.setDireccion(req.direccion());
        entity.setNotas(req.notas());
        if (req.activo() != null) entity.setActivo(req.activo());

        ClienteEntity saved = clienteRepo.save(entity);
        return toResponse(saved);
    }

    private ClienteEntity findEntityOrThrow(Long id) {
        return clienteRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Cliente no encontrado: id=" + id));
    }

    private ClienteResponse toResponse(ClienteEntity e) {
        return new ClienteResponse(
                e.getId(),
                e.getNombre(),
                e.getTelefono(),
                e.getCedula(),
                e.getDireccion(),
                e.getNotas(),
                e.isActivo(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
