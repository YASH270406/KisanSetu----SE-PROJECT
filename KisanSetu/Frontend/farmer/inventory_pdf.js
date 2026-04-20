/**
 * inventory_pdf.js — KisanSetu Farmer Inventory PDF Export
 * FR-5.4: Generate downloadable PDF "Stock Summary Report"
 *
 * USES: jsPDF (CDN loaded by inventory.html — see integration note below)
 *
 * INTEGRATION: Add to inventory.html before closing </body>:
 *
 *   <!-- jsPDF CDN -->
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *   <!-- PDF Export Module -->
 *   <script src="inventory_pdf.js"></script>
 *
 * Then add a "📄 Download Report" button anywhere in inventory.html:
 *   <button class="btn-primary" id="btn-download-pdf" onclick="downloadStockReport()" style="background:#1565c0;">
 *       📄 Download Stock Report
 *   </button>
 *
 * The function reads window.inventory and window.LIVE_MANDI_PRICES automatically.
 */

'use strict';

/* ── Helper: wait for jsPDF to be available ── */
function waitForJsPDF() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            if (window.jspdf && window.jspdf.jsPDF) {
                clearInterval(check);
                resolve(window.jspdf.jsPDF);
            } else if (attempts > 50) {
                clearInterval(check);
                reject(new Error('jsPDF library not loaded. Please include the CDN script.'));
            }
        }, 100);
    });
}

/* ── Colour helpers ── */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

const COLORS = {
    primary:    '#1b6e35',
    accent:     '#2e7d32',
    warning:    '#e65100',
    danger:     '#c62828',
    lightGreen: '#e8f5e9',
    lightGrey:  '#f5f5f5',
    textDark:   '#263238',
    textMid:    '#546e7a',
    white:      '#ffffff',
};

/* ── Shelf life helpers ── */
const SHELF_LIFE_DB = {
    "Wheat":       365, "Rice":        365, "Tomato":       14,
    "Potato":      90,  "Onion":        60, "Cauliflower":   7,
    "Brinjal":     10,  "Bitter Gourd": 14, "Green Chilli": 10,
    "Cotton":      365, "Apple":        60, "Garlic":       180
};
const GRADE_MULTIPLIERS = { "A": 1.15, "B": 1.00, "C": 0.85 };

function getShelfStatus(item) {
    const maxDays  = SHELF_LIFE_DB[item.name] || 30;
    const dateAdded = item.dateAdded instanceof Date ? item.dateAdded : new Date(item.dateAdded);
    const daysOld  = Math.floor((Date.now() - dateAdded.getTime()) / 86400000);
    const daysLeft = maxDays - daysOld;
    const pct      = Math.max(0, (daysLeft / maxDays) * 100);
    const label    = pct < 15 ? 'CRITICAL' : pct < 40 ? 'Sell Soon' : 'Good';
    return { pct: Math.round(pct), daysLeft: Math.max(0, daysLeft), label };
}

/* ────────────────────────────────────────────────
   MAIN EXPORT FUNCTION
──────────────────────────────────────────────── */
window.downloadStockReport = async function () {
    const btn = document.getElementById('btn-download-pdf');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating PDF...'; }

    try {
        const jsPDF = await waitForJsPDF();

        // Read live data from inventory.js globals
        const inventory       = window.inventory || [];
        const mandiPrices     = window.LIVE_MANDI_PRICES || {};
        const farmerName      = (() => {
            const g = document.querySelector('.greeting');
            return g ? g.textContent.replace(/^Namaste,?\s*/i, '').trim() : 'Farmer';
        })();

        const produceItems = inventory.filter(i => i.category === 'produce');
        const inputItems   = inventory.filter(i => i.category !== 'produce');

        /* ── Setup PDF ── */
        const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw   = doc.internal.pageSize.getWidth();   // 210
        const ph   = doc.internal.pageSize.getHeight();  // 297
        let y = 0;

        /* ── Header Banner ── */
        doc.setFillColor(...hexToRgb(COLORS.primary));
        doc.rect(0, 0, pw, 38, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('KisanSetu', 14, 14);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Inventory Stock Summary Report', 14, 22);
        doc.text(`Farmer: ${farmerName}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}`, pw - 14, 30, { align: 'right' });
        y = 48;

        /* ── Portfolio Value Card ── */
        let totalPortfolioValue = 0;
        produceItems.forEach(item => {
            const base = mandiPrices[item.name] || 0;
            const mult = GRADE_MULTIPLIERS[item.grade] || 1;
            const pricePerQtl = base * mult;
            
            if (item.unit === 'Quintals') {
                totalPortfolioValue += item.qty * pricePerQtl;
            } else if (item.unit === 'Kg') {
                totalPortfolioValue += item.qty * (pricePerQtl / 100);
            } else if (item.unit === 'Bags') {
                totalPortfolioValue += item.qty * (pricePerQtl / 2);
            }
        });

        doc.setFillColor(...hexToRgb(COLORS.lightGreen));
        doc.roundedRect(14, y, pw - 28, 20, 3, 3, 'F');
        doc.setTextColor(...hexToRgb(COLORS.primary));
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Portfolio Value (Live Mandi Rates):', 20, y + 8);
        doc.setFontSize(14);
        doc.text(`Rs. ${Math.round(totalPortfolioValue).toLocaleString('en-IN')}`, 20, y + 17);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...hexToRgb(COLORS.textMid));
        doc.text(`${produceItems.length} produce batch(es)   |   ${inputItems.length} input stock(s)`, pw - 20, y + 17, { align: 'right' });
        y += 28;

        /* ── Section: Harvested Produce ── */
        if (produceItems.length > 0) {
            // Section heading
            doc.setFillColor(...hexToRgb(COLORS.accent));
            doc.rect(14, y, pw - 28, 9, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('HARVESTED PRODUCE INVENTORY', 18, y + 6);
            y += 12;

            // Table header
            const cols = [
                { label: 'Crop Name',       x: 14,  w: 38 },
                { label: 'Grade',           x: 53,  w: 16 },
                { label: 'Quantity',        x: 70,  w: 24 },
                { label: 'Shelf Life',      x: 95,  w: 26 },
                { label: 'Mandi (/Qtl)',    x: 122, w: 28 },
                { label: 'Batch Value',     x: 151, w: 30 },
                { label: 'Status',          x: 182, w: 24 },
            ];

            doc.setFillColor(...hexToRgb(COLORS.lightGrey));
            doc.rect(14, y, pw - 28, 8, 'F');
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...hexToRgb(COLORS.textDark));
            cols.forEach(c => doc.text(c.label, c.x + 1, y + 5.5));
            y += 9;

            let criticalCount = 0;
            produceItems.forEach((item, idx) => {
                const shelf = getShelfStatus(item);
                const base  = mandiPrices[item.name] || 0;
                const mult  = GRADE_MULTIPLIERS[item.grade] || 1;
                const pricePerQtl = base * mult;
                let batchVal = 0;
                if (item.unit === 'Quintals') batchVal = Math.round(item.qty * pricePerQtl);
                else if (item.unit === 'Kg') batchVal = Math.round(item.qty * (pricePerQtl / 100));
                else if (item.unit === 'Bags') batchVal = Math.round(item.qty * (pricePerQtl / 2));

                if (shelf.label === 'CRITICAL') criticalCount++;

                // Alternating row background
                if (idx % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(14, y, pw - 28, 8, 'F');
                }

                // Status colour
                const statusColor = shelf.label === 'CRITICAL' ? COLORS.danger :
                                    shelf.label === 'Sell Soon' ? COLORS.warning : COLORS.accent;
                doc.setTextColor(...hexToRgb(COLORS.textDark));
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');

                doc.text(item.name || '—',                                          cols[0].x + 1, y + 5.5);
                doc.text(`Grade ${item.grade || '—'}`,                              cols[1].x + 1, y + 5.5);
                doc.text(`${item.qty} ${item.unit}`,                                cols[2].x + 1, y + 5.5);
                doc.text(`${shelf.daysLeft}d left`,                                 cols[3].x + 1, y + 5.5);
                doc.text(base ? `Rs.${base}` : '—',                                cols[4].x + 1, y + 5.5);
                doc.text(batchVal ? `Rs.${batchVal.toLocaleString('en-IN')}` : '—',cols[5].x + 1, y + 5.5);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...hexToRgb(statusColor));
                doc.text(shelf.label,                                               cols[6].x + 1, y + 5.5);
                doc.setTextColor(...hexToRgb(COLORS.textDark));
                doc.setFont('helvetica', 'normal');

                y += 8;

                // Page break check
                if (y > ph - 30) {
                    doc.addPage();
                    y = 20;
                }
            });

            // Critical summary
            if (criticalCount > 0) {
                y += 3;
                doc.setFillColor(...hexToRgb('#ffebee'));
                doc.roundedRect(14, y, pw - 28, 10, 2, 2, 'F');
                doc.setTextColor(...hexToRgb(COLORS.danger));
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text(`⚠  ${criticalCount} batch(es) are CRITICAL — Immediate sale recommended!`, 18, y + 6.5);
                y += 14;
            } else {
                y += 5;
            }
        }

        /* ── Section: Farm Inputs ── */
        if (inputItems.length > 0) {
            if (y > ph - 50) { doc.addPage(); y = 20; }

            doc.setFillColor(...hexToRgb(COLORS.textMid));
            doc.rect(14, y, pw - 28, 9, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('FARM INPUTS STOCK', 18, y + 6);
            y += 12;

            const inputCols = [
                { label: 'Item Name', x: 14,  w: 80 },
                { label: 'Quantity',  x: 95,  w: 50 },
                { label: 'Unit',      x: 146, w: 40 },
            ];

            doc.setFillColor(...hexToRgb(COLORS.lightGrey));
            doc.rect(14, y, pw - 28, 8, 'F');
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...hexToRgb(COLORS.textDark));
            inputCols.forEach(c => doc.text(c.label, c.x + 1, y + 5.5));
            y += 9;

            inputItems.forEach((item, idx) => {
                if (idx % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(14, y, pw - 28, 8, 'F');
                }
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...hexToRgb(COLORS.textDark));
                doc.text(item.name || '—', inputCols[0].x + 1, y + 5.5);
                doc.text(String(item.qty), inputCols[1].x + 1, y + 5.5);
                doc.text(item.unit || '—', inputCols[2].x + 1, y + 5.5);
                y += 8;
                if (y > ph - 30) { doc.addPage(); y = 20; }
            });
            y += 5;
        }

        /* ── Footer ── */
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...hexToRgb(COLORS.textMid));
            doc.setDrawColor(...hexToRgb(COLORS.textMid));
            doc.line(14, ph - 12, pw - 14, ph - 12);
            doc.text('KisanSetu Platform — Confidential Stock Report', 14, ph - 7);
            doc.text(`Page ${i} of ${totalPages}`, pw - 14, ph - 7, { align: 'right' });
        }

        /* ── Save PDF ── */
        const filename = `KisanSetu_Stock_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(filename);

        // Show success toast
        if (typeof showToast === 'function') showToast('Report downloaded successfully!', 'success');

    } catch (err) {
        console.error('[PDF] Report generation failed:', err);
        alert('Could not generate PDF: ' + err.message + '\n\nMake sure jsPDF CDN script is included in the page.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '📄 Download Stock Report'; }
    }
};
