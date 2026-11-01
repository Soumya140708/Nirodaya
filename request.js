// ==========================================================
// request.js  -  Request Aid page (request_p4.html)
// Needs: Leaflet, data.js, engine.js
// ==========================================================

let patient = { lat: PRESETS[0].lat, lng: PRESETS[0].lng };

// ---------- SMALL PICKER MAP ----------
const pickMap = L.map("pickMap").setView([patient.lat, patient.lng], 12);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
}).addTo(pickMap);

const marker = L.marker([patient.lat, patient.lng], { icon: emojiIcon("📍"), draggable: true }).addTo(pickMap);

function setPatient(lat, lng, moveMarker) {
    patient = { lat: lat, lng: lng };
    if (moveMarker) marker.setLatLng([lat, lng]);
    document.getElementById("coordText").textContent = lat.toFixed(4) + ", " + lng.toFixed(4);
}
marker.on("dragend", function () { const p = marker.getLatLng(); setPatient(p.lat, p.lng, false); });
pickMap.on("click", function (e) { setPatient(e.latlng.lat, e.latlng.lng, true); });
setPatient(patient.lat, patient.lng, false);

// ---------- LOCATION CONTROLS ----------
const presetSelect = document.getElementById("presetSelect");
PRESETS.forEach(function (p) {
    const o = document.createElement("option");
    o.value = p.name; o.textContent = p.name;
    presetSelect.appendChild(o);
});
presetSelect.addEventListener("change", function () {
    const p = PRESETS.find(function (x) { return x.name === presetSelect.value; });
    if (p) { setPatient(p.lat, p.lng, true); pickMap.setView([p.lat, p.lng], 13); }
});

document.getElementById("gpsBtn").addEventListener("click", function () {
    const msg = document.getElementById("requestMessage");
    if (!navigator.geolocation) { msg.textContent = "Location is not supported in this browser."; return; }
    msg.textContent = "Asking for your location...";
    navigator.geolocation.getCurrentPosition(function (pos) {
        setPatient(pos.coords.latitude, pos.coords.longitude, true);
        presetSelect.value = "";
        pickMap.setView([patient.lat, patient.lng], 14);
        msg.textContent = "Location found.";
    }, function () {
        msg.textContent = "Could not get location (permission denied, or page is not on https/localhost). Choose a test location instead.";
    });
});

// ---------- SUBMIT THE (SIMULATED) REQUEST ----------
document.getElementById("aidForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const button = document.getElementById("submitBtn");
    const msg = document.getElementById("requestMessage");
    button.disabled = true;
    msg.textContent = "Comparing ambulances and choosing a hospital...";

    const floodOn = document.getElementById("floodToggle").checked;

    const out = await analyse(patient, floodOn);        // engine.js
    const A = out.A, C = out.C;
    const hosp = await chooseHospital(patient, floodOn); // engine.js

    const req = {
        id: "NR-" + String(Date.now()).slice(-6),
        createdAt: Date.now(),
        name: document.getElementById("patientName").value,
        phone: document.getElementById("phone").value,
        type: document.getElementById("emergencyType").value,
        details: document.getElementById("details").value,
        lat: patient.lat,
        lng: patient.lng,
        floodOn: floodOn,
        ambulance: {
            id: C.amb.id,
            name: C.amb.name,
            lat: C.amb.lat,
            lng: C.amb.lng,
            etaMin: C.best.effectiveMin,
            hazards: C.best.hazards.map(function (h) { return h.name; }),
            estimated: C.best.route.estimated,
            coords: thinCoords(C.best.route.coords, 150)
        },
        distanceChoice: {
            id: A.amb.id,
            name: A.amb.name,
            etaMin: A.first.effectiveMin,
            hazards: A.first.hazards.map(function (h) { return h.name; })
        },
        hospital: {
            name: hosp.hospital.name,
            lat: hosp.hospital.lat,
            lng: hosp.hospital.lng,
            legMin: hosp.best.effectiveMin
        },
        ackAt: null,
        readyAt: null
    };

    const list = loadRequests();
    list.push(req);
    saveRequests(list);

    showSummary(req);
    msg.textContent = "";
    button.disabled = false;
});

function showSummary(req) {
    const same = req.ambulance.id === req.distanceChoice.id;
    const total = req.ambulance.etaMin + req.hospital.legMin;

    let html = "<h3>Simulated request " + req.id + " created</h3>";
    html += "<p><strong>Ambulance chosen:</strong> " + escapeHtml(req.ambulance.name) +
            " &mdash; ETA " + req.ambulance.etaMin.toFixed(1) + " min</p>";

    if (same) {
        html += "<p class='muted'>The nearest-by-distance method would have chosen the same unit in this scenario.</p>";
    } else {
        html += "<p class='muted'>Nearest-by-distance would have chosen <strong>" +
                escapeHtml(req.distanceChoice.name) + "</strong> (effective ETA " +
                req.distanceChoice.etaMin.toFixed(1) + " min" +
                (req.distanceChoice.hazards.length ? ", route crosses " +
                escapeHtml(req.distanceChoice.hazards.join(", ")) : "") + ").</p>";
    }

    html += "<p><strong>Hospital alerted (simulated):</strong> " + escapeHtml(req.hospital.name) + "</p>";
    html += "<p class='muted'>Estimated advance warning for the hospital: about " +
            total.toFixed(0) + " minutes.</p>";
    if (req.ambulance.estimated) {
        html += "<p class='notice'>Routing service was unreachable, so these are rough estimates.</p>";
    }
    html += "<a class='button primary full-width' href='track_p5.html?id=" + req.id + "'>Track this request →</a>";
    html += "<a class='button outline full-width' href='hospital_p6.html'>Open hospital dashboard →</a>";
    html += "<p class='notice'>Simulation only. No real ambulance or hospital has been contacted.</p>";

    document.getElementById("summaryBox").innerHTML = html;
}