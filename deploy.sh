#!/bin/bash
echo "Fazendo build do projeto..."
npm run build

echo "Ajustando permissões..."
chmod -R 755 /root/frontcontas/build
chown -R www-data:www-data /root/frontcontas/build

echo "Recarregando nginx..."
systemctl reload nginx

echo "Deploy concluído! Aplicação disponível em http://rizzopp.infomaster.inf.br"
