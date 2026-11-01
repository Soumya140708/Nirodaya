// ==========================================================
// map.js  -  research map page (map_p2.html)
// Needs: Leaflet, data.js, engine.js
// ==========================================================

let patient = { lat: PRESETS[0].lat, lng: PRESETS[0].lng };
let floodOn = true;
const testLog = [];

// ---------- MAP SETUP ----------
const map = L.map("map").setView([19.05, 72.88], 12);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const hazardLayer = L.layerGroup().addTo(map);
const routeLayer  = L.layerGroup().addTo(map);

let patientMarker = L.marker([patient.lat, patient.lng], {
    icon: emojiIcon("📍"), draggable: true
}).addTo(map).bindPopup("Patient location (drag me or click the map)");

patientMarker.on("dragend", function () {
    const p = patientMarker.getLatLng();
    setPatient(p.lat, p.lng, false);
});

map.on("click", function (e) {
    setPatient(e.latlng.lat, e.latlng.lng, true);
});

function setPatient(lat, lng, moveMarker) {
    patient = { lat: lat, lng: lng };
    if (moveMarker) patientMarker.setLatLng([lat, lng]);
    document.getElementById("patientText").textContent =
        lat.toFixed(4) + ", " + lng.toFixed(4);
}

HOSPITALS.forEach(function (h) {
    L.marker([h.lat, h.lng], { icon: emojiIcon("✚") })
        .addTo(map).bindPopup("<b>" + h.name + "</b>");
});

AMBULANCES.forEach(function (a) {
    const state = a.available ? "Available" : "Busy (not used)";
    L.marker([a.lat, a.lng], { icon: emojiIcon(a.available ? "🚑" : "⛔") })
        .addTo(map).bindPopup("<b>" + a.name + "</b><br>" + state);
});

function drawHazards() {
    hazardLayer.clearLayers();
    if (!floodOn) return;
    HAZARDS.forEach(function (h) {
        L.circle([h.lat, h.lng], {
            radius: h.radius, color: "#ff555d", fillColor: "#ff555d", fillOpacity: 0.25
        }).addTo(hazardLayer).bindPopup(h.name);
    });
}

// ---------- MAIN ANALYSIS ----------
async function runAnalysis() {
    const status = document.getElementById("status");
    const button = document.getElementById("runBtn");
    button.disabled = true;
    status.textContent = "Calculating routes...";
    routeLayer.clearLayers();

    const out = await analyse(patient, floodOn);   // from engine.js
    const A = out.A, B = out.B, C = out.C;

    const rows = [
        { label: "A. Nearest by distance",          r: A, opt: A.first },
        { label: "B. Fastest ETA (ignores floods)", r: B, opt: B.first },
        { label: "C. Hazard-aware (Nirodaya)",      r: C, opt: C.best }
    ];

    showResults(rows, out.results);
    drawRoutes(A, C);
    addToLog(rows);

    const anyEstimated = out.results.some(function (r) { return r.first.route.estimated; });
    status.textContent = anyEstimated
        ? "Routing service unreachable: ETAs are rough straight-line estimates."
        : "Done. ETAs come from OSRM and do not include live traffic.";
    button.disabled = false;
}

function showResults(rows, results) {
    let html = "<table class='result-table'><tr><th>Strategy</th><th>Ambulance</th>" +
               "<th>Effective ETA</th><th>Flood zones crossed</th></tr>";
    rows.forEach(function (row) {
        const hz = row.opt.hazards.length === 0
            ? "None"
            : row.opt.hazards.map(function (h) { return h.name; }).join(", ");
        html += "<tr><td>" + row.label + "</td><td>" + row.r.amb.name + "</td><td>" +
                row.opt.effectiveMin.toFixed(1) + " min</td><td>" + hz + "</td></tr>";
    });
    html += "</table>";

    html += "<h3>All available ambulances</h3><table class='result-table'>" +
            "<tr><th>Unit</th><th>Straight-line</th><th>Default route ETA</th><th>Effective ETA (best route)</th></tr>";
    results.forEach(function (r) {
        html += "<tr><td>" + r.amb.name + "</td><td>" + r.km.toFixed(1) + " km</td><td>" +
                (r.first.route.duration / 60).toFixed(1) + " min</td><td>" +
                r.best.effectiveMin.toFixed(1) + " min</td></tr>";
    });
    html += "</table>";

    document.getElementById("results").innerHTML = html;
}

function drawRoutes(A, C) {
    if (A.amb.id !== C.amb.id || A.first.route !== C.best.route) {
        L.polyline(A.first.route.coords, { color: "#ff555d", weight: 4, dashArray: "8 8" })
            .addTo(routeLayer);
    }
    const line = L.polyline(C.best.route.coords, { color: "#20f59a", weight: 6 })
        .addTo(routeLayer);
    map.fitBounds(line.getBounds(), { padding: [40, 40] });
}

// ---------- TEST LOG ----------
function addToLog(rows) {
    const A = rows[0], B = rows[1], C = rows[2];
    const presetName = document.getElementById("presetSelect").value;
    testLog.push({
        no: testLog.length + 1,
        location: presetName || (patient.lat.toFixed(4) + " / " + patient.lng.toFixed(4)),
        flood: floodOn ? "ON" : "OFF",
        aUnit: A.r.amb.id, aEta: A.opt.effectiveMin.toFixed(1),
        bUnit: B.r.amb.id, bEta: B.opt.effectiveMin.toFixed(1),
        cUnit: C.r.amb.id, cEta: C.opt.effectiveMin.toFixed(1),
        different: (A.r.amb.id !== C.r.amb.id) ? "YES" : "NO",
        saved: (A.opt.effectiveMin - C.opt.effectiveMin).toFixed(1)
    });
    renderLog();
}

function renderLog() {
    let html = "<table class='result-table'><tr><th>#</th><th>Location</th><th>Flood</th>" +
               "<th>A unit / ETA</th><th>B unit / ETA</th><th>C unit / ETA</th>" +
               "<th>A and C differ?</th><th>A minus C (min)</th></tr>";
    testLog.forEach(function (t) {
        html += "<tr><td>" + t.no + "</td><td>" + t.location + "</td><td>" + t.flood + "</td><td>" +
                t.aUnit + " / " + t.aEta + "</td><td>" + t.bUnit + " / " + t.bEta + "</td><td>" +
                t.cUnit + " / " + t.cEta + "</td><td>" + t.different + "</td><td>" + t.saved + "</td></tr>";
    });
    html += "</table>";
    document.getElementById("logTable").innerHTML = html;
}

function downloadCsv() {
    if (testLog.length === 0) { alert("Run at least one test first."); return; }
    let csv = "No,Location,Flood,A_unit,A_eta,B_unit,B_eta,C_unit,C_eta,A_C_differ,A_minus_C\n";
    testLog.forEach(function (t) {
        csv += [t.no, '"' + t.location + '"', t.flood, t.aUnit, t.aEta, t.bUnit, t.bEta,
                t.cUnit, t.cEta, t.different, t.saved].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "nirodaya_test_results.csv";
    link.click();
}

// ---------- BUTTONS AND CONTROLS ----------
document.getElementById("runBtn").addEventListener("click", runAnalysis);
document.getElementById("csvBtn").addEventListener("click", downloadCsv);

document.getElementById("floodToggle").addEventListener("change", function (e) {
    floodOn = e.target.checked;
    drawHazards();
});

document.getElementById("gpsBtn").addEventListener("click", function () {
    const status = document.getElementById("status");
    if (!navigator.geolocation) { status.textContent = "Location is not supported in this browser."; return; }
    status.textContent = "Asking for your location...";
    navigator.geolocation.getCurrentPosition(
        function (pos) {
            setPatient(pos.coords.latitude, pos.coords.longitude, true);
            document.getElementById("presetSelect").value = "";
            map.setView([patient.lat, patient.lng], 14);
            status.textContent = "Location found.";
        },
        function () {
            status.textContent = "Could not get location (permission denied, or page is not on https/localhost).";
        }
    );
});

const presetSelect = document.getElementById("presetSelect");
PRESETS.forEach(function (p) {
    const option = document.createElement("option");
    option.value = p.name;
    option.textContent = p.name;
    presetSelect.appendChild(option);
});
presetSelect.addEventListener("change", function () {
    const p = PRESETS.find(function (x) { return x.name === presetSelect.value; });
    if (p) {
        setPatient(p.lat, p.lng, true);
        map.setView([p.lat, p.lng], 13);
    }
});

drawHazards();
setPatient(patient.lat, patient.lng, false);