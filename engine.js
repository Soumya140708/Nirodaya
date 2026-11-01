// ==========================================================
// engine.js  -  SHARED "BRAIN" OF NIRODAYA
// Used by: map_p2.html, request_p4.html, track_p5.html, hospital_p6.html
// Needs data.js to be loaded first.
// ==========================================================

// ---------- SETTINGS (assumptions - state these to judges) ----------
const HAZARD_PENALTY_MIN = 10;   // extra minutes for each flood zone a route crosses
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving/";
const FALLBACK_SPEED_MS = 25000 / 3600;  // 25 km/h, only used if routing service fails
const SIM_SPEED = 30;            // demo clock runs 30x faster than real time
const STORAGE_KEY = "nirodaya_requests";

// ---------- SMALL HELPERS ----------
function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function emojiIcon(symbol) {
    return L.divIcon({ html: symbol, className: "emoji-marker", iconSize: [30, 30] });
}

// Haversine formula: straight-line distance between two GPS points, in metres
function haversine(a, b) {
    const R = 6371000;
    const toRad = function (d) { return d * Math.PI / 180; };
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function pickMin(list, scoreFn) {
    return list.reduce(function (a, b) { return scoreFn(b) < scoreFn(a) ? b : a; });
}

// Keep only some points of a long route so it fits easily in browser storage
function thinCoords(coords, maxPoints) {
    if (coords.length <= maxPoints) return coords;
    const step = (coords.length - 1) / (maxPoints - 1);
    const out = [];
    for (let i = 0; i < maxPoints; i++) out.push(coords[Math.round(i * step)]);
    return out;
}

// ---------- ROUTING (OSRM) ----------
// Asks the free OSRM service for driving routes from "from" to "to".
async function getRoutes(from, to) {
    const url = OSRM_URL +
        from.lng + "," + from.lat + ";" + to.lng + "," + to.lat +
        "?overview=full&geometries=geojson&alternatives=true";
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.code !== "Ok") throw new Error(data.code);
        return data.routes.map(function (r) {
            return {
                duration: r.duration,   // seconds
                distance: r.distance,   // metres
                coords: r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }),
                estimated: false
            };
        });
    } catch (error) {
        const d = haversine(from, to) * 1.4;
        return [{
            duration: d / FALLBACK_SPEED_MS,
            distance: d,
            coords: [[from.lat, from.lng], [to.lat, to.lng]],
            estimated: true
        }];
    }
}

// Which flood zones does this route pass through?
function hazardsOnRoute(coords, floodOn) {
    if (!floodOn) return [];
    return HAZARDS.filter(function (h) {
        return coords.some(function (c) {
            return haversine({ lat: c[0], lng: c[1] }, h) <= h.radius;
        });
    });
}

// Turn raw routes into options with an "effective" ETA (travel time + flood penalty)
function buildOptions(routes, floodOn) {
    return routes.map(function (r) {
        const hz = hazardsOnRoute(r.coords, floodOn);
        return {
            route: r,
            hazards: hz,
            effectiveMin: r.duration / 60 + hz.length * HAZARD_PENALTY_MIN
        };
    });
}

// ---------- AMBULANCE SELECTION ----------
async function evaluate(amb, patient, floodOn) {
    const routes = await getRoutes(amb, patient);
    const options = buildOptions(routes, floodOn);
    const first = options[0];   // default fastest route, ignoring hazards
    const best = pickMin(options, function (o) { return o.effectiveMin; });
    return { amb: amb, km: haversine(amb, patient) / 1000, first: first, best: best };
}

// Runs all three strategies and returns the results
async function analyse(patient, floodOn) {
    const available = AMBULANCES.filter(function (a) { return a.available; });
    const results = await Promise.all(available.map(function (a) {
        return evaluate(a, patient, floodOn);
    }));
    return {
        results: results,
        A: pickMin(results, function (r) { return r.km; }),                        // nearest by distance
        B: pickMin(results, function (r) { return r.first.route.duration; }),      // fastest ETA, ignores floods
        C: pickMin(results, function (r) { return r.best.effectiveMin; })          // hazard-aware
    };
}

// ---------- HOSPITAL SELECTION ----------
// Picks the hospital with the lowest effective travel time from the patient
async function chooseHospital(patient, floodOn) {
    const list = await Promise.all(HOSPITALS.map(async function (h) {
        const routes = await getRoutes(patient, h);
        const options = buildOptions(routes, floodOn);
        return { hospital: h, best: pickMin(options, function (o) { return o.effectiveMin; }) };
    }));
    return pickMin(list, function (x) { return x.best.effectiveMin; });
}

// ---------- SAVED REQUESTS (browser storage, no server needed) ----------
function loadRequests() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
}

function saveRequests(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ---------- DEMO CLOCK ----------
// How far along (0 to 1) is a journey that started at "startedAt" and takes "etaMin" minutes?
function simProgress(startedAt, etaMin) {
    const simSeconds = (Date.now() - startedAt) / 1000 * SIM_SPEED;
    return Math.min(1, simSeconds / (etaMin * 60));
}

function formatRemaining(startedAt, etaMin) {
    const left = etaMin * 60 - (Date.now() - startedAt) / 1000 * SIM_SPEED;
    if (left <= 0) return "Arrived";
    const m = Math.floor(left / 60);
    const s = Math.floor(left % 60);
    return m + " min " + (s < 10 ? "0" : "") + s + " s";
}