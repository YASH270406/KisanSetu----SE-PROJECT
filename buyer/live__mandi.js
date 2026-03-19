let priceChart;

// Mock Historical Data Generator
function generateMockData(basePrice, volatility) {
    let data = [];
    let labels = [];
    let current = basePrice;
    
    for (let i = 30; i >= 0; i--) {
        let date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        
        // Random walk for price
        let change = (Math.random() - 0.5) * volatility;
        current = current + change;
        data.push(Math.round(current));
    }
    return { labels, data };
}

const cropDataMap = {
    "Wheat": generateMockData(2400, 50),
    "Tomato": generateMockData(1800, 150),
    "Onion": generateMockData(3000, 200)
};

function initChart(crop) {
    const ctx = document.getElementById('mandiChart').getContext('2d');
    const chartData = cropDataMap[crop];

    if (priceChart) priceChart.destroy();

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: `${crop} Price (₹/Qtl)`,
                data: chartData.data,
                borderColor: '#2e7d32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHitRadius: 10,
                fill: true,
                tension: 0.3 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, grid: { borderDash: [5, 5] } },
                x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } }
            }
        }
    });

    updateMetrics(chartData.data);
}

function updateMetrics(dataArray) {
    const current = dataArray[dataArray.length - 1];
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / dataArray.length);
    
    const diff = current - avg;
    const percentChange = ((diff / avg) * 100).toFixed(1);

    document.getElementById('currentPrice').innerText = `₹${current}`;
    document.getElementById('avgPrice').innerText = `₹${avg}`;

    const trendEl = document.getElementById('trendIndicator');
    const alertEl = document.getElementById('priceAlert');

    if (percentChange < 0) {
        trendEl.className = 'trend-down';
        trendEl.innerHTML = `↓ ${Math.abs(percentChange)}% vs Avg`;
        
        // SRS FR-7.1 Alert Logic (Rule 2)
        if (Math.abs(percentChange) >= 10) {
            alertEl.style.display = 'block';
        } else {
            alertEl.style.display = 'none';
        }
    } else {
        trendEl.className = 'trend-up';
        trendEl.innerHTML = `↑ ${percentChange}% vs Avg`;
        alertEl.style.display = 'none';
    }
}

document.getElementById('cropSelect').addEventListener('change', (e) => {
    initChart(e.target.value);
});

// Initialize on load
initChart('Wheat');