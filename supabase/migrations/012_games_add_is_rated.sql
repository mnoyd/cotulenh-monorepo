-- Migration: 012_games_add_is_rated
-- Adds is_rated column to games table (required by existing getGame action)

ALTER TABLE public.games ADD COLUMN is_rated boolean NOT NULL DEFAULT false;
