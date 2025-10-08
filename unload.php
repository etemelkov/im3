<?php
// ===============================================
//  unload.php
//  Gibt ISS-Daten aus der Datenbank als JSON aus
// ===============================================

require_once 'config.php'; // Verbindungseinstellungen laden

header('Content-Type: application/json; charset=utf-8');

try {
    // Verbindung zur DB
    $pdo = new PDO($dsn, $username, $password, $options);

    // --- SQL: Alle Daten der letzten 2 Stunden abrufen ---
    // So kannst du die Trajektorie / Spur der ISS darstellen
    $stmt = $pdo->prepare("
        SELECT 
            timestamp,
            latitude,
            longitude,
            visibility
        FROM iss_position
        WHERE timestamp >= (NOW() - INTERVAL 2 HOUR)
        ORDER BY timestamp ASC
    ");
    $stmt->execute();

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // --- JSON ausgeben ---
    echo json_encode($results, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>