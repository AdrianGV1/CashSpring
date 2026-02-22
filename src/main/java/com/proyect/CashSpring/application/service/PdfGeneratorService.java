package com.proyect.CashSpring.application.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.proyect.CashSpring.domain.enums.EstadoAprobacionPago;
import com.proyect.CashSpring.domain.enums.EstadoCuota;
import com.proyect.CashSpring.domain.enums.EstadoPrestamo;
import com.proyect.CashSpring.infrastructure.persistence.entity.*;
import com.proyect.CashSpring.infrastructure.persistence.jpa.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class PdfGeneratorService {

    private final ClienteJpaRepository clienteRepo;
    private final PrestamoJpaRepository prestamoRepo;
    private final CuotaJpaRepository cuotaRepo;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final NumberFormat CURRENCY_FORMATTER = NumberFormat.getCurrencyInstance(Locale.of("es", "CR"));

    public PdfGeneratorService(ClienteJpaRepository clienteRepo, 
                              PrestamoJpaRepository prestamoRepo,
                              CuotaJpaRepository cuotaRepo) {
        this.clienteRepo = clienteRepo;
        this.prestamoRepo = prestamoRepo;
        this.cuotaRepo = cuotaRepo;
    }

    // Método auxiliar para formatear moneda
    private String formatCurrency(Long amount) {
        return CURRENCY_FORMATTER.format(amount);
    }

    // Método auxiliar para agregar encabezado
    private void addHeader(Document document, String title) throws DocumentException {
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
        Paragraph titlePara = new Paragraph(title, titleFont);
        titlePara.setAlignment(Element.ALIGN_CENTER);
        titlePara.setSpacingAfter(10);
        document.add(titlePara);

        Font dateFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);
        Paragraph datePara = new Paragraph("Generado: " + LocalDate.now().format(DATE_FORMATTER), dateFont);
        datePara.setAlignment(Element.ALIGN_CENTER);
        datePara.setSpacingAfter(20);
        document.add(datePara);
    }

    // 1. Reporte completo de cliente
    public byte[] generarReporteCliente(Long clienteId) {
        ClienteEntity cliente = clienteRepo.findById(clienteId)
                .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado con ID: " + clienteId));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            // Encabezado
            addHeader(document, "Reporte de Cliente");

            // Información del cliente
            addClienteInfo(document, cliente);

            // Resumen de préstamos
            List<PrestamoEntity> prestamos = cliente.getPrestamos();
            addResumenPrestamos(document, prestamos);

            // Detalle de cada préstamo
            for (PrestamoEntity prestamo : prestamos) {
                document.add(new Paragraph("\n"));
                addPrestamoDetalle(document, prestamo, true);
            }

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Error generando PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    // 2. Reporte de préstamo específico
    public byte[] generarReportePrestamo(Long prestamoId) {
        PrestamoEntity prestamo = prestamoRepo.findById(prestamoId)
                .orElseThrow(() -> new IllegalArgumentException("Préstamo no encontrado con ID: " + prestamoId));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            addHeader(document, "Reporte de Préstamo #" + prestamoId);

            // Información del cliente
            addClienteInfo(document, prestamo.getCliente());

            // Detalle del préstamo
            addPrestamoDetalle(document, prestamo, false);

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Error generando PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    // 3. Reporte de cuotas próximas a vencer
    public byte[] generarReporteCuotasProximas(Integer dias) {
        LocalDate fechaLimite = LocalDate.now().plusDays(dias != null ? dias : 7);
        
        List<CuotaEntity> cuotasProximas = cuotaRepo.findAll().stream()
                .filter(c -> c.getEstado() == EstadoCuota.PENDIENTE)
                .filter(c -> !c.getFechaVencimiento().isAfter(fechaLimite))
                .sorted((c1, c2) -> c1.getFechaVencimiento().compareTo(c2.getFechaVencimiento()))
                .collect(Collectors.toList());

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            addHeader(document, "Cuotas Próximas a Vencer");
            
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 12, Color.DARK_GRAY);
            Paragraph subtitle = new Paragraph(
                "Cuotas pendientes con vencimiento hasta: " + fechaLimite.format(DATE_FORMATTER),
                subtitleFont
            );
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(15);
            document.add(subtitle);

            // Tabla de cuotas
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10);
            table.setWidths(new float[]{2.5f, 2f, 1.5f, 1.5f, 2f, 1.5f});

            // Encabezados
            addTableHeader(table, new String[]{"Cliente", "Préstamo", "# Cuota", "Monto", "Vencimiento", "Días"});

            // Filas
            for (CuotaEntity cuota : cuotasProximas) {
                PrestamoEntity prestamo = cuota.getPrestamo();
                ClienteEntity cliente = prestamo.getCliente();
                
                long diasRestantes = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), cuota.getFechaVencimiento());
                boolean vencida = diasRestantes < 0;
                
                PdfPCell cellCliente = new PdfPCell(new Phrase(cliente.getNombre(), getFont(false)));
                PdfPCell cellPrestamo = new PdfPCell(new Phrase("#" + prestamo.getId(), getFont(false)));
                PdfPCell cellNumero = new PdfPCell(new Phrase(String.valueOf(cuota.getNumeroCuota()), getFont(false)));
                PdfPCell cellMonto = new PdfPCell(new Phrase(formatCurrency(cuota.getMontoObjetivo()), getFont(false)));
                PdfPCell cellFecha = new PdfPCell(new Phrase(cuota.getFechaVencimiento().format(DATE_FORMATTER), getFont(false)));
                
                Font diasFont = FontFactory.getFont(FontFactory.HELVETICA, 10, vencida ? Color.RED : Color.BLACK);
                PdfPCell cellDias = new PdfPCell(new Phrase(String.valueOf(diasRestantes), diasFont));
                
                if (vencida) {
                    cellFecha.setBackgroundColor(new Color(255, 230, 230));
                    cellDias.setBackgroundColor(new Color(255, 230, 230));
                }
                
                cellCliente.setPadding(5);
                cellPrestamo.setPadding(5);
                cellNumero.setPadding(5);
                cellMonto.setPadding(5);
                cellFecha.setPadding(5);
                cellDias.setPadding(5);
                
                cellMonto.setHorizontalAlignment(Element.ALIGN_RIGHT);
                cellNumero.setHorizontalAlignment(Element.ALIGN_CENTER);
                cellDias.setHorizontalAlignment(Element.ALIGN_CENTER);
                
                table.addCell(cellCliente);
                table.addCell(cellPrestamo);
                table.addCell(cellNumero);
                table.addCell(cellMonto);
                table.addCell(cellFecha);
                table.addCell(cellDias);
            }

            document.add(table);

            // Resumen
            Paragraph summary = new Paragraph("\n\nTotal de cuotas: " + cuotasProximas.size(),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12));
            document.add(summary);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    // 4. Reporte de préstamos activos
    public byte[] generarReportePrestamosActivos() {
        List<PrestamoEntity> prestamosActivos = prestamoRepo.findAll().stream()
                .filter(p -> p.getEstado() == EstadoPrestamo.ACTIVO || p.getEstado() == EstadoPrestamo.ATRASADO)
                .sorted((p1, p2) -> p1.getCliente().getNombre().compareTo(p2.getCliente().getNombre()))
                .collect(Collectors.toList());

        return generarReportePrestamos(prestamosActivos, "Préstamos Activos", 
                "Préstamos en estado ACTIVO o ATRASADO");
    }

    // 5. Reporte de préstamos atrasados
    public byte[] generarReportePrestamosAtrasados() {
        List<PrestamoEntity> prestamosAtrasados = prestamoRepo.findAll().stream()
                .filter(p -> p.getEstado() == EstadoPrestamo.ATRASADO)
                .sorted((p1, p2) -> p1.getFechaInicio().compareTo(p2.getFechaInicio()))
                .collect(Collectors.toList());

        return generarReportePrestamos(prestamosAtrasados, "Préstamos Atrasados", 
                "Préstamos con pagos vencidos");
    }

    // Método auxiliar para reportes de lista de préstamos
    private byte[] generarReportePrestamos(List<PrestamoEntity> prestamos, String titulo, String subtitulo) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            addHeader(document, titulo);
            
            if (subtitulo != null) {
                Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 12, Color.DARK_GRAY);
                Paragraph subtitle = new Paragraph(subtitulo, subtitleFont);
                subtitle.setAlignment(Element.ALIGN_CENTER);
                subtitle.setSpacingAfter(15);
                document.add(subtitle);
            }

            // Tabla de préstamos
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10);
            table.setWidths(new float[]{0.8f, 2.5f, 2f, 2f, 2f, 1.5f});

            // Encabezados
            addTableHeader(table, new String[]{"ID", "Cliente", "Monto", "Total", "Pagado", "Estado"});

            // Filas
            for (PrestamoEntity prestamo : prestamos) {
                long totalPagado = prestamo.getPagos().stream()
                        .filter(p -> p.getEstadoAprobacion() == EstadoAprobacionPago.APROBADO)
                        .mapToLong(PagoEntity::getMonto)
                        .sum();

                addTableCell(table, "#" + prestamo.getId(), false, Element.ALIGN_CENTER);
                addTableCell(table, prestamo.getCliente().getNombre(), false, Element.ALIGN_LEFT);
                addTableCell(table, formatCurrency(prestamo.getMontoPrestado()), false, Element.ALIGN_RIGHT);
                addTableCell(table, formatCurrency(prestamo.getTotalObjetivo()), false, Element.ALIGN_RIGHT);
                addTableCell(table, formatCurrency(totalPagado), false, Element.ALIGN_RIGHT);
                addTableCell(table, prestamo.getEstado().name(), false, Element.ALIGN_CENTER);
            }

            document.add(table);

            // Resumen
            long totalMontoPrestado = prestamos.stream().mapToLong(PrestamoEntity::getMontoPrestado).sum();
            long totalObjetivo = prestamos.stream().mapToLong(PrestamoEntity::getTotalObjetivo).sum();
            long totalPagado = prestamos.stream()
                    .flatMap(p -> p.getPagos().stream())
                    .filter(pago -> pago.getEstadoAprobacion() == EstadoAprobacionPago.APROBADO)
                    .mapToLong(PagoEntity::getMonto)
                    .sum();

            document.add(new Paragraph("\n"));
            addSummaryLine(document, "Total de préstamos:", String.valueOf(prestamos.size()));
            addSummaryLine(document, "Monto total prestado:", formatCurrency(totalMontoPrestado));
            addSummaryLine(document, "Total objetivo:", formatCurrency(totalObjetivo));
            addSummaryLine(document, "Total pagado:", formatCurrency(totalPagado));
            addSummaryLine(document, "Pendiente por cobrar:", formatCurrency(totalObjetivo - totalPagado));

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    // Métodos auxiliares para construcción del PDF

    private void addClienteInfo(Document document, ClienteEntity cliente) throws DocumentException {
        Paragraph section = new Paragraph("Información del Cliente", 
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.BLACK));
        section.setSpacingBefore(10);
        section.setSpacingAfter(10);
        document.add(section);

        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 11);

        document.add(new Paragraph(new Chunk("Nombre: ", labelFont)));
        document.add(new Paragraph(new Chunk(cliente.getNombre(), valueFont)));
        
        document.add(new Paragraph(new Chunk("Cédula: ", labelFont)));
        document.add(new Paragraph(new Chunk(cliente.getCedula(), valueFont)));
        
        document.add(new Paragraph(new Chunk("Teléfono: ", labelFont)));
        document.add(new Paragraph(new Chunk(cliente.getTelefono(), valueFont)));
        
        if (cliente.getUbicacion() != null && !cliente.getUbicacion().isBlank()) {
            document.add(new Paragraph(new Chunk("Ubicación: ", labelFont)));
            document.add(new Paragraph(new Chunk(cliente.getUbicacion(), valueFont)));
        }

        document.add(new Paragraph("\n"));
    }

    private void addResumenPrestamos(Document document, List<PrestamoEntity> prestamos) throws DocumentException {
        Paragraph section = new Paragraph("Resumen de Préstamos", 
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.BLACK));
        section.setSpacingBefore(10);
        section.setSpacingAfter(10);
        document.add(section);

        long totalActivos = prestamos.stream().filter(p -> p.getEstado() == EstadoPrestamo.ACTIVO).count();
        long totalPagados = prestamos.stream().filter(p -> p.getEstado() == EstadoPrestamo.PAGADO).count();
        long totalLiquidados = prestamos.stream().filter(p -> p.getEstado() == EstadoPrestamo.LIQUIDADO).count();

        document.add(new Paragraph("Total de préstamos: " + prestamos.size()));
        document.add(new Paragraph("Activos: " + totalActivos));
        document.add(new Paragraph("Pagados: " + totalPagados));
        document.add(new Paragraph("Liquidados: " + totalLiquidados));
    }

    private void addPrestamoDetalle(Document document, PrestamoEntity prestamo, boolean compact) throws DocumentException {
        Paragraph section = new Paragraph("Préstamo #" + prestamo.getId(), 
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.DARK_GRAY));
        section.setSpacingBefore(15);
        section.setSpacingAfter(10);
        document.add(section);

        // Información básica del préstamo
        document.add(new Paragraph("Monto prestado: " + formatCurrency(prestamo.getMontoPrestado())));
        document.add(new Paragraph("Total objetivo: " + formatCurrency(prestamo.getTotalObjetivo())));
        document.add(new Paragraph("Fecha inicio: " + prestamo.getFechaInicio().format(DATE_FORMATTER)));
        document.add(new Paragraph("Estado: " + prestamo.getEstado().name()));
        document.add(new Paragraph("Tipo acuerdo: " + prestamo.getTipoAcuerdo().name()));
        document.add(new Paragraph("\n"));

        if (!compact) {
            // Tabla de cuotas
            addCuotasTable(document, prestamo.getCuotas());

            // Tabla de pagos
            addPagosTable(document, prestamo.getPagos());
        }
    }

    private void addCuotasTable(Document document, List<CuotaEntity> cuotas) throws DocumentException {
        if (cuotas.isEmpty()) return;

        Paragraph title = new Paragraph("Cuotas", 
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12));
        title.setSpacingBefore(10);
        title.setSpacingAfter(5);
        document.add(title);

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1f, 2f, 2f, 2f, 1.5f});

        addTableHeader(table, new String[]{"#", "Monto", "Cancelado", "Vencimiento", "Estado"});

        for (CuotaEntity cuota : cuotas.stream()
                .sorted((c1, c2) -> Integer.compare(c1.getNumeroCuota(), c2.getNumeroCuota()))
                .collect(Collectors.toList())) {
            
            addTableCell(table, String.valueOf(cuota.getNumeroCuota()), false, Element.ALIGN_CENTER);
            addTableCell(table, formatCurrency(cuota.getMontoObjetivo()), false, Element.ALIGN_RIGHT);
            addTableCell(table, formatCurrency(cuota.getMontoCancelado()), false, Element.ALIGN_RIGHT);
            addTableCell(table, cuota.getFechaVencimiento().format(DATE_FORMATTER), false, Element.ALIGN_CENTER);
            addTableCell(table, cuota.getEstado().name(), false, Element.ALIGN_CENTER);
        }

        document.add(table);
        document.add(new Paragraph("\n"));
    }

    private void addPagosTable(Document document, List<PagoEntity> pagos) throws DocumentException {
        if (pagos.isEmpty()) return;

        Paragraph title = new Paragraph("Pagos", 
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12));
        title.setSpacingBefore(10);
        title.setSpacingAfter(5);
        document.add(title);

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2f, 2f, 2f, 3f});

        addTableHeader(table, new String[]{"Fecha", "Monto", "Estado", "Notas"});

        for (PagoEntity pago : pagos.stream()
                .sorted((p1, p2) -> p1.getFechaPago().compareTo(p2.getFechaPago()))
                .collect(Collectors.toList())) {
            
            addTableCell(table, pago.getFechaPago().format(DATE_FORMATTER), false, Element.ALIGN_CENTER);
            addTableCell(table, formatCurrency(pago.getMonto()), false, Element.ALIGN_RIGHT);
            addTableCell(table, pago.getEstadoAprobacion().name(), false, Element.ALIGN_CENTER);
            addTableCell(table, pago.getNotas() != null ? pago.getNotas() : "", false, Element.ALIGN_LEFT);
        }

        document.add(table);
        document.add(new Paragraph("\n"));
    }

    private void addTableHeader(PdfPTable table, String[] headers) {
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setBackgroundColor(new Color(52, 73, 94));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(8);
            table.addCell(cell);
        }
    }

    private void addTableCell(PdfPTable table, String text, boolean bold, int alignment) {
        Font font = getFont(bold);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(5);
        table.addCell(cell);
    }

    private Font getFont(boolean bold) {
        return bold 
            ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)
            : FontFactory.getFont(FontFactory.HELVETICA, 10);
    }

    private void addSummaryLine(Document document, String label, String value) throws DocumentException {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 11);
        
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + " ", labelFont));
        p.add(new Chunk(value, valueFont));
        document.add(p);
    }
}
