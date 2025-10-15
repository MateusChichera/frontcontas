<?php
// Endpoint para ler logs do servidor
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$date = $_GET['date'] ?? date('Y-m-d');
$logFile = "/root/frontcontas/logs/sistema_$date.txt";

if (!file_exists($logFile)) {
    echo json_encode(['logs' => []]);
    exit;
}

$logs = [];
$lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

foreach ($lines as $line) {
    // Parse do formato: [timestamp] action - details - Usuário: user
    if (preg_match('/^\[([^\]]+)\]\s+(\w+)(?:\s+-\s+(.+?))?(?:\s+-\s+Usuário:\s+(.+))?$/', $line, $matches)) {
        $logs[] = [
            'timestamp' => $matches[1],
            'action' => $matches[2],
            'details' => $matches[3] ?? '',
            'usuario' => $matches[4] ?? '',
            'logEntry' => $line
        ];
    }
}

// Ordenar por timestamp (mais recentes primeiro)
usort($logs, function($a, $b) {
    return strtotime($b['timestamp']) - strtotime($a['timestamp']);
});

echo json_encode(['logs' => $logs]);
?>
