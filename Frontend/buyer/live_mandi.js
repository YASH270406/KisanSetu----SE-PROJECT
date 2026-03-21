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
    "Wheat": { price: 2400, vol: 50 },
    "Tomato": { price: 1800, vol: 150 },
    "Onion": { price: 3000, vol: 200 },
    "Rice": { price: 2100, vol: 60 },
    "Potato": { price: 800, vol: 40 },
    "Cauliflower": { price: 1500, vol: 100 },
    "Brinjal": { price: 2200, vol: 90 },
    "Bitter gourd": { price: 4500, vol: 300 },
    "Green Chilli": { price: 5500, vol: 400 },
    "Garlic": { price: 8500, vol: 500 },
    "Apple": { price: 12000, vol: 600 },
    "Cotton": { price: 6500, vol: 200 }
};

// Generate full datasets
for (let crop in cropDataMap) {
    if (!cropDataMap[crop].labels) {
        cropDataMap[crop] = generateMockData(cropDataMap[crop].price, cropDataMap[crop].vol);
    }
}

const imageMap = {
    'wheat': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=300&q=80',
    'tomato': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80',
    'potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=300&q=80',
    'onion': 'https://images.unsplash.com/photo-1620574387735-3624d75b2dbc?auto=format&fit=crop&w=300&q=80',
    'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80',
    'garlic': 'https://images.unsplash.com/photo-1588162231267-bc18b0e71954?auto=format&fit=crop&w=300&q=80',
    'apple': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6fac6?auto=format&fit=crop&w=300&q=80',
    'cotton': 'https://images.unsplash.com/photo-1584824486516-0555a07fc511?auto=format&fit=crop&w=300&q=80',
    'cauliflower': 'https://images.unsplash.com/photo-1568584716946-ebcd2f33de14?auto=format&fit=crop&w=300&q=80',
    'bitter gourd': 'https://images.unsplash.com/photo-1628169222340-9b5cc1a63c63?auto=format&fit=crop&w=300&q=80',
    'brinjal': 'https://images.unsplash.com/photo-1601366164215-dc5dc6438a20?auto=format&fit=crop&w=300&q=80',
    'green chilli': 'https://images.unsplash.com/photo-1585093751287-c1dcb7b11cf7?auto=format&fit=crop&w=300&q=80'
};

function initChart(crop) {
    const canvas = document.getElementById('mandiChart');
    const ctx = canvas.getContext('2d');
    const chartData = cropDataMap[crop];

    if (priceChart) priceChart.destroy();

    // Create a smooth vertical gradient for the line fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(46, 125, 50, 0.4)'); // Primary Green
    gradient.addColorStop(1, 'rgba(46, 125, 50, 0.0)');

    // Ensure global font is Poppins
    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.color = "#37474f";

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: `Price / Qtl`,
                data: chartData.data,
                borderColor: '#2e7d32',
                backgroundColor: gradient,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#2e7d32',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.4 // Smooth cubic bezier curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(55, 71, 79, 0.9)',
                    titleFont: { family: 'Poppins', size: 12, weight: 'normal' },
                    bodyFont: { family: 'Poppins', size: 14, weight: 'bold' },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '₹ ' + context.parsed.y.toLocaleString('en-IN');
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: false, 
                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                    ticks: { font: { family: 'Poppins', size: 11 }, callback: function(value) { return '₹' + value; } }
                },
                x: { 
                    grid: { display: false, drawBorder: false }, 
                    ticks: { font: { family: 'Poppins', size: 11 }, maxTicksLimit: 6 } 
                }
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

    document.getElementById('currentPrice').innerText = `₹${current.toLocaleString('en-IN')}`;
    document.getElementById('avgPrice').innerText = `₹${avg.toLocaleString('en-IN')}`;

    const trendEl = document.getElementById('trendIndicator');
    const alertEl = document.getElementById('priceAlert');
    const imgEl = document.getElementById('cropImage');

    if (percentChange < 0) {
        trendEl.className = 'trend-badge trend-down';
        trendEl.innerHTML = `<i class="fa-solid fa-arrow-down"></i> ${Math.abs(percentChange)}% vs Avg`;
        
        if (Math.abs(percentChange) >= 10) {
            alertEl.style.display = 'flex'; // Use flex for alert formatting
        } else {
            alertEl.style.display = 'none';
        }
    } else {
        trendEl.className = 'trend-badge trend-up';
        trendEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${percentChange}% vs Avg`;
        alertEl.style.display = 'none';
    }
}

function updateImage(crop) {
    const imgEl = document.getElementById('cropImage');
    const lowerCrop = crop.toLowerCase();
    
    // Fallback logic
    let src = `https://placehold.co/150x150/e8f5e9/2e7d32?text=${crop.charAt(0)}`;
    
    if (imageMap[lowerCrop]) {
        src = imageMap[lowerCrop];
    }
    
    imgEl.src = src;
}

document.getElementById('cropSelect').addEventListener('change', (e) => {
    initChart(e.target.value);
    updateImage(e.target.value);
});

// Initialize on load
function setup() {
    const select = document.getElementById('cropSelect');
    select.innerHTML = '';
    Object.keys(cropDataMap).forEach(crop => {
        let opt = document.createElement('option');
        opt.value = crop;
        opt.textContent = crop;
        select.appendChild(opt);
    });

    initChart('Wheat');
    updateImage('Wheat');
}

setup();