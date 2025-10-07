<?php
require_once 'config.php';

try {
    $pdo = new PDO($dsn, $username, $password, $options);

    // cURL benutzen statt file_get_contents
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.wheretheiss.at/v1/satellites/25544");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($ch);
    curl_close($ch);

    if (!$response) {
        die("API konnte nicht abgefragt werden.");
    }

    $data = json_decode($response, true);
    $timestamp = date('Y-m-d H:i:s', $data['timestamp']);
    $latitude = $data['latitude'];
    $longitude = $data['longitude'];
    $visibility = $data['visibility'];

    // Daten in DB einfügen
    $sql = "INSERT INTO iss_position (timestamp, latitude, longitude, visibility) VALUES (?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$timestamp, $latitude, $longitude, $visibility]);

    echo "ISS-Daten erfolgreich eingefügt: $timestamp, $latitude, $longitude, $visibility";

} catch (PDOException $e) {
    die("Fehler: " . $e->getMessage());
}
?>
