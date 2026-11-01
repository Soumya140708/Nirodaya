// ==========================================================
// data.js  -  ALL SAMPLE DATA LIVES HERE
// Every ambulance below is FICTIONAL. Hospital and hazard
// positions are APPROXIMATE and are not official data.
// ==========================================================

const AMBULANCES = [
    { id: "A1", name: "Sample Unit A1 - Chembur",    lat: 19.0560, lng: 72.8990, available: true  },
    { id: "A2", name: "Sample Unit A2 - Sion",       lat: 19.0420, lng: 72.8640, available: true  },
    { id: "A3", name: "Sample Unit A3 - Kurla",      lat: 19.0728, lng: 72.8826, available: true  },
    { id: "A4", name: "Sample Unit A4 - Ghatkopar",  lat: 19.0860, lng: 72.9080, available: true  },
    { id: "A5", name: "Sample Unit A5 - Dadar",      lat: 19.0178, lng: 72.8478, available: true  },
    { id: "A6", name: "Sample Unit A6 - Mankhurd",   lat: 19.0480, lng: 72.9320, available: false }
];

const HOSPITALS = [
    { name: "Sion Hospital (sample listing)",     lat: 19.0369, lng: 72.8626 },
    { name: "Rajawadi Hospital (sample listing)", lat: 19.0830, lng: 72.9060 },
    { name: "Bhabha Hospital Kurla (sample listing)", lat: 19.0663, lng: 72.8818 }
];

// Flood-prone areas drawn as circles. radius is in metres.
// Positions are approximate; replace with verified data if available.
const HAZARDS = [
    { name: "Hindmata (sample flood zone)",     lat: 19.0082, lng: 72.8409, radius: 450 },
    { name: "Kings Circle (sample flood zone)", lat: 19.0310, lng: 72.8560, radius: 400 },
    { name: "Sion (sample flood zone)",         lat: 19.0400, lng: 72.8610, radius: 450 },
    { name: "Milan Subway (sample flood zone)", lat: 19.0820, lng: 72.8445, radius: 400 }
];

// Ready-made patient locations for repeatable testing.
const PRESETS = [
    { name: "Chembur",   lat: 19.0540, lng: 72.9010 },
    { name: "Matunga",   lat: 19.0220, lng: 72.8540 },
    { name: "Wadala",    lat: 19.0176, lng: 72.8562 },
    { name: "Sion",      lat: 19.0440, lng: 72.8650 },
    { name: "Kurla",     lat: 19.0700, lng: 72.8790 },
    { name: "Ghatkopar", lat: 19.0800, lng: 72.9100 }
];