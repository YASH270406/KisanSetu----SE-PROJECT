const SCHEMES_DB = [
    { state: "UP", title: "PM-Kisan Subsidy Check", desc: "Check your installment status for PM-Kisan.", type: "success" },
    { state: "UP", title: "UP Solar Pump Yojana", desc: "Apply for 60% subsidy on solar water pumps.", type: "warning" },
    { state: "MH", title: "MahaDBT Fertilizer Subsidy", desc: "Direct benefit transfer for Kharif crop fertilizers.", type: "success" }
];

async function mockFetchSHC(shcId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() > 0.7) reject(new Error("Govt API Timeout"));
            else resolve({ N: 120, P: 15, K: 45 }); 
        }, 800);
    });
}

function generateRecommendation(n, p, k) {
    let recs = [];
    if (n < 150) recs.push("Apply Urea to boost Nitrogen.");
    if (p < 20) recs.push("Phosphorus is low; consider DAP.");
    if (k > 40) recs.push("Potassium is sufficient.");
    return recs.length > 0 ? recs.join(" ") : "Soil health is optimal.";
}

function setOfflineState(isOffline) {
    const fallbackBanner = document.getElementById('apiFallback');
    const syncIndicator = document.getElementById('syncIndicator');
    
    if (isOffline) {
        fallbackBanner.style.display = 'flex';
        syncIndicator.classList.add('offline');
        syncIndicator.innerHTML = '<div class="pulse-dot"></div> Offline';
    } else {
        fallbackBanner.style.display = 'none';
        syncIndicator.classList.remove('offline');
        syncIndicator.innerHTML = '<div class="pulse-dot"></div> Online';
    }
}

document.getElementById('fetchDataBtn').addEventListener('click', async () => {
    const shcId = document.getElementById('shcId').value;
    const resultsDiv = document.getElementById('resultsContainer');
    if (!shcId) return alert("Please enter an SHC ID");

    try {
        setOfflineState(false);
        const data = await mockFetchSHC(shcId);
        
        document.getElementById('valN').innerText = data.N;
        document.getElementById('valP').innerText = data.P;
        document.getElementById('valK').innerText = data.K;
        document.getElementById('recommendationText').innerText = generateRecommendation(data.N, data.P, data.K);
        
        resultsDiv.style.display = 'block';
    } catch (error) {
        setOfflineState(true);
        resultsDiv.style.display = 'block'; 
        
        document.getElementById('valN').innerText = "110";
        document.getElementById('valP').innerText = "18";
        document.getElementById('valK').innerText = "40";
        document.getElementById('recommendationText').innerText = "Showing last known recommendations: Apply light Urea.";
    }
});

function renderNews() {
    const state = document.getElementById('stateFilter').value;
    const feed = document.getElementById('newsFeed');
    feed.innerHTML = '';
    
    const filtered = SCHEMES_DB.filter(s => s.state === state);
    
    filtered.forEach(scheme => {
        // Utilizing the CSS alert-item styles you provided
        feed.innerHTML += `
            <div class="alert-item ${scheme.type}">
                <div class="alert-text">
                    <h4>${scheme.title}</h4>
                    <p>${scheme.desc}</p>
                </div>
            </div>
        `;
    });
}

document.getElementById('stateFilter').addEventListener('change', renderNews);
renderNews();