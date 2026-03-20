// ─── KisanSetu | Mandi Prices — Mock eNAM Data + Filter Logic ────────────────
// Commit 3: mock data array + dropdown population + filter + render
// FR-2.1, FR-2.2

// Mock data simulating eNAM API response
// Each object = one mandi's daily price record for one crop
const mandiData = [
    { mandi: "Akbarpur Mandi",  state: "Uttar Pradesh", district: "Ambedkar Nagar", crop: "Wheat",  min: 2100, max: 2600, modal: 2400, distance_km: 8   },
    { mandi: "Faizabad Mandi",  state: "Uttar Pradesh", district: "Ayodhya",        crop: "Wheat",  min: 2050, max: 2550, modal: 2350, distance_km: 42  },
    { mandi: "Lucknow Mandi",   state: "Uttar Pradesh", district: "Lucknow",        crop: "Wheat",  min: 2200, max: 2700, modal: 2500, distance_km: 95  },
    { mandi: "Akbarpur Mandi",  state: "Uttar Pradesh", district: "Ambedkar Nagar", crop: "Rice",   min: 1800, max: 2200, modal: 2000, distance_km: 8   },
    { mandi: "Faizabad Mandi",  state: "Uttar Pradesh", district: "Ayodhya",        crop: "Rice",   min: 1750, max: 2150, modal: 1950, distance_km: 42  },
    { mandi: "Kanpur Mandi",    state: "Uttar Pradesh", district: "Kanpur",         crop: "Rice",   min: 1900, max: 2300, modal: 2100, distance_km: 110 },
    { mandi: "Akbarpur Mandi",  state: "Uttar Pradesh", district: "Ambedkar Nagar", crop: "Tomato", min: 800,  max: 1400, modal: 1100, distance_km: 8   },
    { mandi: "Allahabad Mandi", state: "Uttar Pradesh", district: "Prayagraj",      crop: "Tomato", min: 900,  max: 1500, modal: 1200, distance_km: 78  },
    { mandi: "Akbarpur Mandi",  state: "Uttar Pradesh", district: "Ambedkar Nagar", crop: "Onion",  min: 600,  max: 1100, modal: 850,  distance_km: 8   },
    { mandi: "Faizabad Mandi",  state: "Uttar Pradesh", district: "Ayodhya",        crop: "Onion",  min: 550,  max: 1050, modal: 800,  distance_km: 42  },
    { mandi: "Nashik Mandi",    state: "Maharashtra",   district: "Nashik",         crop: "Onion",  min: 500,  max: 900,  modal: 700,  distance_km: 890 },
    { mandi: "Pune Mandi",      state: "Maharashtra",   district: "Pune",           crop: "Tomato", min: 950,  max: 1600, modal: 1300, distance_km: 940 },
    { mandi: "Nagpur Mandi",    state: "Maharashtra",   district: "Nagpur",         crop: "Wheat",  min: 2000, max: 2500, modal: 2250, distance_km: 980 },
    { mandi: "Karnal Mandi",    state: "Haryana",       district: "Karnal",         crop: "Wheat",  min: 2150, max: 2650, modal: 2450, distance_km: 520 },
    { mandi: "Rohtak Mandi",    state: "Haryana",       district: "Rohtak",         crop: "Rice",   min: 1850, max: 2250, modal: 2050, distance_km: 560 },
    { mandi: "Karnal Mandi",    state: "Haryana",       district: "Karnal",         crop: "Potato", min: 500,  max: 900,  modal: 700,  distance_km: 520 },
    { mandi: "Akbarpur Mandi",  state: "Uttar Pradesh", district: "Ambedkar Nagar", crop: "Potato", min: 550,  max: 950,  modal: 750,  distance_km: 8   },
    { mandi: "Varanasi Mandi",  state: "Uttar Pradesh", district: "Varanasi",       crop: "Potato", min: 520,  max: 920,  modal: 720,  distance_km: 130 },
    { mandi: "Agra Mandi",      state: "Uttar Pradesh", district: "Agra",           crop: "Potato", min: 480,  max: 880,  modal: 680,  distance_km: 300 },
    { mandi: "Faizabad Mandi",  state: "Uttar Pradesh", district: "Ayodhya",        crop: "Tomato", min: 850,  max: 1350, modal: 1050, distance_km: 42  },
];

// ── Populate State and Crop dropdowns from data ───────────────────────────────
function populateDropdowns() {
    const stateSelect = document.getElementById('filter-state');
    const cropSelect  = document.getElementById('filter-crop');

    const states = [...new Set(mandiData.map(d => d.state))].sort();
    const crops  = [...new Set(mandiData.map(d => d.crop))].sort();

    states.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        stateSelect.appendChild(opt);
    });

    crops.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        cropSelect.appendChild(opt);
    });
}

// ── When state changes, rebuild district dropdown ─────────────────────────────
function onStateChange() {
    const selectedState  = document.getElementById('filter-state').value;
    const districtSelect = document.getElementById('filter-district');

    districtSelect.innerHTML = '<option value="">All Districts</option>';

    if (selectedState) {
        const districts = [...new Set(
            mandiData
                .filter(d => d.state === selectedState)
                .map(d => d.district)
        )].sort();

        districts.forEach(dist => {
            const opt = document.createElement('option');
            opt.value = dist;
            opt.textContent = dist;
            districtSelect.appendChild(opt);
        });
    }

    filterData();
}

// ── Filter data and pass to renderTable ──────────────────────────────────────
function filterData() {
    const selectedState    = document.getElementById('filter-state').value;
    const selectedDistrict = document.getElementById('filter-district').value;
    const selectedCrop     = document.getElementById('filter-crop').value;

    let filtered = mandiData;

    if (selectedState)    filtered = filtered.filter(d => d.state    === selectedState);
    if (selectedDistrict) filtered = filtered.filter(d => d.district === selectedDistrict);
    if (selectedCrop)     filtered = filtered.filter(d => d.crop     === selectedCrop);

    renderTable(filtered);
}

// ── Render filtered rows into the table ──────────────────────────────────────
function renderTable(data) {
    const tbody     = document.getElementById('mandi-tbody');
    const trendHint = document.getElementById('trend-hint');

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    No prices found for the selected filters.
                </td>
            </tr>`;
        trendHint.style.display = 'none';
        return;
    }

    tbody.innerHTML = data.map(row => `
        <tr onclick="goToTrend('${row.crop}', '${row.mandi}')">
            <td>${row.mandi}</td>
            <td>${row.crop}</td>
            <td>&#8377;${row.min.toLocaleString('en-IN')}</td>
            <td>&#8377;${row.max.toLocaleString('en-IN')}</td>
            <td><strong>&#8377;${row.modal.toLocaleString('en-IN')}</strong></td>
            <td>${row.distance_km} km</td>
        </tr>
    `).join('');

    trendHint.style.display = 'flex';
}

// ── Navigate to price trend page ─────────────────────────────────────────────
function goToTrend(crop, mandi) {
    localStorage.setItem('trend_crop',  crop);
    localStorage.setItem('trend_mandi', mandi);
    window.location.href = 'price_trend.html';
}

// ── Initialise on page load ───────────────────────────────────────────────────
window.onload = function () {
    populateDropdowns();
    filterData();

    document.getElementById('last-updated').innerHTML =
        '<i class="fa-solid fa-clock"></i> Last updated: ' +
        new Date().toLocaleTimeString('en-IN');
};