<?php
// ===============================================
//  unload.php
//  Gibt ISS-Daten (der letzten 2 Stunden) als JSON aus
//  → Für Anzeige der ISS-Trajektorie (Flugbahn)
// ===============================================

// --- Verbindungseinstellungen laden ---
require_once 'config.php';

// --- JSON-Header setzen ---
header('Content-Type: application/json; charset=utf-8');

try {
    // --- Verbindung zur Datenbank aufbauen ---
    $pdo = new PDO($dsn, $username, $password, $options);

    // --- SQL-Abfrage definieren ---
    // Ruft alle Positionsdaten der letzten 2 Stunden ab (sortiert nach Zeit)
    $sql = "SELECT * FROM `iss_position`";
        

    // --- SQL-Abfrage vorbereiten und ausführen ---
    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    // --- Ergebnisse als assoziatives Array holen ---
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // --- JSON-Ausgabe ---
    echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    // --- Fehlerbehandlung ---
    echo json_encode([
        'error' => 'Verbindung zur Datenbank fehlgeschlagen',
        'details' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
