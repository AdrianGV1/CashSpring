package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.infrastructure.persistence.entity.ClienteEntity;
import com.proyect.CashSpring.infrastructure.persistence.jpa.ClienteJpaRepository;
import com.proyect.CashSpring.web.dto.cliente.ClienteCreateRequest;
import com.proyect.CashSpring.web.dto.cliente.ClienteResponse;
import com.proyect.CashSpring.web.dto.cliente.ClienteUpdateRequest;
import com.proyect.CashSpring.web.exception.BusinessException;
import com.proyect.CashSpring.web.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

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
                .ubicacion(normalizarUbicacion(req.ubicacion()))
                .ubicacionExtra(normalizarUbicacion(req.ubicacionExtra()))
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
    public List<ClienteResponse> findClientesDisponiblesParaPrestamo() {
        // Devuelve clientes activos que NO tienen préstamos activos o atrasados
        return clienteRepo.findAll().stream()
                .filter(ClienteEntity::isActivo)
                .filter(cliente -> cliente.getPrestamos().stream()
                        .noneMatch(prestamo -> 
                            prestamo.getEstado() == EstadoPrestamo.ACTIVO || 
                            prestamo.getEstado() == EstadoPrestamo.ATRASADO
                        )
                )
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse findById(Long id) {
        return toResponse(findEntityOrThrow(id));
    }

    @Transactional
    public ClienteResponse update(Long id, ClienteUpdateRequest req) {
        ClienteEntity entity = findEntityOrThrow(id);

        // Tus DTOs son records con campos obligatorios (NotBlank), así que se setean directo.
        entity.setNombre(req.nombre());
        entity.setTelefono(req.telefono());
        entity.setCedula(req.cedula());
        entity.setUbicacion(normalizarUbicacion(req.ubicacion()));
        entity.setUbicacionExtra(normalizarUbicacion(req.ubicacionExtra()));
        entity.setNotas(req.notas());
        if (req.activo() != null) entity.setActivo(req.activo());

        ClienteEntity saved = clienteRepo.save(entity);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        ClienteEntity entity = findEntityOrThrow(id);
        
        // Validar que no tenga préstamos activos o atrasados (que deba dinero)
        boolean tienePrestamosActivos = entity.getPrestamos().stream()
                .anyMatch(prestamo -> 
                    prestamo.getEstado() == EstadoPrestamo.ACTIVO || 
                    prestamo.getEstado() == EstadoPrestamo.ATRASADO
                );
        
        if (tienePrestamosActivos) {
            throw new BusinessException(
                "No se puede eliminar el cliente porque tiene préstamos activos o atrasados. " +
                "Debe liquidar todos sus préstamos antes de eliminar el cliente."
            );
        }
        
        // Si llega aquí, todos los préstamos están PAGADOS o no tiene préstamos
        // Eliminar el cliente (sus préstamos, cuotas y pagos se eliminan en cascada por JPA)
        clienteRepo.delete(entity);
    }

    private ClienteEntity findEntityOrThrow(Long id) {
        return clienteRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Cliente no encontrado: id=" + id));
    }

    private ClienteResponse toResponse(ClienteEntity e) {
        // --- Ubicación principal ---
        Coordenadas coords = extraerCoordenadas(e.getUbicacion());
        System.out.println("📍 UBICACIÓN ORIGINAL: " + e.getUbicacion());
        System.out.println("📍 COORDENADAS EXTRAÍDAS: " + coords);

        String googleMapsUrl = null;
        String appleMapsUrl = null;
        if (coords != null) {
            googleMapsUrl = com.proyect.CashSpring.domain.util.MapUrlGenerator.generateGoogleMapsUrl(coords.lat(), coords.lng());
            appleMapsUrl = com.proyect.CashSpring.domain.util.MapUrlGenerator.generateAppleMapsUrl(coords.lat(), coords.lng());
            System.out.println("✅ URLS GENERADAS:");
            System.out.println("   Google Maps: " + googleMapsUrl);
            System.out.println("   Apple Maps: " + appleMapsUrl);
        } else {
            System.out.println("❌ NO SE PUDIERON EXTRAER COORDENADAS");
        }

        // --- Ubicación extra (opcional) ---
        Coordenadas coordsExtra = extraerCoordenadas(e.getUbicacionExtra());
        String googleMapsUrlExtra = null;
        String appleMapsUrlExtra = null;
        if (coordsExtra != null) {
            googleMapsUrlExtra = com.proyect.CashSpring.domain.util.MapUrlGenerator.generateGoogleMapsUrl(coordsExtra.lat(), coordsExtra.lng());
            appleMapsUrlExtra = com.proyect.CashSpring.domain.util.MapUrlGenerator.generateAppleMapsUrl(coordsExtra.lat(), coordsExtra.lng());
        }

        return new ClienteResponse(
                e.getId(),
                e.getNombre(),
                e.getTelefono(),
                e.getCedula(),
                e.getUbicacion(),
                coords != null ? coords.lat() : null,
                coords != null ? coords.lng() : null,
                googleMapsUrl,
                appleMapsUrl,
                e.getUbicacionExtra(),
                coordsExtra != null ? coordsExtra.lat() : null,
                coordsExtra != null ? coordsExtra.lng() : null,
                googleMapsUrlExtra,
                appleMapsUrlExtra,
                e.getNotas(),
                e.isActivo(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    private Coordenadas extraerCoordenadas(String ubicacion) {
        if (ubicacion == null || ubicacion.isBlank()) return null;
        String s = ubicacion.trim();

        // 1. Decimal directo: "9.362272, -83.694580"
        Coordenadas c = parseLatLng(s);
        if (c != null) return c;

        // 2. Decimal con símbolo y dirección: "9,36276° N, 83,69524° O"
        c = parseDecimalDireccion(s);
        if (c != null) return c;

        // 3. DMS: "9°21'44.2"N 83°41'40.5"W"
        c = parseDMS(s);
        if (c != null) return c;

        // 4. ll= (Apple Maps — siempre numérico)
        c = extraerParam(s, "ll=", 3);
        if (c != null) return c;

        // 5. sll= (Apple Maps source location)
        c = extraerParam(s, "sll=", 4);
        if (c != null) return c;

        // 6. @lat,lng,zoom (Google Maps)
        int at = s.indexOf('@');
        if (at >= 0) {
            String[] parts = s.substring(at + 1).split(",");
            if (parts.length >= 2) {
                c = parseLatLng(parts[0] + "," + parts[1]);
                if (c != null) return c;
            }
        }

        // 7. q=lat,lng (Google Maps — solo si numérico)
        c = extraerParam(s, "q=", 2);
        if (c != null) return c;

        return null;
    }

    /**
     * Formato: "9,36276° N, 83,69524° O"  o  "9.36276° N, 83.69524° O"
     * También acepta: N/S/E/W/O (O = Oeste = West en español)
     */
    private Coordenadas parseDecimalDireccion(String s) {
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(
            "(-?\\d+[.,]\\d+)\\s*°?\\s*([NSns])\\s*[,;]?\\s*(-?\\d+[.,]\\d+)\\s*°?\\s*([EWOewo])",
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher m = p.matcher(s.trim());
        if (!m.find()) return null;
        try {
            double lat = Double.parseDouble(m.group(1).replace(',', '.'));
            double lng = Double.parseDouble(m.group(3).replace(',', '.'));
            if (m.group(2).equalsIgnoreCase("S")) lat = -lat;
            char lngDir = Character.toUpperCase(m.group(4).charAt(0));
            if (lngDir == 'W' || lngDir == 'O') lng = -lng;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
            return new Coordenadas(lat, lng);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Formato DMS: "9°21'44.2"N 83°41'40.5"W"
     * También acepta segundos con coma: "44,2"
     * Acepta múltiples variaciones de símbolos de grado y comillas
     */
    private Coordenadas parseDMS(String s) {
    java.util.regex.Pattern p = java.util.regex.Pattern.compile(
        "(\\d+)[°º]\\s*(\\d+)[''′]\\s*(\\d+(?:[.,]\\d+)?)[\"\"″\u201C\u201D\u02BA\\s]*([NSns])" +
        "[\\s,;]*(\\d+)[°º]\\s*(\\d+)[''′]\\s*(\\d+(?:[.,]\\d+)?)[\"\"″\u201C\u201D\u02BA\\s]*([EWOewo])",
        java.util.regex.Pattern.CASE_INSENSITIVE
    );
    java.util.regex.Matcher m = p.matcher(s.trim());
    if (!m.find()) return null;
    try {
        double lat = dmsADecimal(
            Double.parseDouble(m.group(1)),
            Double.parseDouble(m.group(2)),
            Double.parseDouble(m.group(3).replace(',', '.')),
            m.group(4)
        );
        double lng = dmsADecimal(
            Double.parseDouble(m.group(5)),
            Double.parseDouble(m.group(6)),
            Double.parseDouble(m.group(7).replace(',', '.')),
            m.group(8)
        );
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
        return new Coordenadas(lat, lng);
    } catch (NumberFormatException e) {
        return null;
    }
}

    private double dmsADecimal(double grados, double minutos, double segundos, String direccion) {
        double decimal = grados + minutos / 60.0 + segundos / 3600.0;
        char dir = Character.toUpperCase(direccion.charAt(0));
        if (dir == 'S' || dir == 'W' || dir == 'O') decimal = -decimal;
        return decimal;
    }

    private Coordenadas extraerParam(String s, String param, int paramLen) {
        int idx = indexOfIgnoreCase(s, param);
        if (idx < 0) return null;
        String sub = s.substring(idx + paramLen);
        int end = sub.indexOf('&');
        if (end >= 0) sub = sub.substring(0, end);
        return parseLatLng(sub);
    }

    private Coordenadas parseLatLng(String s) {
        if (s == null) return null;
        String cleaned = s.trim().replace(" ", "");
        String[] parts = cleaned.split(",");
        System.out.println("   parseLatLng - Input: '" + s + "'");
        System.out.println("   parseLatLng - Cleaned: '" + cleaned + "'");
        System.out.println("   parseLatLng - Parts: " + java.util.Arrays.toString(parts));
        if (parts.length != 2) {
            System.out.println("   parseLatLng - FALLO: No son 2 partes");
            return null;
        }
        try {
            double lat = Double.parseDouble(parts[0]);
            double lng = Double.parseDouble(parts[1]);
            System.out.println("   parseLatLng - Lat: " + lat + ", Lng: " + lng);
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                System.out.println("   parseLatLng - FALLO: Fuera de rango");
                return null;
            }
            System.out.println("   parseLatLng - ✅ ÉXITO");
            return new Coordenadas(lat, lng);
        } catch (NumberFormatException ex) {
            System.out.println("   parseLatLng - FALLO: " + ex.getMessage());
            return null;
        }
    }

    private int indexOfIgnoreCase(String s, String token) {
        return s.toLowerCase(Locale.ROOT).indexOf(token.toLowerCase(Locale.ROOT));
    }

    private record Coordenadas(double lat, double lng) {}

    // Limpia espacios
    private String normalizarUbicacion(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.isEmpty()) return null;
        return s;
    }
}
