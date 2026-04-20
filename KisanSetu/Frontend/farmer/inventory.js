// 0. SUPABASE CONFIGURATION
// ==========================================
import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';

// ==========================================
// 1. DATA CONFIGURATION & CACHE
// ==========================================

let LIVE_MANDI_PRICES = {
    "Wheat": 2275, "Rice": 2900, "Tomato": 1850, "Potato": 1200,
    "Onion": 2100, "Cauliflower": 1500, "Brinjal": 1300, "Bitter Gourd": 2400,
    "Green Chilli": 3200, "Cotton": 7500, "Apple": 8000, "Garlic": 9500
}; 

const PREV_MANDI_PRICES = {
    "Wheat": 2250, "Rice": 2950, "Tomato": 1800, "Potato": 1200,
    "Onion": 2200, "Cauliflower": 1400, "Brinjal": 1350, "Bitter Gourd": 2300,
    "Green Chilli": 3100, "Cotton": 7600, "Apple": 7800, "Garlic": 9500
};

const SHELF_LIFE_DB = {
    "Wheat": 365, "Rice": 365, "Tomato": 14, "Potato": 90,
    "Onion": 60, "Cauliflower": 7, "Brinjal": 10, "Bitter Gourd": 14,
    "Green Chilli": 10, "Cotton": 365, "Apple": 60, "Garlic": 180
};

const GRADE_MULTIPLIERS = { "A": 1.15, "B": 1.00, "C": 0.85 };
const INPUT_OPTIONS = ["Urea (45kg Bag)", "DAP (50kg Bag)", "Pesticide (1L)"];

// ==========================================
// 2. LOCAL STORAGE (Survives Page Refresh)
// ==========================================

window.inventory = window.inventory || [];
let marketListings = [];

async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn("User not logged in. Falling back to local storage.");
        const savedInventory = localStorage.getItem('kisan_inventory_guest');
        if (savedInventory) {
            window.inventory = JSON.parse(savedInventory);
            window.inventory.forEach(item => item.dateAdded = new Date(item.dateAdded));
        }
        return;
    }

    try {
        // Fetch from Supabase
        const { data: cloudInventory, error } = await supabase
            .from('farmer_inventory')
            .select('*')
            .eq('farmer_id', user.id);

        if (error) throw error;

        // MIGRATION LOGIC: Check if local storage has data not in cloud
        const localKey = `kisan_inventory_${user.id}`;
        const savedInventoryStr = localStorage.getItem(localKey) || localStorage.getItem('kisan_inventory');
        let localInventory = savedInventoryStr ? JSON.parse(savedInventoryStr) : [];
        
        if (localInventory.length > 0 && cloudInventory.length === 0) {
            console.log("Migrating local data to cloud...");
            const migrationData = localInventory.map(item => ({
                farmer_id: user.id,
                category: item.category,
                item_name: item.name,
                item_grade: item.grade,
                quantity: item.qty,
                unit: item.unit,
                date_added: item.dateAdded
            }));
            
            const { error: syncErr } = await supabase.from('farmer_inventory').insert(migrationData);
            if (!syncErr) {
                localStorage.removeItem('kisan_inventory'); // Clear legacy general cache
                localStorage.removeItem(localKey);
                // Re-fetch to get IDs
                const { data: refreshed } = await supabase.from('farmer_inventory').select('*').eq('farmer_id', user.id);
                window.inventory = mapCloudToLocal(refreshed);
            }
        } else {
            window.inventory = mapCloudToLocal(cloudInventory);
        }
    } catch (err) {
        console.error("Failed to fetch cloud inventory:", err);
        // Fallback to local
        const userStr = user ? user.id : 'guest';
        const savedInventory = localStorage.getItem(`kisan_inventory_${userStr}`);
        if (savedInventory) {
            window.inventory = JSON.parse(savedInventory);
            window.inventory.forEach(item => item.dateAdded = new Date(item.dateAdded));
        }
    }

    // Listings (Marketplace) - these usually come from 'produce' table, 
    // but for now keeping them as is in local storage if used here.
    const savedListings = localStorage.getItem('kisan_listings');
    if (savedListings) marketListings = JSON.parse(savedListings);
}

function mapCloudToLocal(cloudItems) {
    return cloudItems.map(item => ({
        id: item.id,
        category: item.category,
        name: item.item_name,
        grade: item.item_grade,
        qty: item.quantity,
        unit: item.unit,
        totalBatches: item.total_batches || 1,
        batchSize: item.batch_size || item.quantity,
        dateAdded: new Date(item.date_added)
    }));
}

async function saveData(newItem = null) {
    // We update Supabase on "Save Stock" event directly.
    // This local saveData is kept to maintain a local cache for offline views.
    const { data: { user } } = await supabase.auth.getUser();
    const key = user ? `kisan_inventory_${user.id}` : 'kisan_inventory_guest';
    localStorage.setItem(key, JSON.stringify(window.inventory));
}

// ==========================================
// 3. LIVE API INTEGRATION
// ==========================================

const API_KEY = '579b464db66ec23bdd000001a5cf39d16e784cc8443134f3844fa973'; 
const API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070'; 

async function fetchLiveMandiPrices() {
    try {
        console.log("Fetching real-time Mandi prices for Inventory...");
        const fetchUrl = `${API_URL}?api-key=${API_KEY}&format=json&limit=5000`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error("API Network response was not ok");
        
        const apiData = await response.json();
        
        if (apiData && apiData.records) {
            apiData.records.forEach(record => {
                const cropName = record.commodity;
                const price = parseFloat(record.modal_price);
                if (!isNaN(price)) {
                     LIVE_MANDI_PRICES[cropName] = price; 
                }
            });
            window.LIVE_MANDI_PRICES = LIVE_MANDI_PRICES; // Expose globally for PDF Export
            console.log("Inventory Live Prices Successfully Loaded!", LIVE_MANDI_PRICES);
        }
    } catch (error) {
        console.error("API failed. Falling back to default prices.", error);
        window.LIVE_MANDI_PRICES = LIVE_MANDI_PRICES; // Still Expose local fallback
    }
}

// ==========================================
// 4. CORE LOGIC & INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Dashboard (Profile name, Image, Location, Logout)
    await initializeDashboard('Farmer');
    
    // 2. Load Local/Cloud Data
    await loadData(); 
    
    // 3. Update Market Prices & UI
    await fetchLiveMandiPrices(); 
    updateFormFields(); 
    renderDashboard();
});

function calculatePortfolioValue() {
    let totalValue = 0;
    window.inventory.forEach(item => {
        if (item.category === 'produce' && LIVE_MANDI_PRICES[item.name]) {
            const basePrice = LIVE_MANDI_PRICES[item.name];
            const multiplier = GRADE_MULTIPLIERS[item.grade] || 1;
            const pricePerQtl = basePrice * multiplier;
            
            // Normalize calculation based on unit. Mandi basePrice is always per Quintal (100 Kg).
            if (item.unit === 'Quintals') {
                totalValue += (item.qty * pricePerQtl);
            } else if (item.unit === 'Kg') {
                totalValue += (item.qty * (pricePerQtl / 100)); // 1 Qtl = 100 Kg
            } else if (item.unit === 'Bags') {
                totalValue += (item.qty * (pricePerQtl / 2)); // Approximation: 1 Bag ~ 50 Kg
            }
        }
    });
    document.getElementById('totalValueDisplay').innerText = `₹ ${totalValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
}

function getShelfLifeData(item) {
    if (item.category !== 'produce') return null;
    const maxDays = SHELF_LIFE_DB[item.name] || 30;
    const daysOld = Math.floor((new Date() - item.dateAdded) / (1000 * 60 * 60 * 24));
    const daysLeft = maxDays - daysOld;
    let percentage = (daysLeft / maxDays) * 100;
    if (percentage < 0) percentage = 0;

    let statusClass = 'bg-safe'; let statusText = `${daysLeft} days left`;
    if (percentage < 15) { statusClass = 'bg-critical'; statusText = `CRITICAL: ${daysLeft} days left!`; } 
    else if (percentage < 40) { statusClass = 'bg-warning'; statusText = `Sell Soon: ${daysLeft} days left`; }
    return { percentage, statusClass, statusText, isCritical: percentage < 15 };
}

function getMarketTrendHTML(cropName) {
    const currentPrice = LIVE_MANDI_PRICES[cropName];
    const prevPrice = PREV_MANDI_PRICES[cropName];
    if (!currentPrice || !prevPrice) return '';
    if (currentPrice > prevPrice) return `<span class="trend-up">▲ ₹${currentPrice - prevPrice}</span>`;
    if (currentPrice < prevPrice) return `<span class="trend-down">▼ ₹${prevPrice - currentPrice}</span>`;
    return `<span class="trend-neutral">―</span>`;
}

// ==========================================
// 5. UI RENDERING
// ==========================================

function renderDashboard() {
    calculatePortfolioValue();
    const produceContainer = document.getElementById('produceList');
    const inputContainer = document.getElementById('inputList');
    
    produceContainer.innerHTML = '';
    inputContainer.innerHTML = '';
    let criticalCount = 0;

    window.inventory.forEach(item => {
        if (item.category === 'produce') {
            const lifeData = getShelfLifeData(item);
            if (lifeData.isCritical) criticalCount++;
            
            const basePrice = LIVE_MANDI_PRICES[item.name];
            const multiplier = GRADE_MULTIPLIERS[item.grade] || 1;
            const adjustedPrice = basePrice ? (basePrice * multiplier) : 0;
            const currentValueText = adjustedPrice ? `₹${(item.qty * adjustedPrice).toLocaleString('en-IN', {maximumFractionDigits: 0})}` : 'Price Pending';
            
            const trendHTML = getMarketTrendHTML(item.name);
            const gradeBadge = `<span class="grade-badge grade-${item.grade}">Grade ${item.grade}</span>`;

            produceContainer.innerHTML += `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                        <h3 style="margin:0;">🌾 ${item.name} ${gradeBadge}</h3>
                        <div style="text-align: right;">
                            <span style="font-weight: bold; color: var(--primary-green); font-size: 1.1rem;">${currentValueText}</span>
                            <div style="font-size: 0.8rem; color: var(--charcoal); margin-top: 2px;">
                                Mandi: ₹${basePrice}/Qtl ${trendHTML}
                            </div>
                        </div>
                    </div>
                    <p style="color: var(--charcoal); font-weight: 600; font-size: 0.9rem;">Stock in Storage: <span style="color: var(--warning-orange);">${item.qty} ${item.unit}</span></p>
                    
                    <div style="margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--charcoal);">
                            <span>Shelf Life Status</span>
                            <span style="font-weight: bold;">${lifeData.statusText}</span>
                        </div>
                        <div class="progress-container">
                            <div class="progress-bar ${lifeData.statusClass}" style="width: ${lifeData.percentage}%"></div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn-primary btn-small" style="flex: 1;" onclick="openListingModal('${item.id}')">Sell on Market</button>
                    </div>
                </div>
            `;
        } else {
            inputContainer.innerHTML += `
                <div class="card">
                    <h3 style="margin-bottom: 5px;">🧪 ${item.name}</h3>
                    <p style="color: var(--charcoal); font-weight: 600;">Stock Available: ${item.qty} ${item.unit}</p>
                    <button class="btn-primary btn-outline btn-small" style="margin-top: 10px;" onclick="updateInputQuantity('${item.id}')">Update Quantity</button>
                </div>
            `;
        }
    });

    document.getElementById('riskDisplay').innerText = `${criticalCount} Batches`;
    if (criticalCount > 0) { document.getElementById('spoilageAlertCard').style.animation = "pulse 2s infinite"; } 
    else { document.getElementById('spoilageAlertCard').style.animation = "none"; }
}

// ==========================================
// 6. ADDING NEW INVENTORY LOGIC
// ==========================================

function switchTab(tabName) {
    document.getElementById('tabProduce').classList.remove('active');
    document.getElementById('tabInput').classList.remove('active');
    document.getElementById('produceList').style.display = 'none';
    document.getElementById('inputList').style.display = 'none';

    if (tabName === 'produce') {
        document.getElementById('tabProduce').classList.add('active');
        document.getElementById('produceList').style.display = 'block';
    } else {
        document.getElementById('tabInput').classList.add('active');
        document.getElementById('inputList').style.display = 'block';
    }
}

function toggleAddForm() {
    const form = document.getElementById('addStockForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function updateFormFields() {
    const category = document.getElementById('itemCategory').value;
    const nameSelect = document.getElementById('itemName');
    const gradeContainer = document.getElementById('qualityGradeContainer');
    nameSelect.innerHTML = '';

    if (category === 'produce') {
        gradeContainer.style.display = 'block';
        Object.keys(LIVE_MANDI_PRICES).forEach(crop => { nameSelect.innerHTML += `<option value="${crop}">${crop}</option>`; });
        document.getElementById('itemUnit').value = 'Quintals';
    } else {
        gradeContainer.style.display = 'none';
        INPUT_OPTIONS.forEach(input => { nameSelect.innerHTML += `<option value="${input}">${input}</option>`; });
        document.getElementById('itemUnit').value = 'Bags';
    }
}

document.getElementById('inventoryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    const category = document.getElementById('itemCategory').value;
    const name = document.getElementById('itemName').value;
    const grade = category === 'produce' ? document.getElementById('itemGrade').value : null;
    const qty = parseFloat(document.getElementById('itemQty').value);
    const unit = document.getElementById('itemUnit').value;
    const totalBatches = parseInt(document.getElementById('itemBatches').value) || 1;
    const batchSize = parseFloat((qty / totalBatches).toFixed(2));

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('farmer_inventory')
                .insert([{
                    farmer_id: user.id,
                    category: category,
                    item_name: name,
                    item_grade: grade,
                    quantity: qty,
                    unit: unit,
                    total_batches: totalBatches,
                    batch_size: batchSize
                }])
                .select()
                .single();

            if (error) throw error;

            window.inventory.push({
                id: data.id,
                category: data.category,
                name: data.item_name,
                grade: data.item_grade,
                qty: data.quantity,
                unit: data.unit,
                totalBatches: data.total_batches,
                batchSize: data.batch_size,
                dateAdded: new Date(data.date_added)
            });
        } else {
            // Fallback for guest mode (local only)
            const newItem = {
                id: Date.now(),
                category: category,
                name: name,
                grade: grade,
                qty: qty,
                unit: unit,
                totalBatches: totalBatches,
                batchSize: batchSize,
                dateAdded: new Date()
            };
            window.inventory.push(newItem);
        }

        saveData();
        toggleAddForm();
        this.reset();
        updateFormFields();
        renderDashboard();
    } catch (err) {
        console.error("Error saving to cloud:", err);
        alert("Failed to save to cloud. Storing locally.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// ==========================================
// 7. THE DEDUCTION / LISTING LOGIC
// ==========================================

function openListingModal(itemId) {
    const item = window.inventory.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('listItemId').value = item.id;
    document.getElementById('listingModalItemName').innerText = `${item.name} (Grade ${item.grade})`;
    document.getElementById('maxQtyLabel').innerText = `Max: ${item.qty}`;
    document.getElementById('listUnitLabel').innerText = item.unit;
    document.querySelectorAll('.unit-text').forEach(el => el.innerText = item.unit);

    const basePrice = LIVE_MANDI_PRICES[item.name] || 0;
    const multiplier = GRADE_MULTIPLIERS[item.grade] || 1;
    let suggested = basePrice * multiplier;
    
    if (item.unit === 'Kg') {
        suggested = suggested / 100;
    } else if (item.unit === 'Bags') {
        suggested = suggested / 2;
    }
    suggested = Math.round(suggested);
    
    document.getElementById('suggestedPriceLabel').innerText = `₹${suggested}`;
    document.getElementById('listPrice').value = suggested; 
    document.getElementById('listQty').max = item.qty;
    document.getElementById('listQty').value = item.qty; // Default to max
    
    // Default to existing total batches or 1
    document.getElementById('listBatches').value = item.totalBatches || 1;
    window.updateListBatchPreview();

    document.getElementById('listingModalOverlay').style.display = 'flex';
}

function closeListingModal() {
    document.getElementById('listingModalOverlay').style.display = 'none';
    document.getElementById('listingForm').reset();
}

document.getElementById('listingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Listing...';
    btn.disabled = true;

    const itemId = document.getElementById('listItemId').value;
    const qtyToList = parseFloat(document.getElementById('listQty').value);
    const askingPrice = parseFloat(document.getElementById('listPrice').value);
    const listBatches = parseInt(document.getElementById('listBatches').value) || 1;
    const listBatchSize = parseFloat((qtyToList / listBatches).toFixed(2));

    // Use current ID logic (Supabase uses UUID/UUID string, local uses Number)
    const itemIndex = window.inventory.findIndex(i => String(i.id) === String(itemId));
    
    if (itemIndex > -1) {
        const item = window.inventory[itemIndex];
        if (qtyToList > 0 && qtyToList <= item.qty) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                // 1. Create the Listing Record in 'produce' table (Marketplace)
                if (user) {
                    await supabase.from('produce').insert([{
                        farmer_id: user.id,
                        crop_name: item.name,
                        variety: item.grade ? `Grade ${item.grade}` : '',
                        quantity: qtyToList,
                        unit: item.unit,
                        price: askingPrice,
                        total_batches: listBatches,
                        batch_size: listBatchSize,
                        harvest_date: new Date().toISOString(),
                        status: 'Pending'
                    }]);

                    // 2. Subtract from Cloud Inventory
                    const newQty = item.qty - qtyToList;
                    if (newQty > 0) {
                        await supabase.from('farmer_inventory').update({ quantity: newQty }).eq('id', item.id);
                    } else {
                        await supabase.from('farmer_inventory').delete().eq('id', item.id);
                    }
                }

                // 3. Update Local State
                item.qty -= qtyToList;
                if (item.qty <= 0) {
                    window.inventory.splice(itemIndex, 1);
                }

                saveData();
                closeListingModal();
                renderDashboard();
                alert(`Success! ${qtyToList} ${item.unit} listed on Marketplace.`);
            } catch (err) {
                console.error("Listing error:", err);
                alert("Failed to list item. Please check your connection.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        } else {
            alert("Error: Invalid quantity.");
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
});

// ==========================================
// 8. PREVIEW HELPERS (BATCHES)
// ==========================================

window.updateLocalBatchPreview = function() {
    const qty = parseFloat(document.getElementById('itemQty').value);
    const batches = parseInt(document.getElementById('itemBatches').value);
    const unit = document.getElementById('itemUnit').value;
    const preview = document.getElementById('local-batch-preview');

    if (qty > 0 && batches > 0) {
        const each = (qty / batches).toFixed(2);
        document.getElementById('preview-local-batches').textContent = batches;
        document.getElementById('preview-local-each').textContent = `${each} ${unit}`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
};

window.updateListBatchPreview = function() {
    const qty = parseFloat(document.getElementById('listQty').value);
    const batches = parseInt(document.getElementById('listBatches').value);
    const unitLabel = document.getElementById('listUnitLabel').innerText;
    const preview = document.getElementById('list-batch-preview');

    if (qty > 0 && batches > 0) {
        const each = (qty / batches).toFixed(2);
        document.getElementById('preview-list-batches').textContent = batches;
        document.getElementById('preview-list-each').textContent = `${each} ${unitLabel}`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
};

window.updateInputQuantity = async function(itemId) {
    const itemIndex = window.inventory.findIndex(i => String(i.id) === String(itemId));
    if (itemIndex > -1) {
        const item = window.inventory[itemIndex];
        const newQtyStr = prompt(`Update quantity for ${item.name} (Current: ${item.qty} ${item.unit}):`, item.qty);
        if (newQtyStr !== null && newQtyStr.trim() !== '') {
            const newQty = parseFloat(newQtyStr);
            if (!isNaN(newQty) && newQty >= 0) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        if (newQty === 0) {
                            await supabase.from('farmer_inventory').delete().eq('id', item.id);
                        } else {
                            await supabase.from('farmer_inventory').update({ quantity: newQty }).eq('id', item.id);
                        }
                    }
                    
                    if (newQty === 0) {
                        window.inventory.splice(itemIndex, 1);
                    } else {
                        item.qty = newQty;
                    }
                    
                    saveData();
                    renderDashboard();
                } catch (err) {
                    console.error("Failed to update input quantity:", err);
                    alert("Failed to update in database. Check connection.");
                }
            } else {
                alert("Please enter a valid positive number or 0 to delete.");
            }
        }
    }
};

// EXPOSE TO WINDOW FOR HTML ONCLICK COMPATIBILITY
window.toggleAddForm = toggleAddForm;
window.updateFormFields = updateFormFields;
window.switchTab = switchTab;
window.openListingModal = openListingModal;
window.closeListingModal = closeListingModal;