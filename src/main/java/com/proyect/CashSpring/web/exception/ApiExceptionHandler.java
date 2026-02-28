package com.proyect.CashSpring.web.exception;

import jakarta.persistence.PersistenceException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<?> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusiness(BusinessException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("BUSINESS_ERROR", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> fieldErrors.put(err.getField(), err.getDefaultMessage()));

        Map<String, Object> body = error("VALIDATION_ERROR", "Datos inválidos");
        body.put("fields", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(error("BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrity(DataIntegrityViolationException ex) {
        String msg = "Ya existe un registro con esos datos (valor duplicado)";
        String cause = ex.getRootCause() != null ? ex.getRootCause().getMessage() : "";
        if (cause.contains("uk_clientes_cedula") || cause.contains("cedula")) {
            msg = "Ya existe un cliente registrado con esa cédula.";
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error("CONFLICT", msg));
    }

    @ExceptionHandler(PersistenceException.class)
    public ResponseEntity<?> handlePersistence(PersistenceException ex) {
        Throwable cause = ex.getCause();
        if (cause instanceof DataAccessException dae) {
            return handleDataIntegrity(new DataIntegrityViolationException(dae.getMessage(), dae));
        }
        // Extraer mensaje del root cause (ej: constraint violation de PostgreSQL)
        String msg = cause != null ? cause.getMessage() : ex.getMessage();
        if (msg != null && msg.contains("viola la restricción")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(error("CONFLICT", "Operación rechazada por restricción de base de datos"));
        }
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error("INTERNAL_ERROR", "Ocurrió un error inesperado"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex) {
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error("INTERNAL_ERROR", "Ocurrió un error inesperado"));
    }

    private Map<String, Object> error(String code, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("code", code);
        body.put("message", message);
        return body;
    }
}
