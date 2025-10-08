console.log("Hello, World!");

fetch('https://www.elenatemelkov.ch/unload.php')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json(); // oder response.text(), falls die API kein JSON zurückgibt
    })
    .then(data => {
        console.log('API Antwort:', data);
    })
    .catch(error => {
        console.error('Es gab ein Problem mit dem Fetch-Aufruf:', error);
    });