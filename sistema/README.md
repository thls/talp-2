# Sistema (Frontend + Backend)

Scaffold inicial fullstack com:

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Fastify + TypeScript
- Testes: Vitest em ambos os serviços
- Docker: `docker compose` para subir toda a aplicação

## Estrutura

```text
sistema/
  frontend/
  backend/
  docker-compose.yml
  package.json
```

## Pré-requisitos

Para rodar localmente sem Docker:

- Node.js 22+
- npm 10+

Para rodar com Docker:

- Docker + Docker Compose

## Rodar com Docker (recomendado)

Na pasta `sistema`:

```bash
docker compose up --build
```

Serviços:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000/health`

Para parar:

```bash
docker compose down
```

## Rodar localmente (sem Docker)

Na pasta `sistema`:

```bash
npm install
npm run dev
```

## Testes

Todos os testes (monorepo):

```bash
npm test
```

Apenas frontend:

```bash
npm run test -w frontend
```

Apenas backend:

```bash
npm run test -w backend
```
