package com.proyect.CashSpring.application.service;

import com.proyect.CashSpring.infrastructure.persistence.jpa.ClienteJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.CuotaJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PagoJpaRepository;
import com.proyect.CashSpring.infrastructure.persistence.jpa.PrestamoJpaRepository;
import com.proyect.CashSpring.web.dto.dashboard.DashboardSummaryResponse;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final ClienteJpaRepository clienteRepo;
    private final PrestamoJpaRepository prestamoRepo;
    private final CuotaJpaRepository cuotaRepo;
    private final PagoJpaRepository pagoRepo;

    public DashboardService(
            ClienteJpaRepository clienteRepo,
            PrestamoJpaRepository prestamoRepo,
            CuotaJpaRepository cuotaRepo,
            PagoJpaRepository pagoRepo
    ) {
        this.clienteRepo = clienteRepo;
        this.prestamoRepo = prestamoRepo;
        this.cuotaRepo = cuotaRepo;
        this.pagoRepo = pagoRepo;
    }

    public DashboardSummaryResponse getSummary() {
        return new DashboardSummaryResponse(
                clienteRepo.countActivos(),
                prestamoRepo.countActivos(),
                cuotaRepo.countPendientes(),
                cuotaRepo.countVencidasHoy(),
                cuotaRepo.sumTotalPorCobrar(),
                pagoRepo.sumTotalRecaudado()
        );
    }
}