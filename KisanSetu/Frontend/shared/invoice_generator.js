/**
 * invoice_generator.js — KisanSetu Shared Invoice Engine
 * 
 * Generates beautifully styled PDF invoices for 3 types:
 *   - 'buyer_trade'     → Buyer purchase invoice (from trackorders.js)
 *   - 'farmer_payment'  → Farmer sale receipt   (from payment_status.js)
 *   - 'equipment_rental'→ Equipment rental receipt (from rental_calendar_earnings.js)
 *
 * USAGE (via regular <script> tag, NOT module):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *   <script src="../shared/invoice_generator.js"></script>
 *
 * Then call:
 *   KisanInvoice.download('buyer_trade', { ... })
 *   KisanInvoice.download('farmer_payment', { ... })
 *   KisanInvoice.download('equipment_rental', { ... })
 */

'use strict';

(function (global) {

    /* ── Colour Palette ─────────────────────────────────────────────── */
    const C = {
        green:       [27,  110,  53],
        greenLight:  [232, 245, 233],
        greenDark:   [27,   94,  32],
        blue:        [21,  101, 192],
        blueLight:   [227, 242, 253],
        amber:       [230, 100,   0],
        amberLight:  [255, 243, 224],
        red:         [198,  40,  40],
        redLight:    [255, 235, 238],
        grey:        [84,  110, 122],
        greyLight:   [245, 245, 245],
        dark:        [38,   50,  56],
        white:       [255, 255, 255],
    };

    /* ── Helpers ──────────────────────────────────────────────────────── */
    function waitForJsPDF() {
        return new Promise((resolve, reject) => {
            let n = 0;
            const t = setInterval(() => {
                n++;
                if (window.jspdf && window.jspdf.jsPDF) {
                    clearInterval(t);
                    resolve(window.jspdf.jsPDF);
                } else if (n > 80) {
                    clearInterval(t);
                    reject(new Error('jsPDF library not loaded. Add CDN script tag to your HTML.'));
                }
            }, 100);
        });
    }

    function fmt(n) {
        // jsPDF Helvetica only supports Latin-1 (Windows-1252).
        // The Rupee sign (U+20B9) is NOT in Latin-1 and produces garbage bytes in PDF.
        // 'Rs.' is the safe, universally readable alternative.
        return 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }

    function fmtDate(d) {
        if (!d) return '-';
        const dt = d instanceof Date ? d : new Date(d);
        return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    /* ── Common PDF Header ─────────────────────────────────────────────── */
    function drawHeader(doc, pw, title, badgeText, badgeColor, txnId, dateStr) {
        // Dark green banner
        doc.setFillColor(...C.greenDark);
        doc.rect(0, 0, pw, 42, 'F');

        // Leaf icon circle
        doc.setFillColor(255, 255, 255, 40);
        doc.circle(pw - 26, 14, 18, 'F');

        // Brand name
        doc.setTextColor(...C.white);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('KisanSetu', 14, 16);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('National Agricultural Trading Platform', 14, 23);
        doc.text('Platform-Generated Document · No Signature Required', 14, 30);

        // Invoice label (right side)
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pw - 14, 16, { align: 'right' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`ID: ${txnId}`, pw - 14, 24, { align: 'right' });
        doc.text(`Date: ${dateStr}`, pw - 14, 31, { align: 'right' });

        // Badge strip
        doc.setFillColor(...(badgeColor || C.green));
        doc.rect(0, 42, pw, 11, 'F');
        doc.setTextColor(...C.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(badgeText || '', pw / 2, 49.5, { align: 'center' });
    }

    /* ── Section Heading ───────────────────────────────────────────────── */
    function drawSectionHeading(doc, pw, y, label, color) {
        doc.setFillColor(...(color || C.greyLight));
        doc.rect(14, y, pw - 28, 9, 'F');
        doc.setTextColor(...C.dark);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(label, 18, y + 6);
        return y + 12;
    }

    /* ── Info Row ──────────────────────────────────────────────────────── */
    function drawRow(doc, pw, y, label, value, shade) {
        if (shade) {
            doc.setFillColor(...C.greyLight);
            doc.rect(14, y, pw - 28, 9, 'F');
        }
        doc.setTextColor(...C.grey);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(label, 18, y + 6);
        doc.setTextColor(...C.dark);
        doc.setFont('helvetica', 'bold');
        doc.text(String(value || '—'), pw - 18, y + 6, { align: 'right' });
        return y + 9;
    }

    /* ── Divider line ──────────────────────────────────────────────────── */
    function drawDivider(doc, pw, y) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(14, y, pw - 14, y);
        return y + 6;
    }

    /* ── Total Box ─────────────────────────────────────────────────────── */
    function drawTotal(doc, pw, y, label, amount, color) {
        doc.setFillColor(...(color || C.green));
        doc.roundedRect(14, y, pw - 28, 16, 3, 3, 'F');
        doc.setTextColor(...C.white);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(label, 18, y + 10.5);
        doc.setFontSize(13);
        doc.text(fmt(amount), pw - 18, y + 10.5, { align: 'right' });
        return y + 22;
    }

    /* ── Note Box ──────────────────────────────────────────────────────── */
    function drawNote(doc, pw, y, text, color, textColor) {
        const bgColor = color || C.blueLight;
        const tc = textColor || C.blue;
        doc.setFillColor(...bgColor);
        doc.roundedRect(14, y, pw - 28, 14, 3, 3, 'F');
        doc.setTextColor(...tc);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(text, pw - 40);
        doc.text(lines, 18, y + 6);
        return y + 14 + (lines.length > 1 ? (lines.length - 1) * 5 : 0) + 4;
    }

    /* ── Footer ────────────────────────────────────────────────────────── */
    function drawFooter(doc, pw, ph) {
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(...C.grey);
            doc.setLineWidth(0.3);
            doc.line(14, ph - 14, pw - 14, ph - 14);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.grey);
            doc.text('KisanSetu | kisansetu.in | support@kisansetu.in', 14, ph - 8);
            doc.text(`Page ${i} of ${totalPages}`, pw - 14, ph - 8, { align: 'right' });
        }
    }

    /* ════════════════════════════════════════════════════════════════════
       TYPE 1: BUYER TRADE INVOICE
       data: { txnId, cropName, variety, qty, unit, batchCount, batchSize,
               dealPrice, amount, farmerName, buyerName, orderDate, status }
    ════════════════════════════════════════════════════════════════════ */
    async function buyerTradeInvoice(data) {
        const jsPDF   = await waitForJsPDF();
        const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw      = doc.internal.pageSize.getWidth();
        const ph      = doc.internal.pageSize.getHeight();
        const shortId = (data.txnId || '').slice(0, 8).toUpperCase();
        const dateStr = fmtDate(data.orderDate || new Date());
        const isSettled = (data.status || '') === 'Settled';

        const badgeColor = isSettled ? C.green : C.blue;
        const badgeText  = isSettled
            ? '[OK] PAYMENT CONFIRMED - TRANSACTION SETTLED'
            : '[ESCROW] PAYMENT IN ESCROW - AWAITING DELIVERY CONFIRMATION';

        drawHeader(doc, pw, 'PURCHASE INVOICE', badgeText, badgeColor, `TXN-${shortId}`, dateStr);
        let y = 60;

        // Party info
        y = drawSectionHeading(doc, pw, y, 'PARTIES', C.greyLight);
        y = drawRow(doc, pw, y, 'Buyer', data.buyerName || 'KisanSetu Buyer', true);
        y = drawRow(doc, pw, y, 'Seller (Farmer)', data.farmerName || 'Verified Farmer', false);
        y = drawRow(doc, pw, y, 'Platform', 'KisanSetu Marketplace', true);
        y += 6;

        // Item
        y = drawSectionHeading(doc, pw, y, 'TRANSACTION DETAILS', C.greenLight);
        y = drawRow(doc, pw, y, 'Commodity', data.cropName + (data.variety ? ` (${data.variety})` : ''), true);
        y = drawRow(doc, pw, y, 'Quantity', `${data.qty} ${data.unit}`, false);
        y = drawRow(doc, pw, y, 'Batches', `${data.batchCount} x ${data.batchSize} ${data.unit}`, true);
        y = drawRow(doc, pw, y, 'Deal Price', `${fmt(data.dealPrice)} per ${data.unit}`, false);
        y = drawRow(doc, pw, y, 'GST / Platform Fee', 'Included (Agri exemption applies)', true);
        y = drawRow(doc, pw, y, 'Transaction ID', `TXN-${shortId}`, false);
        y = drawRow(doc, pw, y, 'Date', dateStr, true);
        y += 6;

        // Total
        y = drawTotal(doc, pw, y, 'Total Amount', data.amount, badgeColor);

        // Escrow note
        if (!isSettled) {
            y = drawNote(doc, pw, y,
                '[ESCROW] Escrow Notice: Funds are securely held by KisanSetu. Payment is released to the farmer only after you confirm receipt of goods. If any issue arises, raise a dispute within 48 hours.',
                C.amberLight, C.amber);
        } else {
            y = drawNote(doc, pw, y,
                '[SETTLED] Payment has been successfully released from escrow to the farmer. This invoice is your permanent proof of purchase.',
                C.greenLight, C.greenDark);
        }

        // QR placeholder note
        y = drawNote(doc, pw, y,
            'This is a system-generated electronic invoice. No physical signature or stamp is required. Retain this document for tax purposes.',
            C.greyLight, C.grey);

        drawFooter(doc, pw, ph);
        doc.save(`KisanSetu_Invoice_TXN-${shortId}.pdf`);
    }

    /* ════════════════════════════════════════════════════════════════════
       TYPE 2: FARMER PAYMENT RECEIPT
       data: { txnId, cropName, amount, status, buyerRef, created_at,
               farmerName, quantity, unit }
    ════════════════════════════════════════════════════════════════════ */
    async function farmerPaymentReceipt(data) {
        const jsPDF   = await waitForJsPDF();
        const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw      = doc.internal.pageSize.getWidth();
        const ph      = doc.internal.pageSize.getHeight();
        const shortId = (data.txnId || '').slice(0, 8).toUpperCase();
        const dateStr = fmtDate(data.created_at || new Date());
        const status  = (data.status || '').replace('_', ' ');

        const isSettled  = data.status === 'Settled';
        const isEscrow   = data.status === 'Escrow_Held';
        const isTransit  = data.status === 'InTransit';

        let badgeColor, badgeText;
        if (isSettled) {
            badgeColor = C.green;
            badgeText  = '[SETTLED] PAYMENT SETTLED - FUNDS DISBURSED TO YOUR ACCOUNT';
        } else if (isTransit) {
            badgeColor = C.blue;
            badgeText  = '[TRANSIT] GOODS IN TRANSIT - ESCROW ACTIVE';
        } else if (isEscrow) {
            badgeColor = C.amber;
            badgeText  = '[ESCROW] PAYMENT HELD IN ESCROW - PENDING DELIVERY CONFIRMATION';
        } else {
            badgeColor = C.grey;
            badgeText  = `STATUS: ${status.toUpperCase()}`;
        }

        drawHeader(doc, pw, 'PAYMENT RECEIPT', badgeText, badgeColor, `REF-${shortId}`, dateStr);
        let y = 60;

        y = drawSectionHeading(doc, pw, y, 'SALE DETAILS', C.greenLight);
        y = drawRow(doc, pw, y, 'Farmer', data.farmerName || 'Registered Farmer', true);
        y = drawRow(doc, pw, y, 'Crop / Product', data.cropName || 'Agri-Product', false);
        y = drawRow(doc, pw, y, 'Quantity', data.quantity ? `${data.quantity} ${data.unit || ''}` : '-', true);
        y = drawRow(doc, pw, y, 'Transaction Ref', `REF-${shortId}`, false);
        y = drawRow(doc, pw, y, 'Sale Date', dateStr, true);
        y = drawRow(doc, pw, y, 'Payment Status', status, false);
        y += 6;

        y = drawTotal(doc, pw, y, 'Amount Receivable', data.amount, badgeColor);

        if (isSettled) {
            y = drawNote(doc, pw, y,
                '[OK] Your funds have been released from escrow. Please check your registered bank account or UPI handle for the credit. Allow 1-2 business days for bank processing.',
                C.greenLight, C.greenDark);
        } else {
            y = drawNote(doc, pw, y,
                '[HOLD] Your payment is securely held in KisanSetu Escrow. Funds will be released once the buyer confirms receipt of goods. No action required from your end.',
                C.amberLight, C.amber);
        }

        y = drawNote(doc, pw, y,
            'This is a system-generated payment receipt for your records. Produced by the KisanSetu marketplace platform.',
            C.greyLight, C.grey);

        drawFooter(doc, pw, ph);
        doc.save(`KisanSetu_PaymentReceipt_REF-${shortId}.pdf`);
    }

    /* ════════════════════════════════════════════════════════════════════
       TYPE 3: EQUIPMENT RENTAL INVOICE
       data: { bookingId, equipName, equipType, ownerName, farmerName,
               farmerPhone, farmerVillage, startDate, endDate, days,
               hoursPerDay, hourlyRate, totalCost, purpose }
    ════════════════════════════════════════════════════════════════════ */
    async function equipmentRentalInvoice(data) {
        const jsPDF   = await waitForJsPDF();
        const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw      = doc.internal.pageSize.getWidth();
        const ph      = doc.internal.pageSize.getHeight();
        const bkId    = data.bookingId || 'BK-UNKNOWN';
        const dateStr = fmtDate(data.startDate || new Date());

        drawHeader(doc, pw, 'RENTAL INVOICE', '[RENTAL] EQUIPMENT RENTAL - CONFIRMED BOOKING', C.green, bkId, dateStr);
        let y = 60;

        // Equipment info
        y = drawSectionHeading(doc, pw, y, 'EQUIPMENT DETAILS', C.greenLight);
        y = drawRow(doc, pw, y, 'Equipment', data.equipName || '-', true);
        y = drawRow(doc, pw, y, 'Type', data.equipType || '-', false);
        y = drawRow(doc, pw, y, 'Owner', data.ownerName || 'KisanSetu Owner', true);
        y += 6;

        // Client info
        y = drawSectionHeading(doc, pw, y, 'CLIENT DETAILS', C.greyLight);
        y = drawRow(doc, pw, y, 'Farmer Name', data.farmerName || '-', true);
        y = drawRow(doc, pw, y, 'Contact', data.farmerPhone || '-', false);
        y = drawRow(doc, pw, y, 'Village / Location', data.farmerVillage || '-', true);
        y += 6;

        // Rental details
        y = drawSectionHeading(doc, pw, y, 'RENTAL PERIOD & PRICING', C.greyLight);
        y = drawRow(doc, pw, y, 'Start Date', fmtDate(data.startDate), true);
        y = drawRow(doc, pw, y, 'End Date', fmtDate(data.endDate), false);
        y = drawRow(doc, pw, y, 'Duration', `${data.days} day${data.days > 1 ? 's' : ''}`, true);
        y = drawRow(doc, pw, y, 'Hours per Day', `${data.hoursPerDay} hrs`, false);
        y = drawRow(doc, pw, y, 'Rate per Hour', fmt(data.hourlyRate), true);
        y = drawRow(doc, pw, y, 'Purpose', data.purpose || 'Agricultural Use', false);
        y += 6;

        // Cost breakdown
        y = drawSectionHeading(doc, pw, y, 'COST BREAKDOWN', C.greyLight);
        const totalHours = (data.days || 1) * (data.hoursPerDay || 0);
        y = drawRow(doc, pw, y, `${totalHours} hrs x ${fmt(data.hourlyRate)}/hr`, fmt(data.totalCost), true);
        y = drawRow(doc, pw, y, 'Platform Fee', 'Waived (Agri Scheme)', false);
        y += 6;

        y = drawTotal(doc, pw, y, 'Total Rental Cost', data.totalCost, C.green);

        y = drawNote(doc, pw, y,
            '[OK] This booking was confirmed through the KisanSetu Equipment Marketplace. The rental amount has been recorded in the earnings ledger for the owner.',
            C.greenLight, C.greenDark);

        y = drawNote(doc, pw, y,
            'For disputes or breakdowns, contact KisanSetu Support: support@kisansetu.in | Helpline: 1800-XXX-XXXX',
            C.greyLight, C.grey);

        drawFooter(doc, pw, ph);
        doc.save(`KisanSetu_RentalInvoice_${bkId}.pdf`);
    }

    /* ════════════════════════════════════════════════════════════════════
       PUBLIC API
    ════════════════════════════════════════════════════════════════════ */
    global.KisanInvoice = {
        /**
         * @param {'buyer_trade'|'farmer_payment'|'equipment_rental'} type
         * @param {object} data  — See type-specific fields above
         * @param {HTMLElement|null} [btnEl] — Optional button to show loading state
         */
        download: async function (type, data, btnEl) {
            const origHTML = btnEl ? btnEl.innerHTML : null;
            try {
                if (btnEl) {
                    btnEl.disabled = true;
                    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...';
                }
                if (type === 'buyer_trade')      await buyerTradeInvoice(data);
                else if (type === 'farmer_payment') await farmerPaymentReceipt(data);
                else if (type === 'equipment_rental') await equipmentRentalInvoice(data);
                else throw new Error(`Unknown invoice type: "${type}"`);

                if (typeof showToast === 'function')
                    showToast('Invoice downloaded!', 'success');
                else if (typeof window.showToast === 'function')
                    window.showToast('Invoice downloaded!', 'success');

            } catch (err) {
                console.error('[KisanInvoice] PDF generation failed:', err);
                const msg = err.message.includes('jsPDF')
                    ? 'PDF library not loaded. Check your internet connection and reload.'
                    : 'Could not generate PDF: ' + err.message;
                alert(msg);
            } finally {
                if (btnEl && origHTML) {
                    btnEl.disabled = false;
                    btnEl.innerHTML = origHTML;
                }
            }
        }
    };

}(window));
