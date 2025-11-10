# ISS Tracker – ReadMe

## Kurzbeschreibung  
Wir haben einen ISS-Tracker erstellt, der den **Live-Standort der ISS** auf einer Weltkarte zeigt. Über den **Optionen-Button** kann man den Pfad der letzten **1, 2 oder 3 Stunden** anzeigen lassen. Mit der Funktion **„Überflüge berechnen“** lässt sich prüfen, wie oft die ISS in den letzten **14 Tagen** über einen bestimmten Standort geflogen ist. Zudem zeigt eine **Visibility-Funktion**, ob man schläft oder ob man wach ist während des Überflugs. Die Daten aktualisieren sich alle **15 Minuten**.

## Learnings  
Wir haben gelernt, wie man einen **ETL-Prozess** aufbaut, also Daten aus einer API holt, aufbereitet und in eine **Datenbank lädt**. Dabei wurde klar, wie wichtig saubere Strukturen und Zeitstempel für korrekte Auswertungen sind.  

## Schwierigkeiten  
Die erste API (NASA/ISS) wurde nicht mehr aktualisiert. Deshalb mussten wir eine neue Quelle suchen und unseren ETL-Prozess sowie den Code anpassen. So entstand auch die Idee, zusätzlich die **Visibility-Daten** einzubauen.

Zusätzlich hatten wir das Problem, dass unsere Webseite nur auf meinem Gerät geöffnet wurde und die API auf allen Geräten nicht abgerufen wurde. Somit haben wir den CORS eingebaut um dies zu verhindern. Jetzt kann nun jeder auf die API zugreifen, was aber auch so gewollt und abgeklärt wurde. 

## Benutzte Ressourcen  
- Leaflet & OpenStreetMap  
- API mit Positions- und Visibility-Daten  
- Gemini, ChatGPT und Copilot (bei Problemen oder Code-Hilfen)
- Gemini hat uns konnte uns sehr gut helfen vor allem auch um das Berechnungsfeld zu erstellen. 

## Beispiele für Prompts  
**Gut:**  
> Erstelle eine JS-Funktion, die zählt, wie oft die ISS einen Punkt überfliegt (mit Toleranzwert und Zeitfenster).  

**Schlecht:**  
> Mach bitte, dass es funktioniert. 
