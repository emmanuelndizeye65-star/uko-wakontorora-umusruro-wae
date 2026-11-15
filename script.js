// ======================================
// MILKTRACK 2.0
// SMART DAIRY FARM MANAGEMENT SYSTEM
// ======================================

// DATA STORAGE

const STORAGE_COWS = "milkTrackCows";
const STORAGE_RECORDS = "milkTrackRecords";

function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function dateOffset(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return localDate(date);
}

function loadData(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch {
        return fallback;
    }
}

// SAMPLE DATA FOR THE FIRST PRESENTATION

const sampleCows = [
    { id: "COW-001", name: "Bella", breed: "Friesian" },
    { id: "COW-002", name: "Daisy", breed: "Jersey" },
    { id: "COW-003", name: "Molly", breed: "Crossbreed" },
    { id: "COW-004", name: "Luna", breed: "Friesian" }
];

const sampleRecords = [];

const sampleQuantities = [
    [10, 9, 10, 9, 10, 8, 9],
    [8, 8, 8, 7, 8, 7, 8],
    [7, 7, 6, 7, 7, 6, 7],
    [9, 8, 9, 8, 9, 8, 8]
];

sampleQuantities.forEach((cowQuantities, cowIndex) => {
    cowQuantities.forEach((quantity, dayIndex) => {
        const date = dateOffset(dayIndex - 6);

        sampleRecords.push({
            id: `SAMPLE-${cowIndex}-${dayIndex}-M`,
            cowId: sampleCows[cowIndex].id,
            date,
            session: "Morning",
            quantity
        });

        sampleRecords.push({
            id: `SAMPLE-${cowIndex}-${dayIndex}-E`,
            cowId: sampleCows[cowIndex].id,
            date,
            session: "Evening",
            quantity: Math.max(1, quantity - 3)
        });
    });
});

let cows = loadData(STORAGE_COWS, sampleCows);
let records = loadData(STORAGE_RECORDS, sampleRecords);

function saveData() {
    localStorage.setItem(STORAGE_COWS, JSON.stringify(cows));
    localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records));
}

// GENERAL HELPERS

const today = () => localDate();

function formatLitres(value) {
    return `${Number(value).toFixed(1).replace(/\.0$/, "")} L`;
}

function getCow(cowId) {
    return cows.find(cow => cow.id === cowId);
}

function getTotalForDate(date) {
    return records
        .filter(record => record.date === date)
        .reduce((sum, record) => sum + Number(record.quantity), 0);
}

function getCowTotal(cowId) {
    return records
        .filter(record => record.cowId === cowId)
        .reduce((sum, record) => sum + Number(record.quantity), 0);
}

function showEmpty(message) {
    return `<tr><td colspan="6" class="empty-state">${message}</td></tr>`;
}

// NAVIGATION

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.remove("active");
    });

    document.getElementById(pageId).classList.add("active");

    const activeButton = document.querySelector(
        `.nav-link[data-page="${pageId}"]`
    );

    if (activeButton) activeButton.classList.add("active");

    const titles = {
        dashboard: "Dashboard",
        cows: "Cow Management",
        production: "Milk Production",
        analytics: "Analytics",
        alerts: "Smart Alerts",
        reports: "Farm Reports"
    };

    document.getElementById("page-title").textContent = titles[pageId];

    if (pageId === "analytics") renderAnalyticsChart();
    if (pageId === "dashboard") renderDashboardChart();
}

document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

// DATE DISPLAY

document.getElementById("current-date").textContent =
    new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

document.getElementById("record-date").value = today();

// COW MANAGEMENT

const cowForm = document.getElementById("cow-form");

cowForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const id = document.getElementById("cow-id").value
        .trim().toUpperCase();

    const name = document.getElementById("cow-name").value.trim();

    const breed = document.getElementById("cow-breed").value;

    if (!id || !name || !breed) return;

    if (cows.some(cow => cow.id === id)) {
        alert("This cow identification already exists.");
        return;
    }

    cows.push({ id, name, breed });

    saveData();
    cowForm.reset();
    refreshApp();

    alert("Cow registered successfully!");
});

function renderCows(search = "") {
    const table = document.getElementById("cow-table");

    const filtered = cows.filter(cow =>
        `${cow.id} ${cow.name} ${cow.breed}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    if (filtered.length === 0) {
        table.innerHTML = showEmpty("No cows found.");
        return;
    }

    table.innerHTML = filtered.map(cow => `
        <tr>
            <td><strong>${cow.id}</strong></td>
            <td>${escapeHTML(cow.name)}</td>
            <td>${escapeHTML(cow.breed)}</td>
            <td>${formatLitres(getCowTotal(cow.id))}</td>
            <td>
                <button class="delete-btn"
                    onclick="deleteCow('${cow.id}')">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

function deleteCow(cowId) {
    if (!confirm(`Delete ${cowId} and its production records?`)) return;

    cows = cows.filter(cow => cow.id !== cowId);
    records = records.filter(record => record.cowId !== cowId);

    saveData();
    refreshApp();
}

document.getElementById("cow-search").addEventListener("input", event => {
    renderCows(event.target.value);
});

// BASIC HTML ESCAPING FOR USER-ENTERED TEXT

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// COW SELECTION

function populateCowOptions() {
    const select = document.getElementById("record-cow");

    const previousValue = select.value;

    select.innerHTML = '<option value="">Select cow</option>';

    cows.forEach(cow => {
        const option = document.createElement("option");
        option.value = cow.id;
        option.textContent = `${cow.id} - ${cow.name}`;
        select.appendChild(option);
    });

    if (cows.some(cow => cow.id === previousValue)) {
        select.value = previousValue;
    }
}

// MILK PRODUCTION RECORDS

const productionForm = document.getElementById("production-form");

productionForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const cowId = document.getElementById("record-cow").value;
    const date = document.getElementById("record-date").value;
    const session = document.getElementById("record-session").value;
    const quantity = Number(
        document.getElementById("record-quantity").value
    );

    if (!getCow(cowId) || !date || !session || quantity <= 0 ||
        !Number.isFinite(quantity)) {
        alert("Please enter valid production information.");
        return;
    }

    if (date > today()) {
        alert("Production date cannot be in the future.");
        return;
    }

    const duplicate = records.some(record =>
        record.cowId === cowId &&
        record.date === date &&
        record.session === session
    );

    if (duplicate) {
        alert("A record already exists for this cow and session.");
        return;
    }

    records.push({
        id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cowId,
        date,
        session,
        quantity
    });

    saveData();
    productionForm.reset();
    document.getElementById("record-date").value = today();

    refreshApp();

    alert("Milk production recorded successfully!");
});

function renderProduction() {
    const table = document.getElementById("production-table");

    const sorted = [...records].sort((a, b) =>
        b.date.localeCompare(a.date)
    );

    if (sorted.length === 0) {
        table.innerHTML = showEmpty("No production records yet.");
        return;
    }

    table.innerHTML = sorted.map(record => `
        <tr>
            <td><strong>${record.cowId}</strong></td>
            <td>${record.date}</td>
            <td>${record.session}</td>
            <td>${formatLitres(record.quantity)}</td>
            <td>
                <button class="delete-btn"
                    onclick="deleteRecord('${record.id}')">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

function deleteRecord(recordId) {
    if (!confirm("Delete this production record?")) return;

    records = records.filter(record => record.id !== recordId);

    saveData();
    refreshApp();
}

// DASHBOARD

function renderDashboard() {
    const total = getTotalForDate(today());

    const todayRecords = records.filter(record => record.date === today());

    const average = cows.length ? total / cows.length : 0;

    document.getElementById("today-total").textContent =
        formatLitres(total);

    document.getElementById("cow-total").textContent = cows.length;

    document.getElementById("average-total").textContent =
        formatLitres(average);

    document.getElementById("record-total").textContent =
        todayRecords.length;

    document.getElementById("overview-cows").textContent = cows.length;

    document.getElementById("overview-milk").textContent =
        formatLitres(total);

    document.getElementById("overview-alerts").textContent =
        calculateAlerts().length;

    const recent = [...records]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    const table = document.getElementById("recent-records");

    table.innerHTML = recent.length ? recent.map(record => `
        <tr>
            <td>${record.cowId}</td>
            <td>${record.date}</td>
            <td>${record.session}</td>
            <td>${formatLitres(record.quantity)}</td>
        </tr>
    `).join("") : showEmpty("No records available.");
}

// CHARTS

let dashboardChart = null;
let analyticsChart = null;

function getSevenDayData() {
    const dates = Array.from({ length: 7 }, (_, index) =>
        dateOffset(index - 6)
    );

    return {
        labels: dates.map(date =>
            new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                weekday: "short"
            })
        ),
        values: dates.map(date => getTotalForDate(date))
    };
}

function makeChart(canvasId, existingChart, label) {
    if (existingChart) existingChart.destroy();

    const data = getSevenDayData();

    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") return null;

    return new Chart(canvas, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label,
                data: data.values,
                borderColor: "#B99B36",
                backgroundColor: "rgba(214,185,74,0.16)",
                fill: true,
                tension: 0.35,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: "#252525"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Litres"
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderDashboardChart() {
    dashboardChart = makeChart(
        "productionChart",
        dashboardChart,
        "Milk Production"
    );
}

function renderAnalyticsChart() {
    analyticsChart = makeChart(
        "analyticsChart",
        analyticsChart,
        "Daily Milk Production"
    );
}

// ANALYTICS

function renderAnalytics() {
    const total = records.reduce(
        (sum, record) => sum + Number(record.quantity), 0
    );

    const dailyTotals = {};

    records.forEach(record => {
        dailyTotals[record.date] =
            (dailyTotals[record.date] || 0) + Number(record.quantity);
    });

    const days = Object.values(dailyTotals);

    const highest = days.length ? Math.max(...days) : 0;

    const average = days.length
        ? total / days.length
        : 0;

    document.getElementById("all-time-total").textContent =
        formatLitres(total);

    document.getElementById("highest-total").textContent =
        formatLitres(highest);

    document.getElementById("daily-average").textContent =
        formatLitres(average);

    document.getElementById("cow-performance").innerHTML =
        cows.length ? cows.map(cow => `
            <tr>
                <td>${cow.id}</td>
                <td>${escapeHTML(cow.name)}</td>
                <td>${formatLitres(getCowTotal(cow.id))}</td>
            </tr>
        `).join("") : showEmpty("No cows registered.");
}

// SMART ALERTS

function calculateAlerts() {
    const alerts = [];

    const todayTotal = getTotalForDate(today());
    const yesterdayTotal = getTotalForDate(dateOffset(-1));

    cows.forEach(cow => {
        const todayCowRecords = records.filter(record =>
            record.cowId === cow.id && record.date === today()
        );

        if (todayCowRecords.length === 0) {
            alerts.push({
                title: `Missing record: ${cow.id}`,
                message: `${cow.name} has no milk production record for today.`
            });
        }

        const current = todayCowRecords.reduce(
            (sum, record) => sum + Number(record.quantity), 0
        );

        const previous = records
            .filter(record =>
                record.cowId === cow.id &&
                record.date === dateOffset(-1)
            )
            .reduce((sum, record) => sum + Number(record.quantity), 0);

        if (previous > 0 && current < previous * 0.8) {
            alerts.push({
                title: `Production decrease: ${cow.id}`,
                message: `Production is more than 20% below yesterday's recorded total. Check the records and investigate possible causes.`
            });
        }
    });

    if (yesterdayTotal > 0 && todayTotal < yesterdayTotal * 0.8) {
        alerts.push({
            title: "Farm production decrease",
            message: "Total farm production is more than 20% below yesterday. Review the farm's production records."
        });
    }

    return alerts;
}

function renderAlerts() {
    const alerts = calculateAlerts();

    const container = document.getElementById("alert-list");

    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No unusual production patterns or missing records detected.
            </div>
        `;
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-item">
            <strong>⚠ ${escapeHTML(alert.title)}</strong>
            <p>${escapeHTML(alert.message)}</p>
        </div>
    `).join("");
}

// REPORTS

function renderReports() {
    const total = records.reduce(
        (sum, record) => sum + Number(record.quantity), 0
    );

    document.getElementById("report-cows").textContent = cows.length;

    document.getElementById("report-milk").textContent =
        formatLitres(total);

    document.getElementById("report-records").textContent =
        records.length;

    const sorted = [...records].sort((a, b) =>
        b.date.localeCompare(a.date)
    );

    document.getElementById("report-table").innerHTML =
        sorted.length ? sorted.map(record => `
            <tr>
                <td>${record.cowId}</td>
                <td>${record.date}</td>
                <td>${record.session}</td>
                <td>${formatLitres(record.quantity)}</td>
            </tr>
        `).join("") : showEmpty("No records available.");
}

// REFRESH ALL APPLICATION DATA

function refreshApp() {
    saveData();
    populateCowOptions();
    renderCows(document.getElementById("cow-search").value);
    renderProduction();
    renderDashboard();
    renderAnalytics();
    renderAlerts();
    renderReports();

    if (document.getElementById("dashboard").classList.contains("active")) {
        renderDashboardChart();
    }

    if (document.getElementById("analytics").classList.contains("active")) {
        renderAnalyticsChart();
    }
}

// START APPLICATION

refreshApp();
