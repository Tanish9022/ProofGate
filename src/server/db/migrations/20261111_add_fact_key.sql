-- Migration: Add fact_key to sources table
ALTER TABLE sources ADD COLUMN IF NOT EXISTS fact_key text;
