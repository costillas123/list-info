# syntax=docker/dockerfile:1

# --- Stage 1: install PHP dependencies with Composer -----------------------
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --ignore-platform-reqs

COPY . .
RUN composer dump-autoload --optimize --no-dev

# --- Stage 2: runtime image (PHP-FPM) ---------------------------------------
FROM php:8.2-fpm-alpine AS app

RUN apk add --no-cache \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    oniguruma-dev \
  && docker-php-ext-configure gd --with-jpeg --with-freetype \
  && docker-php-ext-install -j"$(nproc)" \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl \
    opcache

WORKDIR /var/www/html

COPY --from=vendor /app /var/www/html
COPY docker-setup/php/local.ini /usr/local/etc/php/conf.d/local.ini

RUN addgroup -g 1000 www && adduser -G www -g www -s /bin/sh -D www \
  && chown -R www:www /var/www/html \
  && chown -R www:www /var/www/html/storage /var/www/html/bootstrap/cache

USER www

EXPOSE 9000
CMD ["php-fpm"]
