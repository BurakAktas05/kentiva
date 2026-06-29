-- V99__remove_bus_transit.sql
-- Ulaşım modülü ve ilgili tabloların kaldırılması

DROP TABLE IF EXISTS starred_stops CASCADE;
DROP TABLE IF EXISTS starred_routes CASCADE;
DROP TABLE IF EXISTS bus_routes CASCADE;
