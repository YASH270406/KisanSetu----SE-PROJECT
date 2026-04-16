// globalvoice.js - Universal Voice Navigation & Actions for KisanSetu

let globalRecognition = null;
let isGlobalListening = false;

function initGlobalVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("Speech recognition not supported in this browser.");
        return; 
    }

    globalRecognition = new SpeechRecognition();
    globalRecognition.lang = 'en-IN'; // Supports mixed Hindi & English
    globalRecognition.interimResults = false;

    globalRecognition.onresult = function(event) {
        let command = event.results[0][0].transcript.toLowerCase().trim();
        console.log("Global Voice Heard:", command);

        // ==========================================
        // SMART ACTIONS: Clicking buttons on the CURRENT page
        // ==========================================

        // 1. Sell Produce / My Listings Page
        if (command.includes('publish') || command.includes('submit crop') || command.includes('प्रकाशित')) {
            let btn = document.getElementById('voice-publish-btn');
            if(btn) { showVoiceToast("Publishing your listing..."); btn.click(); return; }
        }
        else if (command.includes('new listing') || command.includes('add harvest') || command.includes('नई लिस्टिंग')) {
            let btn = document.getElementById('voice-new-listing-btn');
            if(btn) { showVoiceToast("Creating new listing..."); btn.click(); return; }
        }

        // 2. Inventory Page
        else if (command.includes('add stock') || command.includes('new stock') || command.includes('नया स्टॉक')) {
            let btn = document.getElementById('voice-add-stock-btn');
            if(btn) { showVoiceToast("Opening Add Stock form..."); btn.click(); return; }
        }
        else if (command.includes('save stock') || command.includes('save inventory') || command.includes('सेव')) {
            let btn = document.getElementById('voice-save-stock-btn');
            if(btn) { showVoiceToast("Saving your stock..."); btn.click(); return; }
        }

        // 3. Soil Health & Schemes Page
        else if (command.includes('ask ai') || command.includes('soil advisor') || command.includes('सलाह')) {
            let btn = document.getElementById('voice-ask-ai-btn');
            if(btn) { showVoiceToast("Asking Krishi-AI..."); btn.click(); return; }
        }
        else if (command.includes('explain scheme') || command.includes('योजना समझाएं')) {
            let btn = document.getElementById('voice-explain-scheme-btn');
            if(btn) { showVoiceToast("Explaining scheme..."); btn.click(); return; }
        }


        // ==========================================
        // PAGE NAVIGATION: Teleporting if no action was found
        // ==========================================
        
        if (command.includes('dashboard') || command.includes('home') || command.includes('डैशबोर्ड') || command.includes('होम')) {
            showVoiceToast("Navigating to Dashboard...");
            window.location.href = 'farmer_dashboard.html';
        } 
        else if (command.includes('soil') || command.includes('मिट्टी') || command.includes('मृदा')) {
            showVoiceToast("Opening Soil Health...");
            window.location.href = 'soilhealth.html';
        }
        else if (command.includes('mandi') || command.includes('price') || command.includes('मंडी') || command.includes('भाव')) {
            showVoiceToast("Opening Mandi Prices...");
            window.location.href = 'Mandi_prices.html';
        }
        else if (command.includes('inventory') || command.includes('stock') || command.includes('इन्वेंटरी') || command.includes('स्टॉक')) {
            showVoiceToast("Opening Inventory...");
            window.location.href = 'inventory.html';
        }
        else if (command.includes('sell') || command.includes('produce') || command.includes('crop') || command.includes('बेचना') || command.includes('फसल')) {
            showVoiceToast("Opening Sell Produce...");
            window.location.href = 'sell_produce.html';
        }
        else if (command.includes('equipment') || command.includes('machine') || command.includes('tractor') || command.includes('उपकरण')) {
            showVoiceToast("Opening Equipment Search...");
            window.location.href = 'browse_equipment.html';
        }
        else if (command.includes('bid') || command.includes('auction') || command.includes('बोली') || command.includes('नीलामी')) {
            showVoiceToast("Opening Bids...");
            window.location.href = 'bid.html';
        }
        else if (command.includes('listing') || command.includes('my list') || command.includes('सूची')) {
            showVoiceToast("Opening My Listings...");
            window.location.href = 'my_listings.html';
        }
        else if (command.includes('payment') || command.includes('status') || command.includes('भुगतान') || command.includes('पैसा')) {
            showVoiceToast("Opening Payment Status...");
            window.location.href = 'payment_status.html';
        }
        else {
            showVoiceToast(`Heard: "${command}". Try saying a page name or action.`);
        }
    };

    globalRecognition.onend = function() {
        isGlobalListening = false;
        const micIcon = document.getElementById('global-mic-icon');
        if (micIcon) micIcon.style.color = ''; // Resets color
    };
}

function toggleGlobalVoice() {
    if (!globalRecognition) initGlobalVoice();

    if (isGlobalListening) {
        globalRecognition.stop();
    } else {
        globalRecognition.start();
        isGlobalListening = true;
        const micIcon = document.getElementById('global-mic-icon');
        if (micIcon) micIcon.style.color = 'red'; 
        showVoiceToast("Listening... Say a command.");
    }
}

function showVoiceToast(msg) {
    // Only alerts if you want a simple popup. You can replace this with your nice UI toasts!
    console.log("Krishi-AI Voice: " + msg); 
}

document.addEventListener('DOMContentLoaded', initGlobalVoice);