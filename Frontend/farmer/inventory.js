// Frontend/farmer/inventory.js
import { supabase } from '../supabase-config.js';
import { sendSystemNotification, initializeNotifications } from '../shared/notifications-manager.js';

// ==========================================
// 1. DATA CONFIGURATION & SHELF LIFE (FR-5.2)
// ==========================================

let LIVE_MANDI_PRICES = {
    "Wheat": 2275, "Rice": 2900, "Tomato": 1850, "Potato": 1200,
    "Onion": 2100, "Cauliflower": 1500, "Soyabean": 4500, "Cotton": 7500
};

const SHELF_LIFE_DB = {
    "Wheat": 365, "Rice": 365, "Tomato": 7, "Potato": 90,
    "Onion": 60, "Cauliflower": 5, "Soyabean": 180, "Cotton": 365,
    "Bags of Urea": 730, "Pesticide": 1095
};

const GRADE_MULTIPLIERS = { "A": 1.15, "B": 1.00, "C": 0.85 };
let inventoryData = [];

// ==========================================
// 2. CORE INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    await initializeNotifications();
    await loadData();
    updateFormFields();

    const form = document.getElementById('inventoryForm');
    if (form) {
        form.addEventListener('submit', handleAddStock);
    }
});

async function loadData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch from new 'inventory' table (FR-5.1)
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('farmer_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        inventoryData = data;
        renderDashboard();
        checkExpiryAlerts(user.id);
        
    } catch (err) {
        console.error("Fetch Error:", err);
        // Fallback to cache
        const cached = localStorage.getItem('ks_cache_inventory');
        if (cached) inventoryData = JSON.parse(cached);
        renderDashboard(true);
    }
}

// ==========================================
// 3. INVENTORY ACTIONS (FR-5.1, 5.2, 5.3)
// ==========================================

async function handleAddStock(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const itemName = document.getElementById('itemName').value;
        const category = document.getElementById('itemCategory').value;
        
        // Expiry Calculation (FR-5.2)
        const shelfLife = SHELF_LIFE_DB[itemName] || 30;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + shelfLife);

        const payload = {
            farmer_id: user.id,
            item_name: itemName,
            category: category,
            quantity: parseFloat(document.getElementById('itemQty').value),
            unit: document.getElementById('itemUnit').value,
            storage_location: document.getElementById('itemLocation').value,
            grade: document.getElementById('itemGrade').value,
            expiry_date: expiryDate.toISOString().split('T')[0]
        };

        const { error } = await supabase.from('inventory').insert(payload);
        if (error) throw error;

        alert(`Successfully added ${itemName} to ${payload.storage_location}`);
        toggleAddForm();
        await loadData();
        
    } catch (err) {
        alert("Error saving stock: " + err.message);
    } finally {
        btn.disabled = false;
    }
}

function checkExpiryAlerts(userId) {
    const today = new Date();
    inventoryData.forEach(item => {
        if (!item.expiry_date) return;
        
        const expiry = new Date(item.expiry_date);
        const daysToExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        // FR-5.3: Alert if within 3 days
        if (daysToExpiry > 0 && daysToExpiry <= 3) {
            sendSystemNotification(
                userId, 
                "⚠️ Stock Expiry Alert", 
                `Your ${item.item_name} in ${item.storage_location} will expire in ${daysToExpiry} days!`,
                'warning'
            );
        }
    });
}

// ==========================================
// 4. UI RENDERING
// ==========================================

function renderDashboard(isOffline = false) {
    const produceList = document.getElementById('produceList');
    const inputList = document.getElementById('inputList');
    const totalValueDisplay = document.getElementById('totalValueDisplay');
    const riskDisplay = document.getElementById('riskDisplay');

    produceList.innerHTML = '';
    inputList.innerHTML = '';
    
    let totalPortfolio = 0;
    let criticalCount = 0;
    const today = new Date();

    inventoryData.forEach(item => {
        const expiry = new Date(item.expiry_date);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        const isCritical = daysLeft <= 3;
        if (isCritical) criticalCount++;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <h3>${item.category === 'produce' ? '🌾' : '📦'} ${item.item_name}</h3>
                <span class="grade-badge grade-${item.grade}">Grade ${item.grade}</span>
            </div>
            <p style="font-size: 0.85rem; color: #666;">Location: <strong>${item.storage_location || 'Not Set'}</strong></p>
            <p>Stock: <span style="font-weight: bold; color: var(--primary-green);">${item.quantity} ${item.unit}</span></p>
            
            <div style="margin-top: 10px;">
                <progress value="${Math.max(0, daysLeft)}" max="30" style="width: 100%;"></progress>
                <small style="display: flex; justify-content: space-between; color: ${isCritical ? '#d32f2f' : '#666'};">
                    <span>${daysLeft > 0 ? daysLeft + ' days left' : 'EXPIRED'}</span>
                    <span>${item.expiry_date}</span>
                </small>
            </div>
        `;

        if (item.category === 'produce') {
            produceList.appendChild(card);
            // Calculate Value
            const rate = LIVE_MANDI_PRICES[item.item_name] || 2000;
            totalPortfolio += (item.quantity * rate * (GRADE_MULTIPLIERS[item.grade] || 1));
        } else {
            inputList.appendChild(card);
        }
    });

    totalValueDisplay.innerText = `₹ ${totalPortfolio.toLocaleString('en-IN')}`;
    riskDisplay.innerText = `${criticalCount} Batches`;
    localStorage.setItem('ks_cache_inventory', JSON.stringify(inventoryData));
}

// ==========================================
// 5. PDF GENERATION (FR-5.4)
// ==========================================

window.downloadStockReport = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(46, 125, 50);
    doc.text("KisanSetu | Stock Summary Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = inventoryData.map(item => [
        item.item_name,
        item.category.toUpperCase(),
        `${item.quantity} ${item.unit}`,
        item.storage_location || 'Main Storage',
        item.expiry_date,
        item.grade
    ]);

    doc.autoTable({
        startY: 35,
        head: [['Item', 'Category', 'Quantity', 'Location', 'Expiry', 'Grade']],
        body: tableData,
        headStyles: { fillColor: [46, 125, 50] }
    });

    doc.save(`KisanSetu_Stock_Report_${Date.now()}.pdf`);
};

// UI Helpers
window.toggleAddForm = () => {
    const form = document.getElementById('addStockForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.switchTab = (tab) => {
    document.getElementById('produceList').style.display = tab === 'produce' ? 'block' : 'none';
    document.getElementById('inputList').style.display = tab === 'input' ? 'block' : 'none';
    document.getElementById('tabProduce').classList.toggle('active', tab === 'produce');
    document.getElementById('tabInput').classList.toggle('active', tab === 'input');
};

window.updateFormFields = () => {
    const category = document.getElementById('itemCategory').value;
    const nameSelect = document.getElementById('itemName');
    nameSelect.innerHTML = '';

    const options = category === 'produce' 
        ? Object.keys(LIVE_MANDI_PRICES) 
        : ["Urea", "DAP", "Pesticide", "Seeds"];
    
    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.innerText = opt;
        nameSelect.appendChild(el);
    });
};
