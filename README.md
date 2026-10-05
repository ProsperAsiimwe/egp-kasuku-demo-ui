# EGP 2.0 KASUKU demo UI

React + Vite shell that mimics ACMIS **MY APPLICATIONS** tiles and the terp-ui Kasuku bubble. It talks only to `egp-mlops-microservice`. The tiles are the EGP Reports landing tabs (System Administration is hidden). Opening a tile loads that tab's warehouse cards through a Metabase static-embed GET, then reveals the Kasuku FAB.

| | |
| --- | --- |
| UI | [http://127.0.0.1:5173](http://127.0.0.1:5173) |
| Proxies to | `http://127.0.0.1:8002` |

## Before you start this UI

1. Postgres + Redis + `make db-migrate` in `egp-mlops-microservice`
2. `KASUKU_DEMO_MODE=true` in that `.env`
3. Metabase embed defaults (already the `embed_token_example.py` values): dashboard `251`, role `pde-accounting-officer`, FY `2026-2027`, TTL 120 minutes
4. `METABASE_URL` and `METABASE_EMBEDDING_SECRET_KEY` in the MLOPS `.env` if you want live scalars. If Metabase is down, the tab still opens with its catalog
5. `make run-dev` in `egp-mlops-microservice`
6. Inference running (`make start` / `make start-metal` / `make start-cuda`) if you want live Kasuku answers

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

`.env` is gitignored. It only holds the Vite host, port, and MLOPS proxy origin. Keep Metabase and staff JWT secrets in `egp-mlops-microservice/.env`.

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

1. `POST /egp-mlops-microservice/v1/demo/session` issues a local demo JWT
2. `GET /egp-mlops-microservice/v1/demo/apps` lists the 13 landing tabs
3. Click a tile → `GET /egp-mlops-microservice/v1/demo/apps/{slug}/data` mints the embed JWT server-side and GETs that tab's cards
4. The Kasuku logo bubble appears only inside an opened app and chats at `/copilot/{slug}/chat`

The health pill is green only when `/health/ready` is ok (Postgres, Redis, and the LLM gateway).
