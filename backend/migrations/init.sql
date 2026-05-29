-- Inicialização do banco de dados da Plataforma Professora
-- Este script é executado automaticamente pelo Docker na primeira inicialização

-- Criar banco de dados para o N8N (separado do principal)
CREATE DATABASE n8n
    WITH
    OWNER = plataforma
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TEMPLATE = template0;

-- Extensões úteis no banco principal
\c plataforma_dev;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- busca fuzzy

-- Nota: As tabelas são criadas pelo SQLAlchemy via create_tables() no startup (ambiente dev)
-- ou pelo Alembic (ambiente de produção)
