-- Migración: Añadir columna numero_extensiones a la tabla prestamos
-- Permite rastrear cuántas veces ha sido extendido un préstamo QUINCENAS_DOBLES

ALTER TABLE prestamos
    ADD COLUMN IF NOT EXISTS numero_extensiones INT NOT NULL DEFAULT 0;

-- Inicializar el contador para préstamos que ya fueron extendidos previamente
UPDATE prestamos
SET numero_extensiones = 1
WHERE es_extendido = TRUE AND numero_extensiones = 0;
