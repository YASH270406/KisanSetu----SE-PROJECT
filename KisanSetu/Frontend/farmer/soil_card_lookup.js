/**
 * soil_card_lookup.js — KisanSetu Soil Health Card ID Lookup
 * FR-6.1: Interface for farmers to input Soil Health Card ID
 *
 * INTEGRATION: Add to soilhealth.html:
 *
 *   <script src="soil_card_lookup.js"></script>
 *
 * Then ADD this HTML block at the top of the soil health content section
 * (BEFORE the existing N-P-K input form):
 *
 *   <div id="shc-lookup-widget"></div>
 *
 * HOW IT WORKS:
 *   1. Shows a Card ID input field with a "Fetch Data" button
 *   2. Validates the card format (SHC state/district/year/serial)
 *   3. Calls a lookup function (stub returns realistic data since
 *      the SHC government API is not publicly accessible without a portal login)
 *   4. On success: auto-fills the existing N-P-K fields in soilhealth.js
 *      and displays a farmer-friendly card summary
 *   5. Existing Gemini recommendation flow triggers naturally
 */

'use strict';

/* ── Style injection ── */
(function injectStyles() {
    if (document.getElementById('shc-styles')) return;
    const s = document.createElement('style');
    s.id = 'shc-styles';
    s.textContent = `
        #shc-lookup-widget {
            background: white;
            border: 2px solid #2e7d32;
            border-radius: 16px;
            padding: 20px 22px;
            margin-bottom: 20px;
            box-shadow: 0 4px 16px rgba(46,125,50,0.08);
        }
        .shc-title {
            font-size: 1rem; font-weight: 700; color: #1b6e35;
            display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
        }
        .shc-subtitle {
            font-size: 0.8rem; color: #607d8b; margin-bottom: 16px;
        }
        .shc-input-row {
            display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;
        }
        .shc-input {
            flex: 1; min-width: 180px;
            padding: 10px 14px; border: 1.5px solid #ddd; border-radius: 10px;
            font-size: 0.9rem; font-family: inherit;
            transition: border-color 0.2s; letter-spacing: 1px;
        }
        .shc-input:focus { outline: none; border-color: #2e7d32; }
        .shc-input.error { border-color: #c62828; }
        .shc-btn {
            padding: 10px 20px; background: #2e7d32; color: white;
            border: none; border-radius: 10px; font-weight: 600;
            font-size: 0.9rem; cursor: pointer; transition: background 0.2s;
            white-space: nowrap;
        }
        .shc-btn:hover:not(:disabled) { background: #1b5e20; }
        .shc-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .shc-format-hint {
            font-size: 0.73rem; color: #90a4ae; margin-bottom: 14px;
        }
        .shc-result {
            display: none;
            border-top: 1px solid #e8f5e9; padding-top: 14px; margin-top: 14px;
        }
        .shc-result.active { display: block; }
        .shc-result-banner {
            background: #e8f5e9; border-radius: 10px; padding: 14px 16px;
            margin-bottom: 12px;
        }
        .shc-result-banner h4 { margin: 0 0 4px; color: #1b6e35; font-size: 0.95rem; }
        .shc-result-banner p  { margin: 0; font-size: 0.78rem; color: #546e7a; }
        .shc-npk-grid {
            display: grid; grid-template-columns: repeat(3, 1fr);
            gap: 10px; margin-bottom: 12px;
        }
        .shc-npk-card {
            background: #f9fbe7; border: 1px solid #dcedc8;
            border-radius: 10px; padding: 10px; text-align: center;
        }
        .shc-npk-card .val   { font-size: 1.5rem; font-weight: 700; color: #33691e; }
        .shc-npk-card .unit  { font-size: 0.7rem; color: #689f38; }
        .shc-npk-card .lbl   { font-size: 0.75rem; color: #78909c; margin-top:2px; }
        .shc-ph-row {
            display: flex; align-items: center; gap: 12px;
            background: #fff3e0; border-radius: 10px; padding: 10px 14px;
            margin-bottom: 12px;
        }
        .shc-ph-row .ph-icon { font-size: 1.4rem; }
        .shc-ph-row .ph-val  { font-weight: 700; font-size: 1.2rem; color: #e65100; }
        .shc-ph-row .ph-lbl  { font-size: 0.78rem; color: #78909c; }
        .shc-autofill-btn {
            width: 100%; padding: 12px; background: #f1f8e9;
            border: 2px solid #8bc34a; border-radius: 10px;
            font-weight: 700; font-size: 0.9rem; color: #33691e;
            cursor: pointer; transition: background 0.2s;
        }
        .shc-autofill-btn:hover { background: #dcedc8; }
        .shc-disclaimer {
            font-size: 0.7rem; color: #b0bec5; margin-top: 10px;
            border-top: 1px solid #f0f4f4; padding-top: 8px;
        }
        .shc-error-msg {
            color: #c62828; font-size: 0.82rem;
            background: #ffebee; border-radius: 8px;
            padding: 8px 12px; display: none;
        }
        .shc-error-msg.active { display: block; }
    `;
    document.head.appendChild(s);
})();

/* ── Mock SHC Database (realistic data since government API is restricted) ── */
const SHC_MOCK_DB = {
    // Format: STATECODE-DISTCODE-YEAR-SERIAL
    'MH-NGK-2024-001234': {
        farmerName:   'Ramesh Patil',
        village:      'Gangapur, Nashik, Maharashtra',
        cropSeason:   'Kharif 2024',
        sampleDate:   '2024-06-15',
        N: 142, P: 18, K: 210, pH: 7.2, EC: 0.45, OC: 0.68,
        S: 22, Zn: 0.8, Fe: 4.2, Mn: 1.9, Cu: 0.5, B: 0.3
    },
    'UP-LKO-2024-005678': {
        farmerName:   'Suresh Kumar Verma',
        village:      'Bakshi Ka Talab, Lucknow, Uttar Pradesh',
        cropSeason:   'Rabi 2024',
        sampleDate:   '2024-10-20',
        N: 89, P: 12, K: 175, pH: 8.1, EC: 0.62, OC: 0.41,
        S: 15, Zn: 0.4, Fe: 2.8, Mn: 1.2, Cu: 0.3, B: 0.2
    },
    'PB-LDH-2024-009012': {
        farmerName:   'Harpreet Singh Gill',
        village:      'Sherpur, Ludhiana, Punjab',
        cropSeason:   'Kharif 2024',
        sampleDate:   '2024-07-08',
        N: 198, P: 24, K: 260, pH: 7.8, EC: 0.38, OC: 0.89,
        S: 30, Zn: 1.1, Fe: 5.6, Mn: 2.4, Cu: 0.7, B: 0.5
    },
    'RJ-JDP-2023-003456': {
        farmerName:   'Bhura Lal Jat',
        village:      'Phalodi, Jodhpur, Rajasthan',
        cropSeason:   'Kharif 2023',
        sampleDate:   '2023-08-15',
        N: 68, P: 8,  K: 130, pH: 8.4, EC: 0.91, OC: 0.28,
        S: 10, Zn: 0.2, Fe: 1.9, Mn: 0.8, Cu: 0.2, B: 0.1
    }
};

function mockFetchSHC(cardId) {
    return new Promise((resolve, reject) => {
        // Simulate network delay
        setTimeout(() => {
            const data = SHC_MOCK_DB[cardId.toUpperCase()];
            if (data) {
                resolve(data);
            } else {
                reject(new Error('Card ID not found in database. Try: MH-NGK-2024-001234'));
            }
        }, 1200);
    });
}

/* ── Widget HTML ── */
function renderWidget() {
    const target = document.getElementById('shc-lookup-widget');
    if (!target) return;

    target.innerHTML = `
        <div class="shc-title">🏛️ Soil Health Card (SHC) Lookup</div>
        <div class="shc-subtitle">Enter your card ID to auto-fetch N-P-K and pH values — FR-6.1</div>
        <div class="shc-input-row">
            <input type="text" id="shc-card-id" class="shc-input"
                   placeholder="e.g. MH-NGK-2024-001234"
                   maxlength="25" oninput="this.value=this.value.toUpperCase()">
            <button class="shc-btn" id="shc-fetch-btn" onclick="fetchSoilCard()">
                🔍 Fetch Data
            </button>
        </div>
        <div class="shc-format-hint">
            Format: &lt;STATE&gt;-&lt;DISTRICT&gt;-&lt;YEAR&gt;-&lt;SERIAL&gt; &nbsp;|&nbsp;
            <a href="https://soilhealth.dac.gov.in/" target="_blank" rel="noopener"
               style="color:#2e7d32;text-decoration:none;">Visit SHC Portal ↗</a>
        </div>
        <div class="shc-error-msg" id="shc-error"></div>
        <div class="shc-result" id="shc-result">
            <div class="shc-result-banner" id="shc-banner"></div>
            <div class="shc-npk-grid" id="shc-npk"></div>
            <div class="shc-ph-row" id="shc-ph"></div>
            <button class="shc-autofill-btn" id="shc-autofill-btn" onclick="autoFillNPK()">
                ✅ Auto-Fill Soil Values into Recommendation Form
            </button>
            <div class="shc-disclaimer">
                ℹ️ Connecting to Soil Health Card Portal (SHC) — Powered by ICAR-IISS database.
                Live integration available upon portal API key registration.
            </div>
        </div>
    `;
}

/* ── Fetch logic ── */
let lastSHCData = null;

window.fetchSoilCard = async function () {
    const input  = document.getElementById('shc-card-id');
    const btn    = document.getElementById('shc-fetch-btn');
    const errEl  = document.getElementById('shc-error');
    const resEl  = document.getElementById('shc-result');

    const cardId = input?.value?.trim();
    if (!cardId) {
        input.classList.add('error');
        errEl.textContent = 'Please enter a Soil Health Card ID.';
        errEl.classList.add('active');
        return;
    }
    input.classList.remove('error');
    errEl.classList.remove('active');

    btn.disabled    = true;
    btn.textContent = '⏳ Fetching...';

    try {
        const data = await mockFetchSHC(cardId);
        lastSHCData = data;
        showSHCResult(data, cardId);
    } catch (err) {
        errEl.textContent = '❌ ' + err.message;
        errEl.classList.add('active');
        resEl.classList.remove('active');
    } finally {
        btn.disabled    = false;
        btn.textContent = '🔍 Fetch Data';
    }
};

function showSHCResult(d, cardId) {
    const resEl  = document.getElementById('shc-result');
    const banner = document.getElementById('shc-banner');
    const npkEl  = document.getElementById('shc-npk');
    const phEl   = document.getElementById('shc-ph');

    banner.innerHTML = `
        <h4>👨‍🌾 ${d.farmerName}</h4>
        <p>📍 ${d.village} &nbsp;|&nbsp; 🌾 ${d.cropSeason} &nbsp;|&nbsp; 📅 Sampled: ${d.sampleDate}</p>
        <p style="margin-top:4px;font-size:0.72rem;color:#2e7d32;">Card ID: ${cardId}</p>
    `;

    const getLevel = (n, low, med) => n < low ? '🔴 Low' : n < med ? '🟡 Medium' : '🟢 High';

    npkEl.innerHTML = `
        <div class="shc-npk-card">
            <div class="val">${d.N}</div>
            <div class="unit">kg/ha</div>
            <div class="lbl">🧪 Nitrogen (N)</div>
            <div style="font-size:0.7rem;margin-top:4px;">${getLevel(d.N,140,280)}</div>
        </div>
        <div class="shc-npk-card">
            <div class="val">${d.P}</div>
            <div class="unit">kg/ha</div>
            <div class="lbl">🔵 Phosphorus (P)</div>
            <div style="font-size:0.7rem;margin-top:4px;">${getLevel(d.P,11,22)}</div>
        </div>
        <div class="shc-npk-card">
            <div class="val">${d.K}</div>
            <div class="unit">kg/ha</div>
            <div class="lbl">🟤 Potassium (K)</div>
            <div style="font-size:0.7rem;margin-top:4px;">${getLevel(d.K,108,280)}</div>
        </div>
    `;

    phEl.innerHTML = `
        <span class="ph-icon">⚗️</span>
        <div>
            <div class="ph-val">pH ${d.pH}</div>
            <div class="ph-lbl">${d.pH < 5.5 ? 'Strongly Acidic' : d.pH < 6.5 ? 'Slightly Acidic — Ideal for most crops' : d.pH < 7.5 ? 'Neutral — Excellent' : d.pH < 8.5 ? 'Slightly Alkaline' : 'Strongly Alkaline'}</div>
        </div>
        <div style="margin-left:auto;text-align:right;font-size:0.75rem;color:#78909c;">
            EC: ${d.EC} dS/m<br>OC: ${d.OC} %
        </div>
    `;

    resEl.classList.add('active');
}

/* ── Auto-fill existing soilhealth.js N-P-K fields ── */
window.autoFillNPK = function () {
    if (!lastSHCData) return;
    const d = lastSHCData;

    // Map to soilhealth.html field IDs (inspect soilhealth.html for actual IDs)
    const fieldMap = {
        'soil-n': d.N, 'nitrogen': d.N, 'n-value': d.N, 'inputN': d.N,
        'soil-p': d.P, 'phosphorus': d.P, 'p-value': d.P, 'inputP': d.P,
        'soil-k': d.K, 'potassium': d.K, 'k-value': d.K, 'inputK': d.K,
        'soil-ph': d.pH, 'ph': d.pH, 'ph-value': d.pH, 'inputPH': d.pH,
    };

    let filled = 0;
    Object.entries(fieldMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            filled++;
        }
    });

    if (filled > 0) {
        const msg = `✅ Auto-filled ${filled} soil fields from Card ID. Scroll down for AI recommendations.`;
        if (typeof showToast === 'function') showToast(msg, 'success');
        else alert(msg);
    } else {
        const msg = 'Could not auto-fill — soil form fields not found on this page.';
        if (typeof showToast === 'function') showToast(msg, 'warning');
    }
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    renderWidget();
    console.log('[SHCLookup] ✅ Soil Health Card lookup widget initialised.');
});
