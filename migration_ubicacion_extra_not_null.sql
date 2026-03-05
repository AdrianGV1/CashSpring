-- Migration: Make ubicacion_extra NOT NULL
-- Step 1: Fill existing NULL values with a placeholder before adding the constraint
UPDATE clientes
SET ubicacion_extra = 'Sin información'
WHERE ubicacion_extra IS NULL;

-- Step 2: Alter column to NOT NULL
ALTER TABLE clientes
ALTER COLUMN ubicacion_extra SET NOT NULL;
