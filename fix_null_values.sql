-- Script para arreglar valores NULL en registros existentes
-- Ejecutar ANTES de reiniciar la aplicación

-- Actualizar registros existentes con valores por defecto
UPDATE prestamo SET penalizacion_pausada = FALSE WHERE penalizacion_pausada IS NULL;
UPDATE prestamo SET penalizacion_negociada = FALSE WHERE penalizacion_negociada IS NULL;

-- Verificar que se actualizaron correctamente
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN penalizacion_pausada IS NULL THEN 1 END) as nulls_pausada,
    COUNT(CASE WHEN penalizacion_negociada IS NULL THEN 1 END) as nulls_negociada
FROM prestamo;

-- Si el resultado muestra 0 en nulls_pausada y nulls_negociada, ¡todo está correcto!
