// ==========================================================
// track.js  -  request status page (track_p5.html)
// Needs: Leaflet, data.js, engine.js
// ==========================================================

const params = new URLSearchParams(window.location.search);
const requests = loadRequests();
let req = requests.find(function (r) { return r.id === params.get("id"); });
if (!req && requests.length > 0) req = requests[requests.length - 1];   // fall back to latest

if (!req) {
    document.getElementById("trackContent").innerHTML =
        "<p class='muted'>No request found. Create one on the Request Aid page first.</p>" +
        "<a class='button primary' href='request_p4.html'>Go to Request Aid →</a>";
} else {
    startTracking();
}

function startTracking() {
    document.getElementById("trackContent").classList.remove("hidden");
    document.getElementById("reqId").textContent = req.id;
    document.getElementById("reqPatient").textContent = req.name + " · " + req.type;
    document.getElementById("reqAmb").textContent = req.ambulance.name;
    document.getElementById("reqHosp").textContent = req.hospital.name;

    // map
    const map = L.map("trackMap").setView([req.lat, req.lng], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    if (req.floodOn) {
        HAZARDS.forEach(function (h) {
            L.circle([h.lat, h.lng], { radius: h.radius, color: "#ff555d", fillOpacity: 0.2 }).addTo(map);
        });
    }

    const route = req.ambulance.coords;
    const line = L.polyline(route, { color: "#20f59a", weight: 5 }).addTo(map);
    L.marker([req.lat, req.lng], { icon: emojiIcon("📍") }).addTo(map).bindPopup("Patient");
    L.marker([req.hospital.lat, req.hospital.lng], { icon: emojiIcon("✚") }).addTo(map).bindPopup(req.hospital.name);
    const ambMarker = L.marker(route[0], { icon: emojiIcon("🚑") }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [40, 40] });

    if (req.ambulance.hazards.length > 0) {
        document.getElementById("hazardNote").textContent =
            "Note: even the best available route crosses " + req.ambulance.hazards.join(", ") +
            ". A delay penalty is included in the ETA.";
    } else if (req.floodOn) {
        document.getElementById("hazardNote").textContent =
            "Flood simulation ON: the chosen route avoids all sample flood zones.";
    }

    function tick() {
        // reload from storage so the hospital's acknowledgement shows up
        const fresh = loadRequests().find(function (r) { return r.id === req.id; });
        if (fresh) req = fresh;

        const progress = simProgress(req.createdAt, req.ambulance.etaMin);
        const index = Math.floor(progress * (route.length - 1));
        ambMarker.setLatLng(route[index]);

        document.getElementById("etaText").textContent =
            formatRemaining(req.createdAt, req.ambulance.etaMin);
        document.getElementById("progressBar").style.width = Math.round(progress * 100) + "%";

        const acked = req.ackAt !== null;
        const ready = req.readyAt !== null;
        const arrived = progress >= 1;

        setStep("step1", "done", "Request created (simulated)");
        setStep("step2", "done", "Ambulance assigned: " + req.ambulance.name + " (simulated)");
        setStep("step3", "done", "Alert sent to " + req.hospital.name + " (simulated)");
        setStep("step4", acked ? "done" : "waiting",
            acked ? "Hospital acknowledged the alert" : "Waiting for hospital to acknowledge...");
        setStep("step5", ready ? "done" : (acked ? "waiting" : "pending"),
            ready ? "Hospital reports ER team ready" : "Hospital preparation");
        setStep("step6", arrived ? "done" : "waiting",
            arrived ? "Ambulance has reached the patient" : "Ambulance on the way to the patient");
    }

    function setStep(id, state, text) {
        const li = document.getElementById(id);
        li.className = state;
        li.textContent = text;
    }

    tick();
    setInterval(tick, 500);
}