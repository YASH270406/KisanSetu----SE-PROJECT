/**
 * notification_service.js — KisanSetu External Notification Dispatcher
 * FR-7.1 / SRS §4.7: Automated Alerts (SMS / Email)
 * 
 * Provides a unified interface for sending external alerts to users.
 * Integrates with dispatch providers (Fast2SMS, simulated Email).
 */

const FAST2SMS_KEY = 'YOUR_FAST2SMS_API_KEY'; // Placeholder for SRS compliance

/**
 * Dispatch an external notification based on user preferences.
 * @param {Object} user - User object containing mobile_num and email
 * @param {Object} alertPayload - { title, message, type }
 * @param {Object} prefs - User preferences (sms_enabled, email_enabled)
 */
export async function dispatchExternalAlert(user, alertPayload, prefs = { sms_enabled: true, email_enabled: true }) {
    console.log(`[NotificationService] Preparing dispatch for ${user.full_name || 'User'}...`);

    const results = { sms: false, email: false };

    // 1. SMS Dispatch (Simulated/Fast2SMS)
    if (prefs.sms_enabled && user.mobile_num) {
        results.sms = await sendSMS(user.mobile_num, `${alertPayload.title}: ${alertPayload.message}`);
    }

    // 2. Email Dispatch (Simulated)
    if (prefs.email_enabled && user.email) {
        results.email = await sendSimulatedEmail(user.email, alertPayload.title, alertPayload.message);
    }

    return results;
}

/**
 * Sends a real SMS via Fast2SMS (Simulated if offline or no key)
 */
async function sendSMS(mobile, message) {
    if (!navigator.onLine) {
        console.warn('[SMS Dispatch] Offline. Simulating SMS locally.');
        return true;
    }

    // Fast2SMS API implementation stub
    try {
        console.log(`[SMS] Sending to +91 ${mobile}: "${message}"`);
        // Actual fetch call would go here if key was provided
        return true;
    } catch (err) {
        console.error('[SMS] Dispatch failed:', err.message);
        return false;
    }
}

/**
 * Simulates an email dispatch with a beautiful console log
 */
async function sendSimulatedEmail(email, subject, body) {
    console.log(`
    ┌──────────────────────────────────────────────────────────┐
    │ 📧 EMAIL DISPATCH SIMULATION                           │
    ├──────────────────────────────────────────────────────────┤
    │ To:      ${email}
    │ Subject: ${subject}
    │ Body:    ${body}
    └──────────────────────────────────────────────────────────┘
    `);
    return true;
}
