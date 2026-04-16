/**
 * voice_farmer.js — KisanSetu Farmer Voice Assistant
 * NFR-5.4: Real Web Speech API, bilingual Hindi + English, covers core Farmer functions.
 *
 * INTEGRATION: Add to any Farmer page HTML (replaces the broken toggleGlobalVoice call):
 *
 *   <script src="../farmer/voice_farmer.js"></script>
 *   OR
 *   <script src="voice_farmer.js"></script>  (when already in farmer/ directory)
 *
 * The mic button should have:  onclick="toggleFarmerVoice()"
 * and id="global-mic-icon"  (already present in all farmer pages)
 *
 * COMMANDS COVERED (Hindi + English):
 *   - Dashboard / Home
 *   - Inventory / Stock
 *   - Sell Produce / Listing
 *   - Mandi Prices
 *   - Soil Health / Fertilizer
 *   - Browse / Rent Equipment
 *   - My Listings
 *   - Payment Status
 *   - Add Stock (triggers form open)
 *   - Download Report (triggers PDF export)
 */

'use strict';

/* ── Inject pulse animation CSS ── */
(function injectVoiceStyles() {
    if (document.getElementById('ks-farmer-voice-styles')) return;
    const style = document.createElement('style');
    style.id = 'ks-farmer-voice-styles';
    style.textContent = `
        @keyframes farmerMicPulse {
            0%   { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.7); background: linear-gradient(135deg,#1b5e20,#43a047) !important; }
            70%  { box-shadow: 0 0 0 16px rgba(46, 125, 50, 0); background: linear-gradient(135deg,#2e7d32,#66bb6a) !important; }
            100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0);   background: linear-gradient(135deg,#1b5e20,#43a047) !important; }
        }
        .farmer-mic-listening {
            animation: farmerMicPulse 1s infinite !important;
        }
        #ks-voice-ui {
            position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
            background: rgba(27, 94, 32, 0.97); color: white;
            border-radius: 20px; padding: 14px 24px; z-index: 99990;
            display: none; font-family: 'Poppins','DM Sans',sans-serif;
            max-width: 320px; width: 90%; text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            animation: ks-slide-up 0.3s ease;
        }
        @keyframes ks-slide-up {
            from { opacity:0; transform: translateX(-50%) translateY(15px); }
            to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
        #ks-voice-ui .ks-vu-icon { font-size: 2rem; margin-bottom: 6px; }
        #ks-voice-ui .ks-vu-status { font-size: 0.85rem; opacity: 0.85; }
        #ks-voice-ui .ks-vu-hint {
            margin-top:8px; font-size:0.72rem; opacity:0.65;
            border-top: 1px solid rgba(255,255,255,0.2); padding-top:8px;
        }
    `;
    document.head.appendChild(style);
})();

/* ── Voice UI overlay ── */
function injectVoiceUI() {
    if (document.getElementById('ks-voice-ui')) return;
    const ui = document.createElement('div');
    ui.id = 'ks-voice-ui';
    ui.innerHTML = `
        <div class="ks-vu-icon">🎙️</div>
        <div id="ks-vu-status" class="ks-vu-status">सुन रहा हूँ... / Listening...</div>
        <div class="ks-vu-hint">
            Try: "Mandi", "Inventory", "Soil Health", "Sell", "Equipment", "Add Stock"<br>
            बोलिए: "मंडी", "स्टॉक", "मिट्टी", "बेचना है", "उपकरण किराया"
        </div>
    `;
    document.body.appendChild(ui);
}

/* ── Speech Recognition setup ── */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening  = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous      = false;
    recognition.lang            = 'hi-IN';   // Recognises Hinglish + Hindi + English
    recognition.interimResults  = false;
    recognition.maxAlternatives = 2;

    recognition.onstart = () => {
        isListening = true;
        const mic = document.getElementById('global-mic-icon');
        if (mic) mic.classList.add('farmer-mic-listening');
        const ui = document.getElementById('ks-voice-ui');
        if (ui) { ui.style.display = 'block'; }
        const statusEl = document.getElementById('ks-vu-status');
        if (statusEl) statusEl.textContent = 'सुन रहा हूँ... / Listening...';
    };

    recognition.onend = () => {
        isListening = false;
        const mic = document.getElementById('global-mic-icon');
        if (mic) mic.classList.remove('farmer-mic-listening');
        setTimeout(() => {
            const ui = document.getElementById('ks-voice-ui');
            if (ui) ui.style.display = 'none';
        }, 1500);
    };

    recognition.onerror = (e) => {
        isListening = false;
        const mic = document.getElementById('global-mic-icon');
        if (mic) mic.classList.remove('farmer-mic-listening');
        const ui = document.getElementById('ks-voice-ui');
        if (ui) ui.style.display = 'none';

        const msgs = {
            'no-speech':        'कोई आवाज़ नहीं मिली। फिर कोशिश करें।',
            'audio-capture':    'Microphone not found.',
            'not-allowed':      'Microphone access denied. Please allow in browser settings.',
            'network':          'Network error. Check your connection.'
        };
        farmerToast(msgs[e.error] || `Voice error: ${e.error}`, 'warning');
    };

    recognition.onresult = (e) => {
        // Try both alternatives for best match
        const transcript1 = e.results[0][0].transcript.toLowerCase().trim();
        const transcript2 = e.results[0][1]?.transcript?.toLowerCase().trim() || '';

        // Update UI
        const statusEl = document.getElementById('ks-vu-status');
        if (statusEl) statusEl.textContent = `"${transcript1}"`;

        farmerToast(`🎙️ "${transcript1}"`, 'success');

        setTimeout(() => {
            processFarmerCommand(transcript1) || processFarmerCommand(transcript2);
        }, 700);
    };
}

/* ──────────────────────────────────────────────
   COMMAND PROCESSOR (Hindi + English)
────────────────────────────────────────────── */
function processFarmerCommand(cmd) {
    if (!cmd) return false;

    // ── Dashboard / Home
    if (/dashboard|home|होम|घर|मुख्य|वापस|मेन|main/.test(cmd)) {
        navigateFarmer('farmer_dashboard.html'); return true;
    }
    // ── Inventory / Stock
    if (/inventory|stock|स्टॉक|भंडार|गोदाम|storage|storeroom/.test(cmd)) {
        navigateFarmer('inventory.html'); return true;
    }
    // ── Add Stock (special action)
    if (/add stock|add|नया स्टॉक|जोड़|stock add|नया/.test(cmd)) {
        if (typeof window.toggleAddForm === 'function') {
            window.toggleAddForm();
            farmerToast('Opening Add Stock form...', 'success');
        } else {
            navigateFarmer('inventory.html');
        }
        return true;
    }
    // ── Download Report (special action)
    if (/download|report|pdf|रिपोर्ट|डाउनलोड/.test(cmd)) {
        if (typeof window.downloadStockReport === 'function') {
            farmerToast('Generating PDF Report...', 'success');
            window.downloadStockReport();
        } else {
            farmerToast('PDF export is only available on the Inventory page.', 'info');
        }
        return true;
    }
    // ── Sell / List Produce
    if (/sell|बेचना|listing|list|बेचो|market|marketplace|उपज|produce/.test(cmd)) {
        navigateFarmer('sell_produce.html'); return true;
    }
    // ── My Listings
    if (/my listing|मेरी लिस्टिंग|my produce|view listing/.test(cmd)) {
        navigateFarmer('my_listings.html'); return true;
    }
    // ── Mandi Prices
    if (/mandi|price|दाम|भाव|रेट|मंडी|market price|live price/.test(cmd)) {
        navigateFarmer('Mandi_prices.html'); return true;
    }
    // ── Soil Health / Fertilizer
    if (/soil|soil health|fertilizer|मिट्टी|खाद|उर्वरक|khad|health card/.test(cmd)) {
        navigateFarmer('soilhealth.html'); return true;
    }
    // ── Browse / Rent Equipment
    if (/equipment|rent|tractor|ट्रैक्टर|किराया|रेंट|machine|उपकरण|यंत्र/.test(cmd)) {
        navigateFarmer('browse_equipment.html'); return true;
    }
    // ── Payment / Earnings
    if (/payment|earnings|paise|पैसे|भुगतान|कमाई|earn/.test(cmd)) {
        navigateFarmer('payment_status.html'); return true;
    }
    // ── Bid Inbox
    if (/bid|offer|बोली|ऑफर/.test(cmd)) {
        navigateFarmer('bid.html'); return true;
    }

    // Unrecognised
    farmerToast('समझ नहीं पाया। कहें: "मंडी", "स्टॉक", "बेचना", "मिट्टी", "उपकरण" / Say: "Mandi", "Stock", "Sell", "Soil", "Equipment"', 'warning');
    return false;
}

/* ── Navigate helper ── */
function navigateFarmer(page) {
    if (window.location.pathname.endsWith(page)) {
        farmerToast('आप पहले से इस पेज पर हैं। / Already on this page.', 'info');
        return;
    }
    farmerToast(`खुल रहा है... / Opening ${page}`, 'success');
    setTimeout(() => { window.location.href = page; }, 800);
}

/* ── Toggle function tied to mic button ── */
window.toggleGlobalVoice = function() {
    if (!recognition) {
        farmerToast('Voice not supported in this browser. Use Chrome.', 'error');
        return;
    }
    if (isListening) {
        try { recognition.stop(); } catch(e) {}
    } else {
        try { recognition.start(); } catch(e) {
            farmerToast('Could not start microphone.', 'error');
        }
    }
};

// Also expose as toggleFarmerVoice for backward compat
window.toggleFarmerVoice = window.toggleGlobalVoice;

/* ── Toast fallback ── */
function farmerToast(msg, type = 'info') {
    // Use existing global showToast if available
    if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
        return;
    }
    // Fallback minimal toast
    const colors = { success:'#2e7d32', error:'#c62828', warning:'#e65100', info:'#1565c0' };
    let wrap = document.getElementById('ks-farmer-toast-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'ks-farmer-toast-wrap';
        wrap.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:320px;width:90%;pointer-events:none;';
        document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.style.cssText = `background:${colors[type]||colors.info};color:white;padding:12px 18px;border-radius:12px;font-size:0.85rem;font-family:'Poppins',sans-serif;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,0.25);text-align:center;`;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 3000);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    injectVoiceUI();
    if (!SpeechRecognition) {
        const mic = document.getElementById('global-mic-icon');
        if (mic) {
            mic.title = 'Voice not supported. Use Chrome.';
            mic.style.opacity = '0.4';
        }
    }
    console.log('[FarmerVoice] ✅ Real Web Speech API initialised (hi-IN, bilingual).');
});
