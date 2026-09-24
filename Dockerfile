FROM php:8.2-apache

# Instalar dependencias del sistema y extensiones de PHP para PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev \
    postgresql-client \
    && docker-php-ext-install pdo pdo_pgsql pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Habilitar el módulo rewrite de Apache
RUN a2enmod rewrite

WORKDIR /var/www/html

# Copiar el código fuente PHP
COPY ./src /var/www/html

# Configurar permisos para Apache
RUN chown -R www-data:www-data /var/www/html && chmod -R 755 /var/www/html

EXPOSE 80

CMD ["apache2-foreground"]
