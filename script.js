        // Lagt till en cache-breaker dynamiskt så att ändringar i scriptet/databasen tvingas fram omedelbart
        const csvBaseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8eXO4cQAX-1GvTRc3c_d6xxJgK2WBS5hn8dEzMPghCs3ujiinkxF4oJI6HxvO9INaTxUPywLuD-tz/pub?output=csv';
        const csvUrl = csvBaseUrl + '&t=' + new Date().getTime();

        const map = L.map('map').setView([62.0, 15.0], 5);
        
        // Skapa klustergruppen
        const markersGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: 17
        });

        // Bakgrundskarta
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap, © CARTO'
        }).addTo(map);

        // Skapar en ikon per karta, med årtal inbakat i html:en
        function createYearIcon(year) {
            return L.divIcon({
                className: 'ol-icon',
                html: `<div class="ol-icon-inner"></div><div class="ol-icon-year">${year || ''}</div>`,
                iconSize: [20, 20], iconAnchor: [10, 10]
            });
        }

        // Skottsäker funktion för att identifiera giltiga länkar
        function getButtonHtml(url, label, activeClass) {
            const cleanUrl = url ? String(url).trim() : "";

            // Om ingen url angiven, returnera tom sträng så ingenting renderas
            if (!cleanUrl) return "";
            
            // Kontrollerar om länken börjar med http eller https
            const hasValidUrl = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://");

            if (hasValidUrl) {
                return `<a href="${cleanUrl}" target="_blank" class="btn ${activeClass}">${label}</a>`;
            } else {
                // Ogiltig länk — returnera tomt så att inget visas
                return "";
            }
        }

        let allMarkersList = [];

        async function loadData() {
            Papa.parse(csvUrl, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    const yearFilterMenu = document.getElementById('year-filter');
                    const yearsFound = new Set();

                    results.data.forEach(row => {
                        const item = {
                            namn: row["Namn"],
                            ar: row["År"],
                            arrangor: row["Arrangör"],
                            langd: row["Längd_m"],
                            tid: row["Tid"] || "",
                            lat: parseFloat(String(row["Latitud"]).replace(',', '.')),
                            lng: parseFloat(String(row["Longitud"]).replace(',', '.')),
                            referat: row["Referat"] || "Inget referat skrivet.",
                            pdf: row["PDF_URL"],
                            winsplits: row["Splits_URL"],
                            livelox: row["Route_URL"]
                        };

                        if (!isNaN(item.lat) && !isNaN(item.lng)) {
                            const marker = L.marker([item.lat, item.lng], { icon: createYearIcon(item.ar) });
                            
                            // Bygg knapp-HTML endast för de länkar som finns
                            const buttonsHtml = [
                                getButtonHtml(item.pdf, 'Karta (PDF)', 'btn-pdf'),
                                getButtonHtml(item.winsplits, 'Split Times', 'btn-winsplits'),
                                getButtonHtml(item.livelox, 'Route', 'btn-livelox')
                            ].filter(Boolean).join(' ');

                            const popupContent = `
                                <div class="ol-popup">
                                    <h3>${item.namn}</h3>
                                    <p class="meta">
                                        <strong>${item.ar}</strong> | ${item.arrangor} | ${item.langd}m ${item.tid ? '| ' + item.tid : ''}
                                    </p>
                                    <div class="btn-group">
                                        ${buttonsHtml || 'Inga länkar att visa'}
                                    </div>
                                    <div class="referat-box">${item.referat}</div>
                                </div>
                            `;
                            
                            marker.bindPopup(popupContent, { maxWidth: 350 });
                            marker.year = String(item.ar);
                            
                            allMarkersList.push(marker);
                            markersGroup.addLayer(marker);
                            if(item.ar) yearsFound.add(item.ar);
                        }
                    });

                    map.addLayer(markersGroup);

                    Array.from(yearsFound).sort((a, b) => b - a).forEach(year => {
                        const opt = document.createElement('option');
                        opt.value = year; opt.innerHTML = year;
                        yearFilterMenu.appendChild(opt);
                    });
                }
            });
        }

        function filterMarkers() {
            const selectedYear = document.getElementById('year-filter').value;
            markersGroup.clearLayers();
            
            allMarkersList.forEach(marker => {
                if (selectedYear === "all" || marker.year === selectedYear) {
                    markersGroup.addLayer(marker);
                }
            });
        }

        map.on('click', function(e) {
            document.getElementById('coords').innerHTML = 
                `<strong>Admin-koordinater:</strong><br>Lat: ${e.latlng.lat.toFixed(6)}<br>Long: ${e.latlng.lng.toFixed(6)}`;
        });

        loadData();
