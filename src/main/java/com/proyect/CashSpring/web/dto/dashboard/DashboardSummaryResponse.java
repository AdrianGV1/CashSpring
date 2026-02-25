package com.proyect.CashSpring.web.dto.dashboard;

public record DashboardSummaryResponse(
        long clientesActivos,
        long prestamosActivos,
        long cuotasPendientes,
        long cuotasVencidas,
        long totalPorCobrar,
        long totalRecaudado
) {}