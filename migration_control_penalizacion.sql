-- Migración: Agregar campos de control de penalización
-- Fecha: 2024
-- Descripción: Agrega 5 campos para permitir pausar y negociar la penalización de préstamos

-- Agregar columnas a la tabla prestamo (permitiendo NULL temporalmente)
ALTER TABLE prestamo ADD COLUMN IF NOT EXISTS penalizacion_pausada BOOLEAN;
ALTER TABLE prestamo ADD COLUMN IF NOT EXISTS fecha_pausa_penalizacion DATE;
ALTER TABLE prestamo ADD COLUMN IF NOT EXISTS penalizacion_negociada BOOLEAN;
ALTER TABLE prestamo ADD COLUMN IF NOT EXISTS monto_negociado BIGINT;
ALTER TABLE prestamo ADD COLUMN IF NOT EXISTS fecha_negociacion DATE;

-- Establecer valores por defecto para registros existentes
UPDATE prestamo SET penalizacion_pausada = FALSE WHERE penalizacion_pausada IS NULL;
UPDATE prestamo SET penalizacion_negociada = FALSE WHERE penalizacion_negociada IS NULL;

-- Comentarios descriptivos en las columnas
COMMENT ON COLUMN prestamo.penalizacion_pausada IS 'Indica si la penalización está pausada (congelada). Se desactiva automáticamente al pagar una cuota atrasada.';
COMMENT ON COLUMN prestamo.fecha_pausa_penalizacion IS 'Fecha en que se pausó la penalización';
COMMENT ON COLUMN prestamo.penalizacion_negociada IS 'Indica si la penalización tiene un monto negociado fijo';
COMMENT ON COLUMN prestamo.monto_negociado IS 'Monto fijo acordado para la penalización (en colones)';
COMMENT ON COLUMN prestamo.fecha_negociacion IS 'Fecha en que se negoció el monto fijo de penalización';

-- Verificar datos existentes
SELECT 
    COUNT(*) as total_prestamos,
    COUNT(CASE WHEN penalizacion_acumulada > 0 THEN 1 END) as con_penalizacion
FROM prestamo;

-- Mostrar mensaje de éxito
SELECT 'Migración completada exitosamente. Se agregaron 5 campos de control de penalización.' as resultado;
