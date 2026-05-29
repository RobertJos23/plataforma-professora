.PHONY: help dev down backend frontend migrate migrate-rollback test lint build deploy-stg deploy-prod logs clean seed

# Cores
BOLD := $(shell tput bold)
GREEN := $(shell tput setaf 2)
CYAN := $(shell tput setaf 6)
RESET := $(shell tput sgr0)

help: ## Mostra esta ajuda
	@echo "$(BOLD)Plataforma Professora — Comandos$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'

# ─── Ambiente ──────────────────────────────────────────────

dev: ## Sobe ambiente completo (Docker Compose)
	docker compose up --build

dev-bg: ## Sobe ambiente em background
	docker compose up --build -d

down: ## Para todos os serviços
	docker compose down

down-clean: ## Para serviços e remove volumes
	docker compose down -v

logs: ## Ver logs de todos os serviços
	docker compose logs -f

logs-backend: ## Ver logs do backend
	docker compose logs -f backend

logs-frontend: ## Ver logs do frontend
	docker compose logs -f frontend

# ─── Backend ───────────────────────────────────────────────

backend: ## Sobe apenas o backend
	docker compose up postgres redis backend --build

backend-shell: ## Abre shell no container do backend
	docker compose exec backend bash

backend-install: ## Instala dependências do backend
	cd backend && pip install -r requirements-dev.txt

# ─── Frontend ──────────────────────────────────────────────

frontend: ## Sobe apenas o frontend
	docker compose up frontend --build

frontend-shell: ## Abre shell no container do frontend
	docker compose exec frontend sh

frontend-install: ## Instala dependências do frontend
	cd frontend && npm install

# ─── Banco de Dados ────────────────────────────────────────

migrate: ## Roda migrações pendentes
	docker compose exec backend alembic upgrade head

migrate-rollback: ## Desfaz última migração
	docker compose exec backend alembic downgrade -1

migrate-create: ## Cria nova migração (usar: make migrate-create MSG="descricao")
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

db-shell: ## Abre psql no banco
	docker compose exec postgres psql -U plataforma -d plataforma_dev

seed: ## Popula banco com dados de teste
	docker compose exec backend python -m app.scripts.seed

# ─── Testes ────────────────────────────────────────────────

test: ## Roda todos os testes
	docker compose exec backend pytest tests/ -v

test-unit: ## Roda apenas testes unitários
	docker compose exec backend pytest tests/unit/ -v

test-integration: ## Roda testes de integração
	docker compose exec backend pytest tests/integration/ -v

test-coverage: ## Roda testes com cobertura
	docker compose exec backend pytest tests/ --cov=app --cov-report=html

test-frontend: ## Roda testes do frontend
	docker compose exec frontend npm test

# ─── Qualidade de Código ───────────────────────────────────

lint: ## Lint em todo o projeto
	@make lint-backend
	@make lint-frontend

lint-backend: ## Lint no backend (ruff + mypy)
	docker compose exec backend ruff check app/
	docker compose exec backend mypy app/

lint-frontend: ## Lint no frontend (eslint + prettier)
	docker compose exec frontend npm run lint
	docker compose exec frontend npm run format:check

format: ## Formata código
	docker compose exec backend ruff format app/
	docker compose exec frontend npm run format

# ─── Build ─────────────────────────────────────────────────

build: ## Build de produção
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

build-backend: ## Build apenas do backend
	docker build -t plataforma-backend:latest ./backend

build-frontend: ## Build apenas do frontend
	docker build -t plataforma-frontend:latest ./frontend

# ─── Deploy ────────────────────────────────────────────────

deploy-stg: ## Deploy no ambiente de staging
	@echo "$(GREEN)Deployando em staging...$(RESET)"
	cd infra/environments/staging && terraform apply -auto-approve

deploy-prod: ## Deploy em produção (requer confirmação)
	@echo "$(BOLD)⚠️  Deploy em PRODUÇÃO. Tem certeza? [y/N]$(RESET)" && read ans && [ $${ans:-N} = y ]
	cd infra/environments/production && terraform apply

# ─── Infra ─────────────────────────────────────────────────

infra-init: ## Inicializa Terraform
	cd infra && terraform init

infra-plan: ## Plano de mudanças de infra
	cd infra/environments/staging && terraform plan

infra-destroy-stg: ## Destrói ambiente de staging
	cd infra/environments/staging && terraform destroy

# ─── Utilitários ───────────────────────────────────────────

clean: ## Remove containers, imagens e volumes não usados
	docker system prune -f

setup: ## Setup inicial do projeto
	@echo "$(GREEN)Configurando projeto...$(RESET)"
	cp -n backend/.env.example backend/.env || true
	cd frontend && npm install
	cd backend && pip install -r requirements-dev.txt
	@echo "$(GREEN)✅ Pronto! Rode 'make dev' para iniciar$(RESET)"
