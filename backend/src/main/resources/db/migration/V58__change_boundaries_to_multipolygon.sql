-- V58__change_boundaries_to_multipolygon.sql
-- Alter municipalities boundaries type to MultiPolygon to support multi-part geometries (e.g. islands, exclaves)

-- 1. Alter the column type using ST_Multi to cast existing Polygon data
ALTER TABLE municipalities
    ALTER COLUMN boundaries TYPE geometry(MultiPolygon, 4326) USING ST_Multi(boundaries);
