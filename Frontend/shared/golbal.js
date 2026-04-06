// global-voice.js - Runs on every page for global navigation

let globalRecognition = null;
let isGlobalListening = false;

function initGlobalVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // Browser doesn't support it

    globalRecognition = new SpeechRecognition();
    globalRecognition.lang = 'en-IN'; // Mix of Hindi and English
    globalRecognition.interimResults = false;

    globalRecognition.onresult = function(event) {
        let command = event.results[0][0].transcript.toLowerCase().trim();
        console.log("Global Voice Heard:", command);

        // --- GLOBAL NAVIGATION RULES ---
        if (command.includes('home') || command.includes('होम')) {
            showVoiceToast("Navigating to Home...");
            window.location.href = 'index.html'; // Change to your actual home URL
        } 
        else if (command.includes('soil') || command.includes('मिट्टी')) {
            showVoiceToast("Opening Soil Advisor...");
            window.location.href = 'soilhealth.html';
        }
        else if (command.includes('market') || command.includes('बाजार') || command.includes('bazaar')) {
            showVoiceToast("Opening Marketplace...");
            window.location.href = 'market.html';
        }
        else if (command.includes('inventory') || command.includes('stock')) {
            showVoiceToast("Opening Inventory...");
            window.location.href = 'inventory.html';
        }
        else {
            showVoiceToast(`Heard: "${command}". Try saying "Go Home" or "Open Market".`);
        }
    };

    globalRecognition.onend = function() {
        isGlobalListening = false;
        document.getElementById('global-mic-icon').style.color = 'black'; // Reset mic color
    };
}

// Function to attach to your microphone button
function toggleGlobalVoice() {
    if (!globalRecognition) initGlobalVoice();

    if (isGlobalListening) {
        globalRecognition.stop();
    } else {
        globalRecognition.start();
        isGlobalListening = true;
        document.getElementById('global-mic-icon').style.color = 'red'; // Show it's listening
        showVoiceToast("Listening... Say a page name.");
    }
}

// Simple Toast function for feedback
function showVoiceToast(msg) {
    alert("Krishi-AI: " + msg); // Replace this with your friend's fancy toast UI if you want!
}

// Initialize when the script loads
document.addEventListener('DOMContentLoaded', initGlobalVoice);