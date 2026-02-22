package com.proyect.CashSpring.infrastructure.persistence;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigration {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void migratePagosEstadoAprobacion() {
        try {
            // Verificar si la columna ya existe y tiene constraint
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'pagos' AND column_name = 'estado_aprobacion'",
                Integer.class
            );

            if (count != null && count > 0) {
                // La columna ya existe, actualizar registros NULL
                jdbcTemplate.execute(
                    "UPDATE pagos SET estado_aprobacion = 'APROBADO' WHERE estado_aprobacion IS NULL"
                );
                System.out.println("✅ Migración completada: registros de pagos actualizados con estado_aprobacion = 'APROBADO'");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Error en migración de estado_aprobacion: " + e.getMessage());
        }
    }
}
