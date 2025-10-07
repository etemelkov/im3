<?php
// ===============================================
//  load.php
//  Lädt transformierte ISS-Daten in die Datenbank
//  und verwendet die Zeit aus transform.php
// ===============================================

// Transformations-Skript einbinden (liefert JSON)
$jsonData = include('transform.php');

// JSON in Array umwandeln
$dataArray = json_decode($jsonData, true);

// Datenbankkonfiguration einbinden
require_once 'config.php';

try {
    // Verbindung zur Datenbank aufbauen
    $pdo = new PDO($dsn, $username, $password, $options);

    // --- SQL-Befehl vorbereiten ---
    // TIMESTAMP-Feld kann direkt die vollständige Zeit aus transform.php aufnehmen
    $sql = "INSERT INTO iss_position (timestamp, latitude, longitude, visibility)
            VALUES (?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);

    // --- Datensatz einfügen ---
    $stmt->execute([
        $dataArray['zeit'],    // Zeit aus transform.php (Y-m-d H:i:s)
        $dataArray['lat'],     // Breitengrad
        $dataArray['lon'],     // Längengrad
        $dataArray['status']   // Sichtbarkeitsbeschreibung
    ]);

    // --- Erfolgsmeldung ---
    echo "ISS-Daten erfolgreich eingefügt:<br>";
    echo "Zeit: " . $dataArray['zeit'] . "<br>";
    echo "Latitude: " . $dataArray['lat'] . "<br>";
    echo "Longitude: " . $dataArray['lon'] . "<br>";
    echo "Status: " . $dataArray['status'] . "<br>";

} catch (PDOException $e) {
    die("Verbindung zur Datenbank fehlgeschlagen: " . $e->getMessage());
}
?>
