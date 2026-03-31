// Frontend/buyer/livemandi.js
import { supabase } from '../supabase-config.js';

let priceChart;
let MANDI_DATA = [];

const API_KEY = '579b464db66ec23bdd000001a5cf39d16e784cc8443134f3844fa973';
const API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

// Real Mandi API Fetch
async function fetchLiveMandi() {
    try {
        const response = await fetch(`${API_URL}?api-key=${API_KEY}&format=json&limit=1000`);
        const result = await response.json();
        if (result.records) {
            MANDI_DATA = result.records;
            populateSelect(MANDI_DATA);
            updateView('Wheat');
        }
    } catch (err) {
        console.error("Mandi API Error:", err);
    }
}

function populateSelect(records) {
    const select = document.getElementById('cropSelect');
    const commodities = [...new Set(records.map(r => r.commodity))].sort();
    
    select.innerHTML = '';
    commodities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
}

function updateView(commodity) {
    const marketRecords = MANDI_DATA.filter(r => r.commodity === commodity);
    if (marketRecords.length === 0) return;

    // Sort by modal price to show range
    const prices = marketRecords.map(r => parseInt(r.modal_price)).sort((a,b) => a-b);
    const avg = Math.round(prices.reduce((a,b) => a+b, 0) / prices.length);
    const current = prices[prices.length - 1]; // Use highest as 'current top' for buyer info

    document.getElementById('currentPrice').innerText = `₹${current.toLocaleString('en-IN')}`;
    document.getElementById('avgPrice').innerText = `₹${avg.toLocaleString('en-IN')}`;

    // Update Trend
    const trendEl = document.getElementById('trendIndicator');
    const diff = current - avg;
    const percent = ((diff/avg)*100).toFixed(1);
    
    if (diff >= 0) {
        trendEl.className = 'trend-badge trend-up';
        trendEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${percent}% above avg`;
    } else {
        trendEl.className = 'trend-badge trend-down';
        trendEl.innerHTML = `<i class="fa-solid fa-arrow-down"></i> ${Math.abs(percent)}% below avg`;
    }

    renderChart(commodity, marketRecords);
}

function renderChart(commodity, records) {
    const canvas = document.getElementById('mandiChart');
    const ctx = canvas.getContext('2d');

    if (priceChart) priceChart.destroy();

    // Grouping by state for the chart (x-axis)
    const stateGroups = {};
    records.forEach(r => {
        if (!stateGroups[r.state]) stateGroups[r.state] = [];
        stateGroups[r.state].push(parseInt(r.modal_price));
    });

    const labels = Object.keys(stateGroups);
    const data = labels.map(s => Math.round(stateGroups[s].reduce((a,b) => a+b, 0) / stateGroups[s].length));

    priceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avg Market Price (₹/Qtl)',
                data: data,
                backgroundColor: 'rgba(46, 125, 50, 0.6)',
                borderColor: '#2e7d32',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });

    // Update Image (fallback to placeholder)
    document.getElementById('cropImage').src = `https://placehold.co/150?text=${commodity}`;
}

document.getElementById('cropSelect').addEventListener('change', (e) => {
    updateView(e.target.value);
});

// Start
fetchLiveMandi();
