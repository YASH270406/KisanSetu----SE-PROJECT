// shared/toast.js
function showToast(message, type = 'info') {
    // Remove existing toast if one is already showing
    const existing = document.getElementById('ks-toast');
    if (existing) existing.remove();

    const colors = {
        success: '#2e7d32', // Primary Green
        error: '#d32f2f', // Danger Red
        warning: '#fbc02d', // Harvest Yellow
        info: '#1565c0'  // Blue
    };

    const toast = document.createElement('div');
    toast.id = 'ks-toast';
    toast.textContent = message;

    // Applying inline styles to guarantee it works globally without CSS imports
    toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: #fff;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 0.85rem;
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        z-index: 10000;
        max-width: 85%;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        animation: toastFadeInOut 3.5s ease forwards;
    `;

    // Inject animation keyframes dynamically if not present
    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.textContent = `
            @keyframes toastFadeInOut {
                0% { opacity: 0; transform: translate(-50%, 20px); }
                10% { opacity: 1; transform: translate(-50%, 0); }
                90% { opacity: 1; transform: translate(-50%, 0); }
                100% { opacity: 0; transform: translate(-50%, -20px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
        const currentToast = document.getElementById('ks-toast');
        if (currentToast) currentToast.remove();
    }, 3500);
}
// Make showToast globally accessible when this file is imported as an ES module
window.showToast = showToast;
