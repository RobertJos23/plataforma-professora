# 🎓 Plataforma da Professora

> Site completo, moderno e inteligente para professora de inglês — vitrine profissional, área do aluno, painel admin, automações com N8N e IA com Claude/GPT-4o.

---

## 🗂️ Estrutura do Projeto

```
plataforma-professora/
├── frontend/          # Next.js 14 + TypeScript + Tailwind CSS
├── backend/           # Python FastAPI + PostgreSQL
├── automations/       # N8N workflows (JSON)
├── infra/             # AWS com Terraform (IaC)
├── docs/              # Documentação técnica
└── .github/           # CI/CD com GitHub Actions
```

---

## 🚀 Stack Tecnológica

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Frontend      | Next.js 14, TypeScript, Tailwind CSS |
| Backend       | Python 3.12, FastAPI, SQLAlchemy    |
| Banco de dados| PostgreSQL 16 (AWS RDS)             |
| Autenticação  | JWT + OAuth2                        |
| Armazenamento | AWS S3 + CloudFront CDN             |
| E-mail        | AWS SES                             |
| Automações    | N8N (self-hosted em EC2)            |
| IA            | Claude API (Anthropic) / GPT-4o     |
| Pagamentos    | Stripe / Pagar.me                   |
| Infra         | AWS (EC2, RDS, S3, CloudFront, SES) |
| IaC           | Terraform                           |
| CI/CD         | GitHub Actions                      |

---

## 📦 Módulos

### 🌐 Parte 1 — Vitrine / Landing Page
- Hero com frase de impacto + foto + CTA
- Sobre a professora (trajetória, certificações)
- Planos e valores (cards)
- Depoimentos de alunos
- FAQ
- Contato / WhatsApp / Formulário
- Rodapé com redes sociais
- Mobile-first + responsivo

### 👩‍🎓 Parte 2 — Área do Aluno
- Login / Cadastro seguro (JWT)
- Dashboard com progresso
- Perfil (nível A1→C2, objetivo, horário)
- Agendamento de aulas (calendário)
- Materiais por nível (PDFs, áudios, vídeos)
- Exercícios com correção automática
- Histórico de aulas
- Notificações (lembrete de aula, novos materiais)
- Gamificação (badges, conquistas, ranking)

### 👩‍🏫 Parte 3 — Painel da Professora (Admin)
- Dashboard (alunos ativos, aulas da semana, receita)
- Gestão de alunos (adicionar, editar, desativar)
- Gestão de agenda (bloqueios, visualização)
- Upload de materiais por nível
- Criação e edição de exercícios/quizzes
- Relatório financeiro (recebidos, pendentes)
- Envio de comunicados

### 🏗️ Parte 4 — Infraestrutura AWS
- EC2 / Elastic Beanstalk para o backend
- RDS PostgreSQL com backup automático
- S3 para arquivos
- CloudFront CDN
- Route 53 (domínio)
- SES (e-mails)
- CloudWatch (monitoramento + alertas de custo)
- Staging e Production separados

### 🐍 Parte 5 — Backend Python (FastAPI)
- Models: users, lessons, materials, exercises, payments, progress
- Autenticação JWT
- Sistema de roles (aluno / professora)
- CRUD completo
- Testes com pytest
- CI/CD com GitHub Actions
- Documentação automática (Swagger)

### ⚙️ Parte 6 — Automações N8N
- Lembrete de aula (WhatsApp/e-mail 24h antes)
- Confirmação de agendamento
- Cobrança recorrente
- Onboarding do aluno (sequência de e-mails)
- Relatório semanal para a professora
- Follow-up de leads
- Integração Google Calendar
- Post automático nas redes sociais

### 🤖 Parte 7 — Inteligência Artificial
- Corretor de redação com feedback detalhado
- Chatbot de dúvidas 24/7
- Gerador de exercícios personalizados por nível
- Análise de pronúncia (áudio → nota + feedback)
- Resumo automático de aulas (transcrição + pontos-chave)
- Recomendação de próximos conteúdos
- Simulador de conversação em inglês

### 🔩 Parte 8 — Hard Code (lógica fixa)
- Teste de nivelamento com cálculo de pontuação
- Controle de frequência (% de presença)
- Bloqueio automático por inadimplência
- Limite de agendamentos por plano
- Histórico imutável de pagamentos
- Expiração de materiais gratuitos
- Fuso horário automático por localização
- Cálculo de carga horária concluída

### 💡 Extras / Bônus
- Plano de assinatura (Stripe / Pagar.me)
- Programa de indicação (desconto por indicação)
- Certificado digital automático
- Blog com geração de posts via IA + SEO
- Isca digital (e-book gratuito)
- Modo escuro
- Aula experimental gratuita (sem login)
- Integração Zoom / Google Meet

---

## 🛠️ Setup Local (Desenvolvimento)

### Pré-requisitos
- Docker + Docker Compose
- Node.js 20+
- Python 3.12+
- Make

### Iniciar ambiente local
```bash
# 1. Clonar o repositório
git clone https://github.com/seu-usuario/plataforma-professora.git
cd plataforma-professora

# 2. Copiar variáveis de ambiente
cp backend/.env.example backend/.env

# 3. Subir todos os serviços
make dev

# 4. Acessar
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
# API Docs:  http://localhost:8000/docs
# N8N:       http://localhost:5678
# PgAdmin:   http://localhost:5050
```

---

## 📋 Comandos Úteis (Makefile)

```bash
make dev          # Sobe ambiente completo (Docker Compose)
make backend      # Sobe apenas o backend
make frontend     # Sobe apenas o frontend
make migrate      # Roda migrações do banco
make test         # Roda todos os testes
make lint         # Lint no backend e frontend
make build        # Build de produção
make deploy-stg   # Deploy no ambiente de staging
make deploy-prod  # Deploy em produção
```

---

## 🗄️ Schema do Banco

Veja [docs/database-schema.md](docs/database-schema.md) para o schema completo.

## 🏛️ Arquitetura

Veja [docs/architecture.md](docs/architecture.md) para diagramas e decisões técnicas.

## 📡 API

Veja [docs/api.md](docs/api.md) ou acesse `/docs` com o backend rodando.

---

## 👥 Time

- **Professora**: Proprietária e usuária principal
- **Dev**: Desenvolvimento e manutenção da plataforma

---

*Construído com ❤️ para transformar o ensino de inglês.*
