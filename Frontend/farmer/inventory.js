const SHELF_LIFE_DATA = { "Tomato": 14, "Potato": 90, "Wheat": 365 };
let inventory = [];

document.getElementById('batchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const crop = document.getElementById('cropType').value;
    const qty = parseInt(document.getElementById('qty').value);
    const storage = document.getElementById('storageLoc').value;
    const harvestDateStr = document.getElementById('harvestDate').value;
    
    const harvestDate = new Date(harvestDateStr);
    const expiryDate = new Date(harvestDate);
    expiryDate.setDate(expiryDate.getDate() + SHELF_LIFE_DATA[crop]);

    inventory.push({ id: Date.now(), crop, qty, storage, harvestDate, expiryDate });
    
    this.reset();
    renderInventory();
    checkAlerts();
});

function getStockColorClass(qty) {
    if (qty > 100) return 'stock-high';
    if (qty >= 50) return 'stock-medium';
    return 'stock-low';
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    inventory.forEach(batch => {
        const row = document.createElement('tr');
        row.className = getStockColorClass(batch.qty);
        // Formatted to fit mobile screens better
        row.innerHTML = `
            <td><strong>${batch.crop}</strong></td>
            <td>${batch.qty} Q</td>
            <td>${batch.storage}</td>
            <td>${batch.expiryDate.toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });
}

function checkAlerts() {
    const alertsDiv = document.getElementById('expiryAlerts');
    const today = new Date();
    const alertThreshold = new Date();
    alertThreshold.setDate(today.getDate() + 3);

    const urgentBatches = inventory.filter(b => b.expiryDate <= alertThreshold && b.expiryDate >= today);
    
    if (urgentBatches.length > 0) {
        alertsDiv.style.display = 'block';
        alertsDiv.innerHTML = `<strong>⚠️ Action Required:</strong> ${urgentBatches.length} batch(es) expiring within 3 days!`;
    } else {
        alertsDiv.style.display = 'none';
    }
}

document.getElementById('downloadPdfBtn').addEventListener('click', () => {
    alert("Triggering PDF Generation...");
});