/**
 * admin_supabase.js — KisanSetu Admin Controller
 * Integrates Supabase Persistence, Notifications, and Moderation Logic.
 */

import { supabase } from '../supabase-config.js';
import { checkAdminSession } from './admin_auth.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';
import { dispatchExternalAlert } from '../shared/notification_service.js';

// Controller Object to hold shared state and actions
const AdminController = {
    users: [],
    listings: [],
    equipment: [],
    logs: [],
    stats: {},
    session: null
};

/* ── Administrative Action Logging ── */
async function auditLog(action, targetType, targetId, detail) {
    try {
        await supabase.from('admin_audit_log').insert({
            action,
            target_type: targetType,
            target_id: String(targetId),
            detail,
            performed_by: AdminController.session?.user?.id || null
        });
    } catch (e) {
        console.warn('[Admin Audit Fail]', e.message);
    }
}

/* ─────────────────────────────────────────────────────────────
   DATA ACCESS LAYER (Refetching ensures Persistence)
───────────────────────────────────────────────────────────── */

async function loadAllData() {
    console.log('[AdminController] Syncing with Supabase...');

    // Fetch everything in parallel
    const [usersRes, prodRes, equipRes, logsRes, disputesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('produce').select('*, farmer:farmer_id(full_name, location)').order('created_at', { ascending: false }),
        supabase.from('rental_equipment').select('*, owner:owner_id(full_name, location)').order('created_at', { ascending: false }),
        supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('disputes').select('*, raiser:raised_by(full_name), asg:against(full_name)').order('created_at', { ascending: false })
    ]);

    // 1. Process Users
    if (usersRes.data) {
        AdminController.users = usersRes.data.map(u => ({
            id: u.id,
            name: u.full_name || 'Anonymous',
            phone: u.phone_number || '—',
            role: u.role || 'farmer',
            joined: u.created_at ? u.created_at.slice(0, 10) : '—',
            banned: u.is_banned || false,
            state: u.location || '—',
            kycStatus: u.kyc_status || 'not_submitted',
            aadhaar: u.aadhaar_number || '—',
            pan: u.pan_number || '—',
            kycDoc: u.kyc_doc_url || null,
            _liveData: true
        }));
    }

    // 2. Process Produce Listings
    if (prodRes.data) {
        AdminController.listings = prodRes.data.map(l => ({
            id: l.id,
            crop: l.crop_name,
            farmer: l.farmer?.full_name || 'Unknown',
            farmerId: l.farmer_id, // preserve ID for notifications
            qty: `${l.quantity_kg || 0} kg`,
            price: `₹${l.expected_price || 0}/kg`,
            date: l.created_at ? l.created_at.slice(0, 10) : '—',
            status: l.status === 'Available' ? 'Pending' : l.status,
            district: l.farmer?.location || '—',
            _liveData: true
        }));
    }

    // 3. Process Equipment
    if (equipRes.data) {
        AdminController.equipment = equipRes.data.map(e => ({
            id: e.id,
            crop: e.name,
            farmer: e.owner?.full_name || 'Unknown',
            ownerId: e.owner_id, // preserve ID for notifications
            qty: e.equipment_type,
            price: `₹${e.rental_rate_per_hour}/hr`,
            date: e.created_at ? e.created_at.slice(0, 10) : '—',
            status: e.status || 'Verified',
            district: e.owner?.location || '—',
            _liveData: true
        }));
    }

    // 5. Process Disputes
    if (disputesRes.data) {
        AdminController.disputes = disputesRes.data.map(d => ({
            id: d.id,
            title: d.title,
            raised_by: d.raiser?.full_name || 'Anonymous',
            against: d.asg?.full_name || 'Anonymous',
            order: d.order_id || '—',
            desc: d.description,
            status: d.status,
            date: d.created_at ? d.created_at.slice(0, 10) : '—',
            resolution: d.resolution || ''
        }));
    }

    // Update global DEMO object for legacy UI components
    window.DEMO.users = AdminController.users;
    window.DEMO.listings = [...AdminController.listings, ...AdminController.equipment];
    window.DEMO.logs = AdminController.logs;
    window.DEMO.disputes = AdminController.disputes;

    // Calculate Stats
    window.DEMO.stats = {
        users: AdminController.users.length,
        listings: AdminController.listings.length + AdminController.equipment.length,
        pendingListings: AdminController.listings.filter(l => l.status === 'Pending').length +
            AdminController.equipment.filter(e => e.status === 'Pending').length,
        openDisputes: AdminController.disputes.filter(d => d.status === 'open').length,
        banned: AdminController.users.filter(u => u.banned).length
    };

    // =============================================================
    // NEW LOGIC: DYNAMICALLY UPDATE SIDEBAR BADGES
    // =============================================================
    try {
        const userBadge = document.getElementById('nav-users-count');
        const listingBadge = document.getElementById('nav-listings-count');
        const disputeBadge = document.getElementById('nav-disputes-count');

        if (userBadge) {
            userBadge.textContent = window.DEMO.stats.users;
            userBadge.style.display = window.DEMO.stats.users > 0 ? 'inline-block' : 'none';
        }

        if (listingBadge) {
            listingBadge.textContent = window.DEMO.stats.pendingListings;
            listingBadge.style.display = window.DEMO.stats.pendingListings > 0 ? 'inline-block' : 'none';
        }

        if (disputeBadge) {
            disputeBadge.textContent = window.DEMO.stats.openDisputes;
            disputeBadge.style.display = window.DEMO.stats.openDisputes > 0 ? 'inline-block' : 'none';
        }
    } catch (domErr) {
        console.warn("Could not update sidebar badges. Ensure IDs are set in HTML.", domErr);
    }
    // =============================================================

    console.log('[AdminController] ✅ State fully synchronized.');
    document.dispatchEvent(new CustomEvent('liveDataReady'));
}

/* ─────────────────────────────────────────────────────────────
   BUSINESS LOGIC (The Controller Actions)
───────────────────────────────────────────────────────────── */

// User Actions
window.banUserLive = async (userId) => {
    try {
        const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
        if (error) throw error;
        await auditLog('BAN_USER', 'user', userId, 'User banned for policy violations');
        await loadAllData();
        showToast('User has been banned.', 'success');
    } catch (e) { showToast('Ban failed: ' + e.message, 'error'); }
};

window.unbanUserLive = async (userId) => {
    try {
        const { error } = await supabase.from('profiles').update({ is_banned: false }).eq('id', userId);
        if (error) throw error;
        await auditLog('UNBAN_USER', 'user', userId, 'Access reinstated');
        await loadAllData();
        showToast('User reinstated.', 'success');
    } catch (e) { showToast('Unban failed: ' + e.message, 'error'); }
};

window.approveKYCLive = async (userId) => {
    try {
        const { error } = await supabase.from('profiles').update({ kyc_status: 'verified' }).eq('id', userId);
        if (error) throw error;
        await sendSystemNotification(userId, 'KYC Verified ✅', 'Your identity has been verified by the admin. You can now list produce.', 'success');
        
        // [FR-7.1] External Notification (SMS/Email)
        const user = AdminController.users.find(u => u.id === userId);
        if (user) {
            await dispatchExternalAlert(
                { id: userId, full_name: user.name, mobile_num: user.phone },
                { title: 'KYC Verified', message: 'Your KisanSetu profile is now verified!', type: 'success' }
            );
        }

        await auditLog('KYC_APPROVE', 'user', userId, 'KYC Document Verified');
        await loadAllData();
        showToast('KYC Approved.', 'success');
    } catch (e) { showToast('KYC update failed: ' + e.message, 'error'); }
};

window.rejectKYCLive = async (userId) => {
    try {
        const { error } = await supabase.from('profiles').update({ kyc_status: 'rejected' }).eq('id', userId);
        if (error) throw error;
        await sendSystemNotification(userId, 'KYC Rejected ⚠️', 'Your documents were unclear. Please re-upload.', 'warning');
        await auditLog('KYC_REJECT', 'user', userId, 'KYC Document Rejected');
        await loadAllData();
        showToast('KYC Rejected.', 'info');
    } catch (e) { showToast('KYC update failed: ' + e.message, 'error'); }
};

// Listing Actions
window.approveListingLive = async (id) => {
    let item = AdminController.listings.find(x => x.id === id);
    let table = 'produce';
    let ownerId = item?.farmerId;

    if (!item) {
        item = AdminController.equipment.find(x => x.id === id);
        table = 'rental_equipment';
        ownerId = item?.ownerId;
    }
    if (!item) return;

    try {
        const { error } = await supabase.from(table).update({ status: 'Verified' }).eq('id', id);
        if (error) throw error;

        if (ownerId) {
            await sendSystemNotification(ownerId, 'Listing Approved ✅', `Your ${item.crop} listing has been verified and is now live.`, 'success');
            
            // [FR-7.1] External Notification
            const owner = AdminController.users.find(u => u.id === ownerId);
            if (owner) {
                await dispatchExternalAlert(
                    { id: ownerId, full_name: owner.name, mobile_num: owner.phone },
                    { title: 'Listing Approved', message: `Your ${item.crop} is now LIVE on KisanSetu.`, type: 'success' }
                );
            }
        }

        await auditLog('APPROVE_LISTING', table, id, `Approved ${item.crop}`);
        await loadAllData();
        showToast('Listing approved.', 'success');
    } catch (e) { showToast('Approval failed: ' + e.message, 'error'); }
};

window.rejectListingLive = async (id) => {
    let item = AdminController.listings.find(x => x.id === id);
    let table = 'produce';
    let ownerId = item?.farmerId;

    if (!item) {
        item = AdminController.equipment.find(x => x.id === id);
        table = 'rental_equipment';
        ownerId = item?.ownerId;
    }
    if (!item) return;

    try {
        const { error } = await supabase.from(table).update({ status: 'Rejected' }).eq('id', id);
        if (error) throw error;

        if (ownerId) {
            await sendSystemNotification(ownerId, 'Listing Rejected ❌', `Your ${item.crop} listing was rejected. Please check requirements.`, 'warning');
        }

        await auditLog('REJECT_LISTING', table, id, `Rejected ${item.crop}`);
        await loadAllData();
        showToast('Listing rejected.', 'warning');
    } catch (e) { showToast('Rejection failed: ' + e.message, 'error'); }
};

// Dispute Actions
window.resolveDisputeLive = async (id, resolution) => {
    try {
        const { error } = await supabase.from('disputes').update({ status: 'resolved', resolution }).eq('id', id);
        if (error) throw error;
        await auditLog('RESOLVE_DISPUTE', 'dispute', id, 'Dispute resolved by admin');
        await loadAllData();
        showToast('Dispute resolved.', 'success');
    } catch (e) { showToast('Resolve failed: ' + e.message, 'error'); }
};

window.escalateDisputeLive = async (id) => {
    try {
        const { error } = await supabase.from('disputes').update({ status: 'escalated' }).eq('id', id);
        if (error) throw error;
        await auditLog('ESCALATE_DISPUTE', 'dispute', id, 'Dispute escalated to management');
        await loadAllData();
        showToast('Dispute escalated.', 'warning');
    } catch (e) { showToast('Escalation failed: ' + e.message, 'error'); }
};

/* ─────────────────────────────────────────────────────────────
   INITIALIZATION
───────────────────────────────────────────────────────────── */
(async () => {
    // 1. Authenticate
    AdminController.session = await checkAdminSession();
    if (!AdminController.session) return; // auth.js handles redirect

    // 2. Load Data
    await loadAllData();
})();