#!/bin/bash
echo "Fazendo build do projeto..."
npm run build

echo "Copiando arquivos PHP para build..."
cp /root/frontcontas/log-endpoint.php /root/frontcontas/build/
cp /root/frontcontas/get-logs.php /root/frontcontas/build/

echo "Ajustando permissões..."
chmod -R 755 /root/frontcontas/build
chown -R www-data:www-data /root/frontcontas/build
chmod 644 /root/frontcontas/build/*.php
chown www-data:www-data /root/frontcontas/build/*.php

echo "Verificando diretório de logs..."
mkdir -p /root/frontcontas/logs
chmod 755 /root/frontcontas/logs
chown www-data:www-data /root/frontcontas/logs

echo "Recarregando nginx..."
systemctl reload nginx

echo "Deploy concluído! Aplicação disponível em http://rizzopp.infomaster.inf.br"
