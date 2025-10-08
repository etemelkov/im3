console.log("Hello, World!");

const issDataContainer = document.getElementById('iss-data');

fetch('https://www.elenatemelkov.ch/unload.php')
    .then(response => {
        // Prüft, ob die HTTP-Antwort erfolgreich war (Status 200-299)
        if (!response.ok) {
            throw new Error(`Netzwerkantwort war nicht OK: ${response.statusText} (${response.status})`);
        }
        return response.json();
    })
    .then(data => {
        console.log('API Antwort:', data);

        // 1. Fehler und leere Daten prüfen
        if (data.error) {
            issDataContainer.innerHTML = `<p class="error">Fehler beim Laden der Daten: ${data.details || data.error}</p>`;
            return;
        }

        if (data.length === 0) {
            issDataContainer.innerHTML = '<p>Keine aktuellen Positionsdaten gefunden.</p>';
            return;
        }

        // 2. Tabellenschlüssel (Spaltennamen) ermitteln
        // Annahme: Die Schlüssel des ersten Objekts sind die Spaltennamen.
        const keys = Object.keys(data[0]);

        // Mapping für deutsche Spaltennamen
        const columnMapping = {
            'timestamp': 'Zeitstempel (UTC)',
            'latitude': 'Breitengrad',
            'longitude': 'Längengrad'
            // Füge hier weitere Spalten hinzu, falls vorhanden
        };


        // 3. Tabelle als HTML-String erstellen
        let tableHTML = '<table>';

        // Tabellenkopf (Header)
        tableHTML += '<thead><tr>';
        keys.forEach(key => {
            // Verwendet den deutschen Namen aus dem Mapping oder den Originalschlüssel
            const headerText = columnMapping[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
            tableHTML += `<th>${headerText}</th>`;
        });
        tableHTML += '</tr></thead>';

        // Tabellenkörper (Body)
        tableHTML += '<tbody>';
        data.forEach(item => {
            tableHTML += '<tr>';
            keys.forEach(key => {
                let displayValue = item[key];
                
                // Optionale Formatierung für Zeitstempel
                if (key === 'timestamp' && displayValue) {
                    try {
                        // Versucht, den Datenbank-Zeitstempel in ein lesbares Format umzuwandeln
                        const date = new Date(displayValue.replace(' ', 'T') + 'Z');
                        if (!isNaN(date.getTime())) {
                            displayValue = date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
                        }
                    } catch (e) {
                        // Bei Fehler den Originalwert anzeigen
                    }
                }
                
                tableHTML += `<td>${displayValue}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody>';
        
        tableHTML += '</table>';

        // 4. Tabelle in den Container einfügen
        issDataContainer.innerHTML = tableHTML;
        
    })
    .catch(error => {
        console.error('Es gab ein Problem mit dem Fetch-Aufruf:', error);
        issDataContainer.innerHTML = `<p class="error">Daten konnten nicht geladen werden. Details: ${error.message}</p>`;
    });