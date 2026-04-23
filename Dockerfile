FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
    bash \
    git \
    icu-dev \
    libzip-dev \
    nodejs \
    npm \
    oniguruma-dev \
    unzip \
    zip \
    && docker-php-ext-install bcmath intl mbstring pdo_mysql zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

ENV VITE_REVERB_APP_KEY=local-chat-key
ENV VITE_REVERB_HOST=
ENV VITE_REVERB_PORT=8080
ENV VITE_REVERB_SCHEME=http

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN composer dump-autoload --optimize \
    && npm run build \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
