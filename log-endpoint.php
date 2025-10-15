<?php
// Endpoint simples para receber logs via POST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['log'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos']);
    exit;
}

$log = $input['log'];
$timestamp = date('Y-m-d');
$logFile = "/root/frontcontas/logs/sistema_$timestamp.txt";

// Criar diretório se não existir
if (!file_exists('/root/frontcontas/logs')) {
    mkdir('/root/frontcontas/logs', 0755, true);
}

// Adicionar log ao arquivo
file_put_contents($logFile, $log . "\n", FILE_APPEND | LOCK_EX);

echo json_encode(['success' => true, 'message' => 'Log salvo com sucesso']);
?>
