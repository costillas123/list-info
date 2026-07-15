# Deploying the Docker setup to AWS EC2 + RDS

Same containers as `README.md`, but running on a real Ubuntu EC2 instance against your existing RDS database instead of a local `mysql` container — the Docker equivalent of `nginx-laravel-setup/laravel-nginx-setup.md`.

## 1. Update the system

```bash
sudo apt update
sudo apt upgrade -y
```

## 2. Install Docker Engine + Compose plugin

```bash
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -sc) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
sudo systemctl enable --now docker
```

Log out and back in (or run `newgrp docker`) so your user picks up the `docker` group without needing `sudo` on every command.

## 3. Clone the app

```bash
cd /var/www
sudo mkdir -p my-app && sudo chown -R $USER:$USER my-app
cd my-app
git clone https://github.com/username/repository.git .
```

## 4. Point the app at your existing RDS database

```bash
cp docker-setup/.env.ec2.example .env
nano .env
```

Fill in the real RDS endpoint, DB credentials, and `APP_URL`. This is the same database from `phpscript.md` / the `mysql -h db-delete-leter....rds.amazonaws.com` connection step — nothing new to provision, just pointed at from inside a container instead of directly from the host.

## 5. Build and start the containers

```bash
docker compose -f docker-setup/docker-compose.prod.yml build
docker compose -f docker-setup/docker-compose.prod.yml up -d
```

This starts `app`, `nginx`, `redis`, and `queue` — no `mysql` or `node` service, unlike the local dev compose file.

## 6. Generate the app key and run migrations

```bash
docker compose -f docker-setup/docker-compose.prod.yml exec app php artisan key:generate
docker compose -f docker-setup/docker-compose.prod.yml exec app php artisan migrate --force
```

## 7. Open the security groups

- **EC2 instance security group** — inbound TCP `80` (and `443` once TLS is set up) from `0.0.0.0/0`; keep SSH (`22`) restricted to your IP only.
- **RDS security group** — inbound TCP `3306` from the *EC2 instance's security group*, not from the open internet. If step 4 can't reach the database, this is almost always why.

## 8. Build front-end assets for production

Don't run the Vite dev server (the `node` service) in production — that was only for local development. Build the assets once instead:

```bash
docker run --rm -v "$PWD":/var/www/html -w /var/www/html node:20-alpine \
  sh -c "npm ci && npm run build"
```

Nginx serves the resulting `public/build` directory directly; no extra container needed for it.

## 9. (Optional) TLS

Two reasonable options, roughly in order of effort:

- Put an **Application Load Balancer** or **CloudFront** in front of the instance with an ACM certificate, and let it terminate TLS — Nginx keeps serving plain HTTP behind it. No certs to manage on the box.
- Run **certbot** directly on the EC2 host (outside the containers, since Nginx is inside one) to get a Let's Encrypt cert, mount it into the `nginx` service, and uncomment the `443:443` line in `docker-compose.prod.yml`.

## Suggestions

- **Secrets**: move the RDS password out of the plaintext `.env` on disk once this is more than a personal project — AWS Secrets Manager or SSM Parameter Store, pulled in at container start.
- **Reboots**: `restart: unless-stopped` handles container restarts, but only if the Docker daemon itself comes back up — `sudo systemctl enable docker` (done in step 2) covers that.
- **Logs**: `docker compose logs -f app` is fine for now; a CloudWatch agent (or the `awslogs` Docker logging driver) is the next step if you need log retention beyond the instance's disk.
- **Zero-downtime deploys**: `docker compose up -d --build` briefly drops the `app` container. For real zero-downtime you'd want two `app` containers behind Nginx (or an ALB with health checks) so one keeps serving while the other rebuilds.
