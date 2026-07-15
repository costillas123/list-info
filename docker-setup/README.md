# Docker setup — Laravel

Containerized version of the same stack as `nginx-laravel-setup/laravel-nginx-setup.md`. This file covers **local development**. For running the same containers on an AWS EC2 instance against your real RDS database, see [`ec2-deploy.md`](ec2-deploy.md) instead.

Six services here: `app` (PHP-FPM), `nginx`, `mysql`, `redis`, `node` (Vite dev server), and `queue` (worker). Run this from the project root — `docker-compose.yml` expects to sit inside `docker-setup/` with the Laravel app one level up (`../`).

## Layout

```
.dockerignore                one level up, at the project root — see note below
docker-setup/
├── Dockerfile              multi-stage build: composer install, then a slim php-fpm-alpine image
├── docker-compose.yml      app, nginx, mysql, redis, node, queue
├── docker-compose.prod.yml EC2 + RDS variant — see ec2-deploy.md
├── ec2-deploy.md           deploying this same setup to AWS EC2 + RDS
├── .env.docker.example     copy to ../.env — uses Docker service names as hosts
├── .env.ec2.example        copy to ../.env on EC2 — points at your real RDS endpoint
├── nginx/
│   └── default.conf        talks to php-fpm over the "app" service name, not a unix socket
└── php/
    └── local.ini           upload size, memory, opcache overrides
```

> **Why `.dockerignore` isn't inside `docker-setup/`**: both compose files set `context: ..`, so Docker looks for `.dockerignore` in the project root (one level up from this folder), not next to the `Dockerfile`. It needs to live as a sibling of `docker-setup/`, not inside it.

## Quick start

```bash
# from the project root, next to this docker-setup/ folder
cp docker-setup/.env.docker.example .env

docker compose -f docker-setup/docker-compose.yml build
docker compose -f docker-setup/docker-compose.yml up -d

docker compose -f docker-setup/docker-compose.yml exec app php artisan key:generate
docker compose -f docker-setup/docker-compose.yml exec app php artisan migrate
```

Visit the app at **http://localhost:8080** and the Vite dev server at **http://localhost:5173** — this is the same "run `npm run dev` and view it on the web" step from the bare-metal guide, but the port is already published through Docker instead of needing `--host 0.0.0.0` plus a manual firewall rule.

## Everyday commands

```bash
docker compose -f docker-setup/docker-compose.yml logs -f app       # tail app logs
docker compose -f docker-setup/docker-compose.yml exec app sh       # shell into the app container
docker compose -f docker-setup/docker-compose.yml exec app composer install
docker compose -f docker-setup/docker-compose.yml exec app php artisan migrate:fresh --seed
docker compose -f docker-setup/docker-compose.yml down              # stop everything
docker compose -f docker-setup/docker-compose.yml down -v           # stop and wipe the DB volume
```

Tip: `alias dc="docker compose -f docker-setup/docker-compose.yml"` in your shell profile turns the above into `dc up -d`, `dc exec app sh`, etc.

## Why these choices

- **Multi-stage `Dockerfile`** — Composer and its cache never end up in the final image; the runtime stage is just PHP-FPM + the built app.
- **`nginx` talks to `app:9000`, not a socket** — in bare-metal Nginx and PHP-FPM share a filesystem, so a unix socket works. Across containers they don't, so this uses Docker's internal DNS (the service name) over TCP instead.
- **`mysql` is published on host port `3307`**, not `3306` — so it won't collide if you also have a native MySQL install running from the bare-metal guide.
- **`redis` backs cache/session/queue** — swapping `file`/`sync` drivers for `redis` in `.env.docker.example` is close to zero extra work and matches a more production-like setup.
- **`queue` is a second container built from the same image**, just with a different `command:` — the standard way to run `php artisan queue:work` alongside the web process without baking a process manager into the image.

## Suggestions / things to add if you need them

- **Adminer** for a quick DB UI — add one service block:
  ```yaml
  adminer:
    image: adminer
    ports:
      - "8081:8080"
  ```
- **Don't run `queue` and `node` in production** — they're dev/worker conveniences. A production compose file (or Kubernetes manifests) would drop `node` entirely (assets get built once, in CI) and run `queue` under a real process supervisor with restarts and multiple workers.
- **Healthchecks on `app` and `nginx`** — only `mysql` has one right now; add `curl`-based healthchecks to the others if you want `docker compose ps` to reflect real readiness.
- **Named `.env` per environment** (`.env.docker`, `.env.staging`) instead of one shared `.env` — avoids accidentally starting the containers against bare-metal-style hosts (`127.0.0.1`) left over from `support/envsample.md`.
- **Pin image versions** (`php:8.2.18-fpm-alpine` instead of `php:8.2-fpm-alpine`) once this stabilizes, so a base-image update doesn't change behavior under you without warning.
- **Secrets** — `.env.docker.example` uses placeholder passwords like the rest of this repo. Generate real ones before this touches anything beyond localhost, and never commit the real `.env`.
