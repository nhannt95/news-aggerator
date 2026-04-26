<?php
function getDb() {
    static $pdo = null;
    if ($pdo) return $pdo;

    $host = getenv('DB_HOST') ? getenv('DB_HOST') : 'localhost';
    $port = getenv('DB_PORT') ? getenv('DB_PORT') : '3306';
    $db   = getenv('DB_NAME') ? getenv('DB_NAME') : 'news_aggregator';
    $user = getenv('DB_USER') ? getenv('DB_USER') : 'root';
    $pass = getenv('DB_PASS') ? getenv('DB_PASS') : '';

    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",
        $user, $pass,
        array(
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        )
    );
    return $pdo;
}
