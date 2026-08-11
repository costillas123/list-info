sudo -i

uninstall ===================================
sudo apt purge -y nginx nginx-common

sudo apt purge -y 'php8.2\*'

sudo apt purge -y composer

sudo apt purge -y mysql-client-core

sudo apt purge -y 'php8.2\*'
sudo apt autoremove --purge -y

check versions ===================================
php -v
nginx -v
composer --version
mysql --version

access sample for ec2 ====================================
ssh -i web-delete-later-pair.pem ubuntu@56.10.6.102
chmod 400 web-delete-later-pair.pem

nginx enable =====================================================
file-nginx = myapp.conf # file name on nginx
folder-site = my-site/public # site index

sudo apt install -y nginx
sudo systemctl enable --now nginx

sudo touch /etc/nginx/sites-available/<file-nginx>
sudo nano /etc/nginx/sites-available/<file-nginx>

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
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Con>
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

sudo sed -i 's|<document_root>|/var/www/<file-site>|' /etc/nginx/sites-available/myapp.conf
sudo sed -i 's|<domain_name>|<domain-name>|' /etc/nginx/sites-available/myapp.conf

ls -l /etc/nginx/sites-available/
ls -l /etc/nginx/sites-enabled/

sudo ln -sf /etc/nginx/sites-available/myapp.conf /etc/nginx/sites-enabled/myapp.conf
sudo rm -f /etc/nginx/sites-enabled/default

cat /etc/nginx/sites-available/myapp.conf

sudo nginx -t

sudo systemctl reload nginx
sudo systemctl status nginx
sudo systemctl start nginx
sudo systemctl stop nginx

sudo systemctl stop php8.2-fpm 2>/dev/null || true

sudo apt purge -y 'php8.2\*'
sudo apt autoremove --purge -y
sudo apt clean

=========================================
sudo apt update
sudo apt upgrade -y
apt list --upgradable

php =======================================

# =======================================

# Remove PHP 8.2

# =======================================

sudo systemctl stop php8.2-fpm 2>/dev/null || true

sudo apt purge -y 'php8.2\*'
sudo apt autoremove --purge -y
sudo apt clean

# =======================================

# Install PHP 8.2

# =======================================

sudo apt update

sudo apt install -y \
php8.2 \
php8.2-cli \
php8.2-fpm \
php8.2-common \
php8.2-mysql \
php8.2-curl \
php8.2-mbstring \
php8.2-xml \
php8.2-zip \
php8.2-gd

php -v

sudo systemctl stop php8.2-fpm
sudo systemctl enable php8.2-fpm
sudo systemctl start php8.2-fpm

laravel setup =============================
env sample
root@ip-172-31-45-252:/var/www/my-app# cat .env

APP_NAME=Vristo
APP_ENV=local
APP_KEY=base64:TFtMDNP7qIRRRrjUSKafkwIbTQXiJkXBavnsnuG16mc=
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=db-delete-leter.c526s8e2w212.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_DATABASE=db_test
DB_USERNAME=root
DB_PASSWORD="Ethanrose123#"

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

MEMCACHED_HOST=127.0.0.1

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_HOST="${PUSHER_HOST}"
VITE_PUSHER_PORT="${PUSHER_PORT}"
VITE_PUSHER_SCHEME="${PUSHER_SCHEME}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"

===================================
sudo chown -R www-data:www-data /var/www/new-app/storage
sudo chown -R www-data:www-data /var/www/new-app/bootstrap/cache

sudo chmod -R 775 /var/www/new-app/storage
sudo chmod -R 775 /var/www/new-app/bootstrap/cache
