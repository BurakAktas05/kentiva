-- V57__add_survey_category.sql
ALTER TABLE municipality_surveys ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'Genel';
