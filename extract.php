<?php
// ===============================================
//  extract.php
//  Ruft die aktuelle Position der ISS ab und zeigt
//  Latitude, Longitude (auf 4 Nachkommastellen) und
//  die lokale Zeit in der Schweiz an
// ===============================================

$url = "https://api.wheretheiss.at/v1/satellites/25544";

// cURL-Initialisierung
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// API-Anfrage ausführen
$response = curl_exec($ch); 
curl_close($ch);

// JSON-Daten dekodieren
$data = json_decode($response, true);

// Gibt die Daten zurück, anstatt sie auszugeben!
return $data;
?>


?>