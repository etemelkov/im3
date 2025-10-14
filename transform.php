<?php
// --- Bindet ISS-Rohdaten ein ---
$data = include('extract.php');

// --- Funktion, um die Sichtbarkeit in Text umzuwandeln ---
function interpretVisibility($visibility)
{
    switch ($visibility) {
        case 'daylight':
            return 'sind wach.';
        case 'eclipsed':
            return 'sind am schlafen.';
        case 'twilight':
            return 'schauen sich den Sonnenauf- oder -untergang an.';
        default:
            return 'unbekannter Zustand';
    }
}

// --- Initialisiert Array für transformierte Daten ---
$transformedData = [];

// --- Transformiert und fügt gewünschte Felder hinzu ---
if (is_array($data)) {
    // Rundet Latitude/Longitude auf 4 Nachkommastellen
    $lat = round($data['latitude'], 4);
    $lon = round($data['longitude'], 4);

    // Aktuelle Schweizer Zeit (Datum + Uhrzeit)
    date_default_timezone_set('Europe/Zurich');
    $zeit = date('Y-m-d H:i:s'); // ✅ Speichert vollständigen Timestamp für Verlauf/Filter

    // Sichtbarkeit als Text
    $status = interpretVisibility($data['visibility']);

    // Baut das Ergebnis auf
    $transformedData = [
        'zeit' => $zeit,  // Vollständiges Datum + Uhrzeit
        'lat' => $lat,
        'lon' => $lon,
        'status' => $status
    ];
}

// Kodiert die transformierten Daten in JSON
$jsonData = json_encode($transformedData, JSON_PRETTY_PRINT);

// Gibt die JSON-Daten zurück
return $jsonData;
?>