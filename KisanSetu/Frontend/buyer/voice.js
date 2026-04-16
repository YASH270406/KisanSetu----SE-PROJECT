/**
 * KisanSetu - BUYER Global Voice Assistant
 * Handles bilingual (English + Hindi) voice navigation specifically for Buyers.
 */

// Inject dynamic styles for the glowing microphone animation
if (!document.getElementById('voice-assistant-styles')) {
    const style = document.createElement('style');
    style.id = 'voice-assistant-styles';
    style.innerHTML = `
        @keyframes micPulseGlobal {
            0% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.6); background: #d32f2f !important; color: white !important; }
            70% { box-shadow: 0 0 0 15px rgba(211, 47, 47, 0); background: #ef5350 !important; color: white !important; }
            100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); background: #d32f2f !important; color: white !important; }
        }
        .mic-listening {
            animation: micPulseGlobal 1s infinite !important;
            border-color: #d32f2f !important;
        }
    `;
    document.head.appendChild(style);
}

// Initialize Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    // Set to 'hi-IN' to easily capture Hindi and Indian-accented English
    recognition.lang = 'hi-IN'; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        const micBtn = document.getElementById('global-mic-icon');
        if (micBtn) micBtn.classList.add('mic-listening');
        showToast("🎙️ Listening... / सुन रहा हूँ...", "info");
    };

    recognition.onend = function() {
        const micBtn = document.getElementById('global-mic-icon');
        if (micBtn) micBtn.classList.remove('mic-listening');
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        const micBtn = document.getElementById('global-mic-icon');
        if (micBtn) micBtn.classList.remove('mic-listening');
        
        if (event.error === 'no-speech') {
            showToast("Could not hear you. Please try again.", "warning");
        } else {
            showToast("Microphone error. Check permissions.", "error");
        }
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log("Buyer said:", transcript);
        showToast(`You said: "${transcript}"`, "success");

        // Delay slightly so the user can read the toast before the page changes
        setTimeout(() => {
            processBuyerCommand(transcript);
        }, 1000);
    };
} else {
    console.warn("Speech Recognition API is not supported in this browser.");
}

// Toggle function attached to the UI button
window.toggleGlobalVoice = function() {
    if (!recognition) {
        showToast("Voice features are not supported in this browser.", "error");
        return;
    }
    try {
        recognition.start();
    } catch (e) {
        recognition.stop();
    }
};

/**
 * Master Brain: Maps layman buyer phrases to the correct page or action
 */
function processBuyerCommand(command) {
    
    // 1. BUYER DASHBOARD (Home)
    if (command.includes('dashboard') || command.includes('home') || command.includes('होम') || command.includes('डैशबोर्ड') || command.includes('मुख्य पृष्ठ') || command.includes('वापस') || command.includes('पीछे')) {
        navigateTo('buyer_dashboard.html');
    }
    
    // 2. BROWSE PRODUCE (Marketplace)
    else if (command.includes('market') || command.includes('browse') || command.includes('buy') || command.includes('produce') || command.includes('बाज़ार') || command.includes('सब्जी') || command.includes('अनाज') || command.includes('खरीदना है')) {
        navigateTo('browse_produce.html');
    }

    // 3. BIDS & OFFERS (Negotiations)
    else if (command.includes('bid') || command.includes('offer') || command.includes('negotiate') || command.includes('बोली') || command.includes('ऑफर') || command.includes('मोलभाव') || command.includes('सौदा')) {
        navigateTo('bids_offers.html');
    }

    // 4. LIVE MANDI PRICES
    else if (command.includes('price') || command.includes('live') || command.includes('trend') || command.includes('mandi') || command.includes('दाम') || command.includes('भाव') || command.includes('रेट') || command.includes('मंडी')) {
        navigateTo('livemandi.html');
    }

    // 5. TRACK ORDERS
    else if (command.includes('track') || command.includes('order') || command.includes('delivery') || command.includes('ट्रैक') || command.includes('ऑर्डर') || command.includes('डिलीवरी') || command.includes('सामान कहाँ है')) {
        navigateTo('trackorders.html');
    }

    // 6. CART / CHECKOUT
    else if (command.includes('cart') || command.includes('checkout') || command.includes('pay') || command.includes('कार्ट') || command.includes('पेमेंट') || command.includes('चेकआउट') || command.includes('पैसे देने हैं')) {
        navigateTo('checkout.html');
    }
    
    // 7. SMART ACTION: Open Cart Drawer (If on Browse Produce page)
    else if (command.includes('open cart') || command.includes('show cart') || command.includes('कार्ट दिखाओ')) {
        if (typeof window.toggleCart === 'function') {
            showToast("Opening Cart...", "success");
            window.toggleCart();
        } else {
            navigateTo('checkout.html');
        }
    }

    // Unrecognized Command
    else {
        showToast("Sorry, I didn't catch that. Try saying 'Mandi', 'Orders', or 'Cart'. / माफ़ करें, मैं समझ नहीं पाया।", "warning");
    }
}

/**
 * Helper to safely navigate
 */
function navigateTo(pageUrl) {
    // Prevent reloading if already on the requested page
    if (window.location.pathname.endsWith(pageUrl)) {
        showToast("You are already on this page. / आप पहले से ही इस पेज पर हैं।", "info");
        return;
    }
    
    showToast(`Opening... / खुल रहा है...`, "success");
    setTimeout(() => {
        window.location.href = pageUrl;
    }, 800);
}

/**
 * Simple Toast Notification fallback
 */
window.showToast = window.showToast || function(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; gap: 10px; width: 90%; max-width: 350px; pointer-events: none;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    let bgColor = '#37474f';
    if (type === 'error') bgColor = '#d32f2f';
    if (type === 'success') bgColor = '#2e7d32';
    if (type === 'warning') bgColor = '#f57c00';

    toast.style.cssText = `background: ${bgColor}; color: white; padding: 14px 20px; border-radius: 12px; font-family: 'Poppins', sans-serif; font-size: 0.9rem; box-shadow: 0 6px 16px rgba(0,0,0,0.2); animation: fadeUp 0.3s ease; text-align: center; font-weight: 500;`;
    toast.innerText = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};