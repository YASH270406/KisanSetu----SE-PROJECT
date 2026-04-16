/**
 * kyc-uploader.js — KisanSetu KYC Document Upload
 * FR-1.1 / SRS §4.1.3: KYC verification (Aadhaar + PAN) for farmers
 *
 * Handles:
 *   - Aadhaar (12-digit, masked input)
 *   - PAN (10-char, uppercase)
 *   - Document photo upload → Supabase Storage
 *   - KYC status update in Supabase `users` table
 *   - "Skip for Now" (saves as pending)
 *
 * SQL: Run once in Supabase SQL Editor (also in supabase_migrations.sql):
 *   ALTER TABLE users
 *   ADD COLUMN IF NOT EXISTS aadhaar_number TEXT,
 *   ADD COLUMN IF NOT EXISTS pan_number TEXT,
 *   ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_submitted',
 *   ADD COLUMN IF NOT EXISTS kyc_doc_url TEXT;
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL      = 'https://ffigoosgvrtfgtgmrmxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaWdvb3NndnJ0Zmd0Z21ybXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzY0NjYsImV4cCI6MjA5MDQxMjQ2Nn0.GjsvWC4eTGczrRsx3hCP5iuKPI_ZIVDY_YhD5U9RIdk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Validators ── */
function validateAadhaar(raw) {
    const digits = raw.replace(/\s/g, '');
    return /^\d{12}$/.test(digits) && !/^0000/.test(digits);
}

function validatePAN(pan) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
}

function maskAadhaar(val) {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(.{4})(.{4})?(.{4})?/, (_, a, b, c) =>
        [a, b, c].filter(Boolean).join(' ')
    );
}

/* ── Upload document to Supabase Storage ── */
async function uploadDoc(file, userId, type) {
    const ext     = file.name.split('.').pop().toLowerCase();
    const allowed = ['jpg','jpeg','png','pdf'];
    if (!allowed.includes(ext)) throw new Error(`Invalid file type. Use: ${allowed.join(', ')}`);
    if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5 MB.');

    const path = `kyc/${userId}/${type}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('kyc-documents').upload(path, file, {
        cacheControl: '3600', upsert: true
    });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('kyc-documents').getPublicUrl(path);
    return publicUrl;
}

/* ── Submit KYC ── */
window.submitKYC = async function () {
    const aadhaarRaw = (document.getElementById('kyc-aadhaar')?.value || '').replace(/\s/g, '');
    const panRaw     = (document.getElementById('kyc-pan')?.value || '').toUpperCase().trim();
    const docFile    = document.getElementById('kyc-doc')?.files?.[0];

    const errEl = document.getElementById('kyc-error');
    const btnEl = document.getElementById('kyc-submit-btn');

    // Validate
    if (!validateAadhaar(aadhaarRaw)) {
        errEl.textContent = '⚠️ Please enter a valid 12-digit Aadhaar number.';
        errEl.style.display = 'block';
        document.getElementById('kyc-aadhaar')?.classList.add('kyc-input-error');
        return;
    }
    if (panRaw && !validatePAN(panRaw)) {
        errEl.textContent = '⚠️ PAN must be in format: ABCDE1234F';
        errEl.style.display = 'block';
        document.getElementById('kyc-pan')?.classList.add('kyc-input-error');
        return;
    }
    errEl.style.display = 'none';
    document.querySelectorAll('.kyc-input-error').forEach(el => el.classList.remove('kyc-input-error'));

    btnEl.disabled = true;
    btnEl.textContent = '⏳ Submitting...';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not logged in.');

        // Upload document if provided
        let docUrl = null;
        if (docFile) {
            setStatus('Uploading document...', 'uploading');
            docUrl = await uploadDoc(docFile, user.id, 'aadhaar');
        }

        // Update users table
        setStatus('Saving KYC data...', 'uploading');
        const updateData = {
            aadhaar_number: aadhaarRaw,
            kyc_status:     'pending_verification',
            kyc_doc_url:    docUrl || null,
        };
        if (panRaw) updateData.pan_number = panRaw;

        const { error } = await supabase.from('users').update(updateData).eq('id', user.id);
        if (error) throw error;

        setStatus('KYC Submitted — Under Review', 'success');
        showKYCSuccess();

    } catch (err) {
        errEl.textContent = '❌ ' + err.message;
        errEl.style.display = 'block';
        setStatus('Submission failed.', 'error');
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = '✅ Submit for Verification';
    }
};

/* ── Skip KYC ── */
window.skipKYC = async function () {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('users')
                .update({ kyc_status: 'skipped' })
                .eq('id', user.id);
        }
    } catch (_) {}

    // Redirect to the user's dashboard based on role
    const role = localStorage.getItem('ks_user_role') || 'farmer';
    const redirectMap = {
        farmer:          '/farmer/farmer_dashboard.html',
        buyer:           '/buyer/buyer_dashboard.html',
        equipment_owner: '/equipmentOwner/manage_fleet.html',
    };
    window.location.href = redirectMap[role] || '/index.html';
};

/* ── Status display ── */
function setStatus(msg, type) {
    const el = document.getElementById('kyc-status-msg');
    if (!el) return;
    const colors = { uploading:'#1565c0', success:'#2e7d32', error:'#c62828' };
    el.textContent = msg;
    el.style.color = colors[type] || '#37474f';
    el.style.display = 'block';
}

/* ── Success screen ── */
function showKYCSuccess() {
    const form    = document.getElementById('kyc-form-wrap');
    const success = document.getElementById('kyc-success-wrap');
    if (form)    form.style.display    = 'none';
    if (success) success.style.display = 'block';
}

/* ── Load existing KYC status ── */
async function loadExistingKYC() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
        .from('users')
        .select('kyc_status, aadhaar_number, pan_number, full_name, role')
        .eq('id', user.id)
        .single();

    if (!data) return;

    // Store role for skip redirect
    if (data.role) localStorage.setItem('ks_user_role', data.role);

    // Show user name
    const nameEl = document.getElementById('kyc-user-name');
    if (nameEl && data.full_name) nameEl.textContent = data.full_name;

    // Show existing status
    const statusEl = document.getElementById('kyc-existing-status');
    if (statusEl && data.kyc_status && data.kyc_status !== 'not_submitted') {
        const labels = {
            pending_verification: '⏳ KYC Pending Review',
            verified:             '✅ KYC Verified',
            rejected:             '❌ KYC Rejected — Please resubmit',
            skipped:              '⚠️ KYC Skipped',
        };
        statusEl.textContent = labels[data.kyc_status] || data.kyc_status;
        statusEl.style.display = 'block';

        if (data.kyc_status === 'verified') showKYCSuccess();
    }

    // Pre-fill masked Aadhaar hint if already submitted
    if (data.aadhaar_number) {
        const hint = document.getElementById('kyc-aadhaar-hint');
        if (hint) {
            hint.textContent = `Previously submitted: XXXX XXXX ${data.aadhaar_number.slice(-4)}`;
            hint.style.display = 'block';
        }
    }
}

/* ── Aadhaar masking while typing ── */
window.onAadhaarInput = function (el) {
    const pos = el.selectionStart;
    el.value  = maskAadhaar(el.value);
    // Try to restore cursor
    try { el.setSelectionRange(pos, pos); } catch(_) {}
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
    await loadExistingKYC();
    console.log('[KYC] ✅ KYC uploader initialised.');
});
