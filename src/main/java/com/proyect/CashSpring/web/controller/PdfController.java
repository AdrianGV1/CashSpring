package com.proyect.CashSpring.web.controller;

import com.proyect.CashSpring.application.service.PdfGeneratorService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reportes")
public class PdfController {

    private final PdfGeneratorService pdfService;

    public PdfController(PdfGeneratorService pdfService) {
        this.pdfService = pdfService;
    }

    /**
     * GET /api/reportes/cliente/{clienteId}
     * Genera un PDF con toda la información de un cliente específico
     * (datos personales, préstamos, cuotas, pagos)
     */
    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<byte[]> generarReporteCliente(@PathVariable Long clienteId) {
        try {
            byte[] pdf = pdfService.generarReporteCliente(clienteId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "reporte-cliente-" + clienteId + "-" + LocalDate.now() + ".pdf");
            
            return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * GET /api/reportes/prestamo/{prestamoId}
     * Genera un PDF con el detalle de un préstamo específico
     * (cliente, información del préstamo, cuotas, pagos)
     */
    @GetMapping("/prestamo/{prestamoId}")
    public ResponseEntity<byte[]> generarReportePrestamo(@PathVariable Long prestamoId) {
        try {
            byte[] pdf = pdfService.generarReportePrestamo(prestamoId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "reporte-prestamo-" + prestamoId + "-" + LocalDate.now() + ".pdf");
            
            return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * GET /api/reportes/cuotas-proximas?dias=7
     * Genera un PDF con las cuotas próximas a vencer
     * @param dias Número de días hacia adelante (default: 7)
     */
    @GetMapping("/cuotas-proximas")
    public ResponseEntity<byte[]> generarReporteCuotasProximas(
            @RequestParam(required = false, defaultValue = "7") Integer dias) {
        try {
            byte[] pdf = pdfService.generarReporteCuotasProximas(dias);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "cuotas-proximas-" + dias + "dias-" + LocalDate.now() + ".pdf");
            
            return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * GET /api/reportes/prestamos-activos
     * Genera un PDF con el resumen de todos los préstamos activos
     */
    @GetMapping("/prestamos-activos")
    public ResponseEntity<byte[]> generarReportePrestamosActivos() {
        try {
            byte[] pdf = pdfService.generarReportePrestamosActivos();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "prestamos-activos-" + LocalDate.now() + ".pdf");
            
            return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * GET /api/reportes/prestamos-atrasados
     * Genera un PDF con el resumen de todos los préstamos atrasados
     */
    @GetMapping("/prestamos-atrasados")
    public ResponseEntity<byte[]> generarReportePrestamosAtrasados() {
        try {
            byte[] pdf = pdfService.generarReportePrestamosAtrasados();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "prestamos-atrasados-" + LocalDate.now() + ".pdf");
            
            return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
