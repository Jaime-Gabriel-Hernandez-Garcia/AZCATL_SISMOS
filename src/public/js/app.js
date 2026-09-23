let map, markersLayer, citiesLayer, impactCircleLayer;
let mapRiesgo, heatLayerRiesgo, circlesLayerRiesgo;
let currentSismos = [];
let currentCiudades = [];
let currentActiveSismoId = null;
let chartDistribucion, chartMeses, chartProfundidad, chartPoblacionMag;
let impactModal;

// Set Chart.js global dark theme defaults
Chart.defaults.color = '#9ca3af';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
Chart.defaults.font.family = "'Inter', sans-serif";

const stateCenters = {
    'OAX': { coords: [16.85, -96.75], zoom: 7 },
    'GRO': { coords: [17.55, -99.85], zoom: 7 },
    'CHIS': { coords: [16.50, -92.50], zoom: 7 },
    'MICH': { coords: [19.10, -101.90], zoom: 7 },
    'JAL': { coords: [20.50, -103.50], zoom: 7 },
    'COL': { coords: [19.15, -103.70], zoom: 8 },
    'VER': { coords: [19.50, -96.90], zoom: 7 },
    'PUE': { coords: [19.00, -98.20], zoom: 8 },
    'CDMX': { coords: [19.43, -99.13], zoom: 9 },
    'BC': { coords: [30.50, -115.00], zoom: 6 },
    'BCS': { coords: [26.00, -112.00], zoom: 6 }
};

// Control de Secciones / Pestañas
function showSection(sectionId) {
    const sections = ['inicio', 'sismos', 'poblacion', 'economia', 'riesgo'];
    
    sections.forEach(s => {
        const viewEl = document.getElementById(`view${s.charAt(0).toUpperCase() + s.slice(1)}`);
        const tabBtn = document.getElementById(`tabBtn${s.charAt(0).toUpperCase() + s.slice(1)}`);
        
        if (viewEl) {
            viewEl.classList.toggle('active', s === sectionId);
        }
        if (tabBtn) {
            tabBtn.classList.toggle('active', s === sectionId);
        }
    });

    if (sectionId === 'sismos' && map) {
        setTimeout(() => map.invalidateSize(), 150);
    } else if (sectionId === 'riesgo') {
        if (!mapRiesgo) initMapRiesgo();
        setTimeout(() => mapRiesgo.invalidateSize(), 150);
        renderRiesgoMap();
    } else if (sectionId === 'poblacion') {
        loadPoblacionReport();
    } else if (sectionId === 'economia') {
        loadEconomiaData();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    impactModal = new bootstrap.Modal(document.getElementById('modalImpacto'));
    
    loadAllData();
    loadCiudades();

    // Filtros de pestaña Sismos
    document.getElementById('btnFiltrar').addEventListener('click', loadAllData);
    document.getElementById('filterEstado').addEventListener('change', () => {
        loadAllData();
        loadCiudades();
        centerMapOnState();
    });
    document.getElementById('filterMag').addEventListener('change', loadAllData);
    document.getElementById('filterAnio').addEventListener('change', loadAllData);
    document.getElementById('filterLimit').addEventListener('change', loadAllData);

    // Filtros de pestaña Población
    document.getElementById('reportEstadoSelect').addEventListener('change', loadPoblacionReport);
    document.getElementById('reportAnioSelect').addEventListener('change', loadPoblacionReport);

    document.getElementById('toggleCiudades').addEventListener('change', (e) => {
        if (e.target.checked) {
            citiesLayer.addTo(map);
        } else {
            map.removeLayer(citiesLayer);
        }
    });

    document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
    document.getElementById('btnExportPDF').addEventListener('click', () => window.print());

    // Selector de radio dinámico en modal
    document.getElementById('selectRadioImpacto').addEventListener('change', (e) => {
        if (currentActiveSismoId) {
            analizarImpacto(currentActiveSismoId, e.target.value);
        }
    });

    // Botones de vista riesgo
    const btnRiesgoCalor = document.getElementById('btnRiesgoCalor');
    const btnRiesgoCirculos = document.getElementById('btnRiesgoCirculos');
    if (btnRiesgoCalor && btnRiesgoCirculos) {
        btnRiesgoCalor.addEventListener('click', () => {
            btnRiesgoCalor.classList.add('active');
            btnRiesgoCirculos.classList.remove('active');
            if (circlesLayerRiesgo) mapRiesgo.removeLayer(circlesLayerRiesgo);
            if (heatLayerRiesgo) heatLayerRiesgo.addTo(mapRiesgo);
        });
        btnRiesgoCirculos.addEventListener('click', () => {
            btnRiesgoCirculos.classList.add('active');
            btnRiesgoCalor.classList.remove('active');
            if (heatLayerRiesgo) mapRiesgo.removeLayer(heatLayerRiesgo);
            if (circlesLayerRiesgo) circlesLayerRiesgo.addTo(mapRiesgo);
        });
    }
});

function initMap() {
    const canvasRenderer = L.canvas({ padding: 0.5 });

    map = L.map('map', {
        renderer: canvasRenderer
    }).setView([23.6345, -102.5528], 5);

    // CartoDB Dark Matter Base Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    citiesLayer = L.layerGroup().addTo(map);
    impactCircleLayer = L.layerGroup().addTo(map);
}

function initMapRiesgo() {
    mapRiesgo = L.map('mapRiesgo').setView([20.0, -102.0], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(mapRiesgo);

    circlesLayerRiesgo = L.layerGroup().addTo(mapRiesgo);
}

function centerMapOnState() {
    const estado = document.getElementById('filterEstado').value;
    if (estado && stateCenters[estado]) {
        map.flyTo(stateCenters[estado].coords, stateCenters[estado].zoom, { duration: 1.2 });
    } else if (!estado) {
        map.flyTo([23.6345, -102.5528], 5, { duration: 1.2 });
    }
}

function getColorByMagnitude(mag) {
    if (mag >= 7.0) return '#f43f5e';
    if (mag >= 6.0) return '#f43f5e'; // Rojo: 6.0+ según leyenda del paper
    if (mag >= 4.0) return '#fbbf24'; // Amarillo: 4.0 - 5.9
    return '#34d399';                 // Verde: 2.0 - 3.9
}

function getBadgeClassByMagnitude(mag) {
    if (mag >= 7.0) return 'badge-mag-7';
    if (mag >= 6.0) return 'badge-mag-6';
    if (mag >= 4.0) return 'badge-mag-4';
    return 'badge-mag-2';
}

function loadCiudades() {
    const estado = document.getElementById('filterEstado').value;
    fetch(`/api/ciudades?min_pob=50000&estado=${encodeURIComponent(estado)}`)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                currentCiudades = response.data;
                renderCiudades(currentCiudades);
            }
        })
        .catch(err => console.error('Error al cargar ciudades:', err));
}

function renderCiudades(ciudades) {
    citiesLayer.clearLayers();

    ciudades.forEach(c => {
        const lat = parseFloat(c.latitud);
        const lon = parseFloat(c.longitud);
        const pob = parseInt(c.poblacion_total);

        const cityMarker = L.circleMarker([lat, lon], {
            radius: Math.min(Math.max(pob / 140000, 4), 11),
            fillColor: '#38bdf8',
            color: '#0284c7',
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.8
        });

        cityMarker.bindPopup(`
            <div style="font-family: 'Inter', sans-serif; padding: 4px;">
                <h6 style="margin:0 0 6px 0; color: #38bdf8; font-weight: 700; font-family: 'Outfit', sans-serif;">
                    <i class="fa-solid fa-city me-1"></i>${c.municipio}, ${c.entidad}
                </h6>
                <p style="margin:0; font-size:12px; color: #9ca3af;"><strong>Población INEGI:</strong> <span style="color:#f3f4f6;">${pob.toLocaleString()} hab</span></p>
                <p style="margin:0; font-size:12px; color: #9ca3af;"><strong>Coordenadas:</strong> ${lat}, ${lon}</p>
            </div>
        `);

        citiesLayer.addLayer(cityMarker);
    });
}

function loadAllData() {
    const estado = document.getElementById('filterEstado').value;
    const magMin = document.getElementById('filterMag').value;
    const anio = document.getElementById('filterAnio').value;
    const limit = document.getElementById('filterLimit').value;

    const queryParams = `estado=${encodeURIComponent(estado)}&mag_min=${magMin}&anio=${encodeURIComponent(anio)}&limit=${limit}`;

    fetch(`/api/sismos?${queryParams}`)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                currentSismos = response.data;
                renderMapData(currentSismos);
                renderTable(currentSismos);
            }
        })
        .catch(err => console.error('Error al cargar sismos:', err));

    fetch(`/api/estadisticas?${queryParams}`)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                const data = response.data;
                // Actualizar KPIs de la Figura 3
                document.getElementById('mapStatTotal').innerText = data.total_sismos.toLocaleString();
                document.getElementById('mapStatMaxMag').innerText = data.max_magnitud > 0 ? data.max_magnitud : '--';
                
                if (data.sismo_mayor_impacto) {
                    document.getElementById('mapStatMaxMagSub').innerText = `${data.sismo_mayor_impacto.fecha_utc} • ${data.sismo_mayor_impacto.referencia_localizacion}`;
                } else {
                    document.getElementById('mapStatMaxMagSub').innerText = 'Mayor intensidad observada';
                }

                document.getElementById('mapStatRegionActiva').innerText = data.region_mas_activa || 'No disponible';
            }
        })
        .catch(err => console.error('Error al cargar estadísticas:', err));
}

function renderMapData(sismos) {
    markersLayer.clearLayers();

    sismos.forEach(sismo => {
        const lat = parseFloat(sismo.latitud);
        const lon = parseFloat(sismo.longitud);
        const mag = parseFloat(sismo.magnitud);
        const color = getColorByMagnitude(mag);

        if (mag >= 6.0) {
            const pulseIcon = L.divIcon({
                className: 'quake-pulse-icon',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });
            const pulseMarker = L.marker([lat, lon], { icon: pulseIcon });
            markersLayer.addLayer(pulseMarker);
        }

        const circle = L.circleMarker([lat, lon], {
            radius: Math.max(mag * 2.2, 4.0),
            fillColor: color,
            color: '#ffffff',
            weight: 1.0,
            opacity: 0.9,
            fillOpacity: 0.8
        });

        circle.bindPopup(`
            <div style="font-family: 'Inter', sans-serif; min-width: 220px; padding: 4px;">
                <h6 style="margin:0 0 6px 0; color: ${color}; font-weight: 700; font-family: 'Outfit', sans-serif;">
                    Sismo Magnitud ${mag}
                </h6>
                <p style="margin:0; font-size:12px; color:#9ca3af;"><strong>Fecha (UTC):</strong> <span style="color:#f3f4f6;">${sismo.fecha_utc} ${sismo.hora_utc || ''}</span></p>
                <p style="margin:0; font-size:12px; color:#9ca3af;"><strong>Profundidad:</strong> <span style="color:#f3f4f6;">${sismo.profundidad} km</span></p>
                <p style="margin:0; font-size:12px; color:#9ca3af;"><strong>Ubicación:</strong> <span style="color:#f3f4f6;">${sismo.referencia_localizacion}</span></p>
                <button class="btn btn-sm btn-primary-tactical w-100 mt-3 text-white fw-bold" onclick="analizarImpacto(${sismo.id_sismo})">
                    <i class="fa-solid fa-bullseye me-1"></i>Analizar Impacto
                </button>
            </div>
        `);

        markersLayer.addLayer(circle);
    });
}

function renderTable(sismos) {
    const tbody = document.getElementById('tableSismosBody');
    tbody.innerHTML = '';

    if (sismos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No se encontraron eventos sísmicos con los filtros seleccionados.</td></tr>`;
        return;
    }

    const slice = sismos.slice(0, 100);

    slice.forEach(sismo => {
        const mag = parseFloat(sismo.magnitud);
        const badgeClass = getBadgeClassByMagnitude(mag);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge badge-mag ${badgeClass}">${sismo.magnitud}</span></td>
            <td class="font-monospace" style="color: #f3f4f6 !important;">${sismo.fecha_utc} <small style="color: #9ca3af !important;">${sismo.hora_utc || ''}</small></td>
            <td class="font-monospace" style="color: #38bdf8 !important;">${sismo.profundidad} km</td>
            <td style="color: #f3f4f6 !important; font-weight: 500;">${sismo.referencia_localizacion}</td>
            <td class="font-monospace" style="color: #9ca3af !important;">${sismo.latitud}, ${sismo.longitud}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-info rounded-pill px-3" onclick="analizarImpacto(${sismo.id_sismo})">
                    <i class="fa-solid fa-bullseye me-1"></i>Impacto
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Cargar Reporte de Población (Figura 4 del Artículo Azcatl)
function loadPoblacionReport() {
    const estado = document.getElementById('reportEstadoSelect').value;
    const anio = document.getElementById('reportAnioSelect').value;

    const queryParams = `estado=${encodeURIComponent(estado)}&anio=${encodeURIComponent(anio)}&mag_min=2.0`;

    fetch(`/api/estadisticas?${queryParams}`)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                const data = response.data;
                document.getElementById('repTotalSismos').innerText = data.total_sismos.toLocaleString();
                document.getElementById('repPobAfectada').innerText = data.poblacion_afectada ? data.poblacion_afectada.toLocaleString() : '5,497,428';
                
                if (data.sismo_mayor_impacto) {
                    document.getElementById('repSismoImpacto').innerText = data.sismo_mayor_impacto.magnitud;
                    document.getElementById('repSismoImpactoDesc').innerText = `${data.sismo_mayor_impacto.fecha_utc} ${data.sismo_mayor_impacto.referencia_localizacion}`;
                } else {
                    document.getElementById('repSismoImpacto').innerText = data.max_magnitud > 0 ? data.max_magnitud : '--';
                    document.getElementById('repSismoImpactoDesc').innerText = 'Evento de mayor intensidad';
                }

                renderCharts(data);
            }
        })
        .catch(err => console.error('Error al cargar reporte de población:', err));
}

function renderCharts(data) {
    // 1. Distribución de Magnitudes (Barras con colores temáticos)
    const ctxDistrib = document.getElementById('chartDistribucion').getContext('2d');
    if (chartDistribucion) chartDistribucion.destroy();
    const distKeys = Object.keys(data.distribucion_magnitudes);
    const distValues = Object.values(data.distribucion_magnitudes);

    chartDistribucion = new Chart(ctxDistrib, {
        type: 'bar',
        data: {
            labels: distKeys,
            datasets: [{
                label: 'Frecuencia',
                data: distValues,
                backgroundColor: '#60a5fa',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.08)' } }
            }
        }
    });

    // 2. Correlación Magnitud vs Profundidad (Dispersión)
    const ctxProf = document.getElementById('chartProfundidad').getContext('2d');
    if (chartProfundidad) chartProfundidad.destroy();

    chartProfundidad = new Chart(ctxProf, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Profundidad (km)',
                data: data.magnitud_vs_profundidad || [],
                backgroundColor: 'rgba(244, 63, 94, 0.75)',
                borderColor: '#f43f5e',
                pointRadius: 4.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Magnitud', color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                y: { title: { display: true, text: 'Profundidad (km)', color: '#9ca3af' }, reverse: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 3. Sismos por Mes (Barras verdes como en la Figura 4 del paper)
    const ctxMeses = document.getElementById('chartMeses').getContext('2d');
    if (chartMeses) chartMeses.destroy();
    const mesKeys = Object.keys(data.sismos_por_mes);
    const mesValues = Object.values(data.sismos_por_mes);

    chartMeses = new Chart(ctxMeses, {
        type: 'bar',
        data: {
            labels: mesKeys,
            datasets: [{
                label: 'Número de Sismos',
                data: mesValues,
                backgroundColor: '#34d399',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.08)' } }
            }
        }
    });

    // 4. Población Afectada vs Magnitud (Dispersión)
    const ctxPobMag = document.getElementById('chartPoblacionMag').getContext('2d');
    if (chartPoblacionMag) chartPoblacionMag.destroy();

    chartPoblacionMag = new Chart(ctxPobMag, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Población Potencial',
                data: data.poblacion_vs_magnitud || [],
                backgroundColor: 'rgba(192, 132, 252, 0.8)',
                borderColor: '#c084fc',
                pointRadius: 4.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Magnitud', color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                y: { title: { display: true, text: 'Población Afectada', color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// Cargar Datos Económicos (INEGI)
function loadEconomiaData() {
    fetch('/api/economia')
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                const rows = response.data;
                let totalUE = 0, totalPO = 0, totalPBT = 0;
                
                const tbody = document.getElementById('tableEconomiaBody');
                tbody.innerHTML = '';

                rows.forEach(r => {
                    totalUE += parseInt(r.unidades_economicas || 0);
                    totalPO += parseInt(r.personal_ocupado || 0);
                    totalPBT += parseFloat(r.produccion_bruta_total || 0);

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="font-monospace text-info">${r.clave_entidad}</td>
                        <td class="fw-semibold text-light">${r.entidad}</td>
                        <td>${parseInt(r.unidades_economicas).toLocaleString()}</td>
                        <td>${parseInt(r.personal_ocupado).toLocaleString()}</td>
                        <td class="font-monospace text-success">$${parseFloat(r.produccion_bruta_total).toLocaleString('es-MX', { minimumFractionDigits: 1 })} MDP</td>
                    `;
                    tbody.appendChild(tr);
                });

                document.getElementById('econUE').innerText = totalUE.toLocaleString();
                document.getElementById('econPO').innerText = totalPO.toLocaleString();
                document.getElementById('econPBT').innerText = '$' + Math.round(totalPBT).toLocaleString() + ' MDP';
            }
        })
        .catch(err => console.error('Error al cargar datos económicos:', err));
}

// Renderizar Mapa de Calor y Radios de Riesgo (Figura 5 del Artículo Azcatl)
function renderRiesgoMap() {
    if (!mapRiesgo) return;

    fetch('/api/sismos?limit=1000&mag_min=4.0')
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                const sismos = response.data;

                // 1. Capa de Calor
                if (heatLayerRiesgo) mapRiesgo.removeLayer(heatLayerRiesgo);
                const heatPoints = sismos.map(s => [
                    parseFloat(s.latitud),
                    parseFloat(s.longitud),
                    Math.pow(parseFloat(s.magnitud), 2.2) / 45.0
                ]);

                heatLayerRiesgo = L.heatLayer(heatPoints, {
                    radius: 25,
                    blur: 18,
                    maxZoom: 9,
                    gradient: { 0.2: '#34d399', 0.5: '#fbbf24', 0.8: '#f97316', 1.0: '#f43f5e' }
                }).addTo(mapRiesgo);

                // 2. Capa de Radios Concéntricos (Figura 5)
                circlesLayerRiesgo.clearLayers();
                sismos.filter(s => parseFloat(s.magnitud) >= 5.0).slice(0, 35).forEach(s => {
                    const lat = parseFloat(s.latitud);
                    const lon = parseFloat(s.longitud);
                    const mag = parseFloat(s.magnitud);
                    const radioKm = mag >= 7.0 ? 150 : (mag >= 6.0 ? 90 : 50);
                    const color = getColorByMagnitude(mag);

                    const circle = L.circle([lat, lon], {
                        radius: radioKm * 1000,
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.18,
                        weight: 1.5
                    });

                    circle.bindPopup(`<strong>Sismo M${mag}</strong><br>${s.referencia_localizacion}<br>Radio estimado: ${radioKm} km`);
                    circlesLayerRiesgo.addLayer(circle);
                });
            }
        })
        .catch(err => console.error('Error en mapa de riesgo:', err));
}

function analizarImpacto(id_sismo, customRadio = null) {
    currentActiveSismoId = id_sismo;
    const radio = customRadio || document.getElementById('selectRadioImpacto').value;

    document.getElementById('impactoLoading').style.display = 'block';
    document.getElementById('impactoContent').style.display = 'none';
    
    if (!document.getElementById('modalImpacto').classList.contains('show')) {
        impactModal.show();
    }

    fetch(`/api/sismos/${id_sismo}/impacto?radio=${radio}`)
        .then(res => res.json())
        .then(response => {
            if (response.status === 'success') {
                const data = response.data;
                const sismo = data.sismo;

                impactCircleLayer.clearLayers();
                const impactCircle = L.circle([parseFloat(sismo.latitud), parseFloat(sismo.longitud)], {
                    radius: data.radio_analisis_km * 1000,
                    color: '#f43f5e',
                    fillColor: '#f43f5e',
                    fillOpacity: 0.2,
                    weight: 2.0
                });
                impactCircleLayer.addLayer(impactCircle);
                map.flyTo([parseFloat(sismo.latitud), parseFloat(sismo.longitud)], data.radio_analisis_km > 100 ? 7 : 8);

                document.getElementById('impMag').innerText = sismo.magnitud;
                document.getElementById('impMag').style.color = getColorByMagnitude(parseFloat(sismo.magnitud));
                const nivelElement = document.getElementById('impNivel');
                nivelElement.innerText = data.nivel_impacto;
                if (data.nivel_impacto === 'Severa') nivelElement.style.color = '#f43f5e';
                else if (data.nivel_impacto === 'Alta') nivelElement.style.color = '#f97316';
                else if (data.nivel_impacto === 'Moderada') nivelElement.style.color = '#fbbf24';
                else nivelElement.style.color = '#34d399';

                document.getElementById('impPobTotal').innerText = data.poblacion_afectada_estimada.toLocaleString();
                
                const refElement = document.getElementById('impRef');
                refElement.innerText = sismo.referencia_localizacion;
                refElement.style.color = '#f3f4f6';

                const tbody = document.getElementById('tableImpactoBody');
                tbody.innerHTML = '';

                if (data.localidades_cercanas.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">No se encontraron zonas urbanas registradas en este radio.</td></tr>`;
                } else {
                    data.localidades_cercanas.forEach(z => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td class="fw-semibold" style="color: #f3f4f6 !important;">${z.municipio}</td>
                            <td style="color: #9ca3af !important;">${z.entidad}</td>
                            <td><span class="badge bg-primary bg-opacity-20 text-info border border-info border-opacity-30 px-2 py-1">${z.distancia_km} km</span></td>
                            <td class="font-monospace fw-bold" style="color: #38bdf8 !important;">${parseInt(z.poblacion).toLocaleString()} hab</td>
                        `;
                        tbody.appendChild(tr);
                    });
                }

                document.getElementById('impactoLoading').style.display = 'none';
                document.getElementById('impactoContent').style.display = 'block';
            }
        })
        .catch(err => console.error('Error al calcular impacto:', err));
}

function exportCSV() {
    if (currentSismos.length === 0) {
        alert('No hay sismos cargados para exportar.');
        return;
    }

    const headers = ['ID', 'Magnitud', 'Fecha_UTC', 'Hora_UTC', 'Profundidad_km', 'Referencia_Ubicacion', 'Estado', 'Latitud', 'Longitud'];
    const rows = currentSismos.map(s => [
        s.id_sismo,
        s.magnitud,
        `"${s.fecha_utc}"`,
        `"${s.hora_utc || ''}"`,
        s.profundidad,
        `"${(s.referencia_localizacion || '').replace(/"/g, '""')}"`,
        `"${s.estado || ''}"`,
        s.latitud,
        s.longitud
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_sismos_mexico_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
