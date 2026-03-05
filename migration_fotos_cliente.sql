-- Migration: Add photo/document URL fields and ordenPatronal to clientes table
ALTER TABLE clientes
ADD COLUMN orden_patronal VARCHAR(300),
ADD COLUMN foto_orden_patronal VARCHAR(1000),
ADD COLUMN foto_cedula_frente VARCHAR(1000),
ADD COLUMN foto_cedula_detras VARCHAR(1000),
ADD COLUMN foto_ubicacion VARCHAR(1000),
ADD COLUMN foto_ubicacion_extra VARCHAR(1000);
