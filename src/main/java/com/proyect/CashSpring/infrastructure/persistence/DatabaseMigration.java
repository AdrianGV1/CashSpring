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
    public void runMigrations() {
        migratePagosEstadoAprobacion();
        migratePrestamoEstadoCheckConstraint();
    }

    private void migratePagosEstadoAprobacion() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = 'pagos' AND column_name = 'estado_aprobacion'",
                Integer.class
            );
            if (count != null && count > 0) {
                jdbcTemplate.execute(
                    "UPDATE pagos SET estado_aprobacion = 'APROBADO' WHERE estado_aprobacion IS NULL"
                );
                System.out.println("✅ Migración completada: registros de pagos actualizados con estado_aprobacion = 'APROBADO'");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Error en migración de estado_aprobacion: " + e.getMessage());
        }
    }

    /**
     * Asegura que el check constraint de prestamos.estado incluya 'LIQUIDADO'.
     * Si la restricción existente no lo incluye, la recrea con todos los valores válidos.
     */
    private void migratePrestamoEstadoCheckConstraint() {
        try {
            // Verificar si la restricción actual ya incluye LIQUIDADO
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.check_constraints " +
                "WHERE constraint_name = 'prestamos_estado_check' " +
                "AND check_clause LIKE '%LIQUIDADO%'",
                Integer.class
            );
            if (count == null || count == 0) {
                // Eliminar la restricción antigua y recrearla incluyendo LIQUIDADO
                jdbcTemplate.execute(
                    "ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS prestamos_estado_check"
                );
                jdbcTemplate.execute(
                    "ALTER TABLE prestamos ADD CONSTRAINT prestamos_estado_check " +
                    "CHECK (estado IN ('ACTIVO', 'ATRASADO', 'PAGADO', 'LIQUIDADO'))"
                );
                System.out.println("✅ Migración completada: restricción prestamos_estado_check actualizada con LIQUIDADO");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Error en migración de prestamos_estado_check: " + e.getMessage());
        }
    }
}
