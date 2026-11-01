// ==========================================================
// hospital.js  -  hospital pre-alert dashboard (hospital_p6.html)
// Needs: data.js, engine.js
// This page plays the role of ONE participating hospital.
// ==========================================================

const hospitalSelect = document.getElementById("hospitalSelect");

// First option shows every alert, so a demo never looks empty by mistake
const allOption = document.createElement("option");
allOption.value = "__all__";
allOption.textContent = "All hospitals";
hospitalSelect.appendChild(allOption);

HOSPITALS.forEach(function (h) {
    const o = document.createElement("option");
    o.value = h.name;
    o.textContent = h.name;
    hospitalSelect.appendChild(o);
});

let lastSnapshot = "";

function render() {
    const raw = localStorage.getItem(STORAGE_KEY) || "[]";
    const selected = hospitalSelect.value;
    const snapshot = raw + "|" + selected;
    if (snapshot === lastSnapshot) return;       // nothing changed: do not redraw
    lastSnapshot = snapshot;

    const mine = loadRequests().filter(function (r) {
                                   return selected === "__all__" || r.hospital.name === selected;
                               }).reverse();     // newest first
    const box = document.getElementById("alertList");

    if (mine.length === 0) {
        box.innerHTML = "<p class='muted'>No incoming alerts. " +
                        "Create a request on the Request Aid page.</p>";
        return;
    }

    let html = "";
    mine.forEach(function (r) {
        const acked = r.ackAt !== null;
        const ready = r.readyAt !== null;
        const hospEta = r.ambulance.etaMin + r.hospital.legMin;
        const badge = ready ? "<span class='status good'>ER ready</span>"
                    : acked ? "<span class='status low'>Acknowledged</span>"
                            : "<span class='status critical'>New alert</span>";

        html += "<article class='supply-card alert-card'>" +
            "<div class='card-top'><h2>" + escapeHtml(r.id) + " · " + escapeHtml(r.type) + "</h2>" + badge + "</div>" +
            "<p class='muted'>Alert sent to: " + escapeHtml(r.hospital.name) + "</p>" +
            "<p class='muted'>Patient: " + escapeHtml(r.name) + " · Contact: " + escapeHtml(r.phone) + "</p>" +
            (r.details ? "<p class='card-note'>Notes: " + escapeHtml(r.details) + "</p>" : "") +
            "<div class='stock-line'><span>Ambulance</span><span>" + escapeHtml(r.ambulance.name) + "</span></div>" +
            "<div class='stock-line'><span>Reaches patient in</span><span class='countdown' data-created='" +
                r.createdAt + "' data-eta='" + r.ambulance.etaMin + "'></span></div>" +
            "<div class='stock-line'><span>Expected at this hospital in</span><span class='countdown' data-created='" +
                r.createdAt + "' data-eta='" + hospEta + "'></span></div>" +
            "<div class='button-row'>" +
            "<button class='button primary' data-action='ack' data-id='" + r.id + "'" + (acked ? " disabled" : "") + ">Acknowledge alert</button>" +
            "<button class='button outline' data-action='ready' data-id='" + r.id + "'" + (!acked || ready ? " disabled" : "") + ">Mark ER team ready</button>" +
            "</div></article>";
    });
    box.innerHTML = html;
    updateCountdowns();
}

function updateCountdowns() {
    document.querySelectorAll(".countdown").forEach(function (el) {
        el.textContent = formatRemaining(Number(el.dataset.created), Number(el.dataset.eta));
    });
}

// Buttons: one listener on the container handles every card
document.getElementById("alertList").addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const list = loadRequests();
    const r = list.find(function (x) { return x.id === btn.dataset.id; });
    if (!r) return;
    if (btn.dataset.action === "ack" && r.ackAt === null) r.ackAt = Date.now();
    if (btn.dataset.action === "ready" && r.readyAt === null) r.readyAt = Date.now();
    saveRequests(list);
    render();
});

document.getElementById("clearBtn").addEventListener("click", function () {
    if (confirm("Delete all demo requests?")) {
        localStorage.removeItem(STORAGE_KEY);
        render();
    }
});

hospitalSelect.addEventListener("change", render);

render();
setInterval(function () { render(); updateCountdowns(); }, 500);