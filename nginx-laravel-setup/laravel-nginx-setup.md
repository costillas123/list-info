# Laravel Nginx Setup — Ubuntu, PHP 8.2 + Composer

One self-contained guide: system packages, PHP, Composer, the Nginx site config (embedded below, no separate file to keep in sync), the app's environment file, the RDS connection, permissions, and running the dev server. Run in order on a fresh Ubuntu server.

## 1. Update the system

```bash
sudo apt update
sudo apt upgrade -y
```

## 2. Install base packages

```bash
sudo apt install -y software-properties-common \
  ca-certificates \
  lsb-release \
  apt-transport-https \
  curl \
  unzip \
  git \
  gnupg2
```

## 3. Install and enable Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

## 4. Add the PHP 8.2 repository

`$(lsb_release -sc)` fills in your Ubuntu codename automatically — don't hardcode one (this previously said the literal word `resolute`, which isn't a real Ubuntu release).

```bash
sudo apt install -y curl ca-certificates gnupg

curl -fsSL https://packages.sury.org/php/apt.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/sury-php.gpg

echo "deb [signed-by=/usr/share/keyrings/sury-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" | \
  sudo tee /etc/apt/sources.list.d/sury-php.list

sudo apt update
```

## 5. Install PHP 8.2 and extensions

```bash
sudo apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-common \
  php8.2-mysql php8.2-curl php8.2-mbstring php8.2-xml php8.2-zip php8.2-gd

php -v
```

## 6. Install Composer

```bash
cd /tmp
curl -sS https://getcomposer.org/installer -o composer-setup.php
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
composer --version
```

## 7. Create the Nginx site config

`myapp.conf` is just a name — swap it for your app's. This writes the file directly on the server, so there's nothing to keep in sync with a separate template — the `fastcgi_pass` socket already matches the PHP 8.2 installed in step 5.

```bash
sudo tee /etc/nginx/sites-available/myapp.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name <domain_name>;
    root <document_root>;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;
    charset utf-8;

    location ~* \.(css|js|ico|gif|jpeg|jpg|webp|png|svg|eot|otf|woff|woff2|ttf|ogg|mp4)$ {
        expires max;
        fastcgi_hide_header Set-Cookie;
        if ($request_method = 'GET') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
            add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
        }
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include snippets/fastcgi-php.conf;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~ /\.ht {
        deny all;
    }

    location ~ /\.git {
        deny all;
    }
}
EOF
```

The `<<'EOF'` (quoted delimiter) matters here — it stops bash from trying to expand `$uri`, `$query_string`, and `$realpath_root`, which are Nginx variables, not shell ones. Without the quotes those would silently come out blank.

## 8. Enable the Nginx site

```bash
sudo sed -i 's|<document_root>|/var/www/my-app/public|g' \
  /etc/nginx/sites-available/myapp.conf
sudo sed -i 's|<domain_name>|myapp.example.com|g' \
  /etc/nginx/sites-available/myapp.conf

sudo ln -sf /etc/nginx/sites-available/myapp.conf /etc/nginx/sites-enabled/myapp.conf
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
```

To edit by hand instead: `sudo nano /etc/nginx/sites-available/myapp.conf`, then repeat `nginx -t` and `reload`.

## 9. Copy in the app's environment file

```bash
cp ../support/envsample.md /var/www/my-app/.env
```

> `support/envsample.md` currently has **real-looking credentials** in it (a DB host, root password, AWS keys placeholders). Treat that file as a secret, not a template — see the note at its top.

## 10. Connect to the AWS RDS database

```bash
mysql -h db-delete-leter.c526s8e2w212.ap-southeast-1.rds.amazonaws.com \
  -P 3306 \
  -u root \
  -p
```

## 11. Set storage & cache permissions

```bash
sudo chown -R www-data:www-data /var/www/my-app/storage
sudo chown -R www-data:www-data /var/www/my-app/bootstrap/cache

sudo chmod -R 775 /var/www/my-app/storage
sudo chmod -R 775 /var/www/my-app/bootstrap/cache
```

## 12. Run `npm run dev` and view it on the web

Vite's dev server only binds to `localhost` by default, so on a remote server it isn't reachable from your browser until you bind it to all interfaces and open its port.

```bash
cd /var/www/my-app
npm install
npm run dev -- --host 0.0.0.0
```

Then open the port (Vite's default is `5173`) to your IP in the firewall:

```bash
sudo ufw allow 5173/tcp
```

If the server is on AWS, also add an inbound rule for TCP `5173` (source: your IP) on its **security group** — `ufw` alone won't help if the security group blocks the port first.

Visit `http://<server-ip>:5173` in the browser. This is for local development only — leaving the Vite dev server open on a public IP is not something to run in production; use `npm run build` and let Nginx serve the compiled assets instead (see [step 7](#setup-7-create-the-nginx-site-config)).
