-- Migración para agregar campo estado_aprobacion a la tabla pagos
-- Paso 1: Agregar columna como nullable
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS estado_aprobacion VARCHAR(255);

-- Paso 2: Actualizar registros existentes con valor por defecto
UPDATE pagos SET estado_aprobacion = 'APROBADO' WHERE estado_aprobacion IS NULL;

-- Paso 3: Hacer la columna NOT NULL
ALTER TABLE pagos ALTER COLUMN estado_aprobacion SET NOT NULL;

-- Paso 4: Agregar constraint de check
ALTER TABLE pagos ADD CONSTRAINT check_estado_aprobacion CHECK (estado_aprobacion IN ('APROBADO', 'EN_ESPERA'));
