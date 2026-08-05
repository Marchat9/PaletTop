CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE palet_type AS ENUM ('laiton/plomb', 'fonte/plomb', 'fonte/bois', 'acier/terre');
CREATE TYPE tournament_format AS ENUM ('qualification_finals', 'up_down', 'swiss_system');
CREATE TYPE score_calculation AS ENUM ('score', 'tournament_score');
CREATE TYPE victory_condition AS ENUM ('score_reach', 'score_plus_2');
CREATE TYPE arbitrage_type AS ENUM ('auto', 'manual');

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  admin_password VARCHAR(120) NOT NULL,
  code VARCHAR(12) NOT NULL UNIQUE,
  date TIMESTAMPTZ NOT NULL,
  description TEXT,
  palet palet_type NOT NULL,
  max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
  format tournament_format NOT NULL,
  score_calculation score_calculation NOT NULL,
  victory_condition victory_condition NOT NULL,
  logistic JSONB NOT NULL DEFAULT '{"matchAgainstSameClub": false, "gestionConsolantes": false}'::jsonb,
  rest_time_minutes INTEGER CHECK (rest_time_minutes IS NULL OR rest_time_minutes >= 0),
  arbitrage arbitrage_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
