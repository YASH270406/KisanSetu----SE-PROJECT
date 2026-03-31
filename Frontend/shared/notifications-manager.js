// Frontend/shared/notifications-manager.js
import { supabase } from '../supabase-config.js';

/**
 * Universal Notification Manager (FR-7)
 * Handles the Notification Bell, Unread Badges, and Realtime Updates
 */

export async function initializeNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Inject the Notification Bell if it doesn't exist
    injectNotificationBell();

    // 2. Initial fetch of unread count
    await updateUnreadBadge();

    // 3. Listen for REALTIME events (FR-7.1)
    supabase
        .channel('public:notifications')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications', 
            filter: `user_id=eq.${user.id}` 
        }, payload => {
            console.log('New notification received!', payload);
            showNotificationToast(payload.new);
            updateUnreadBadge();
        })
        .subscribe();
}

function injectNotificationBell() {
    const headers = document.querySelectorAll('.dashboard-header');
    headers.forEach(header => {
        if (!header.querySelector('.notification-container')) {
            const container = document.createElement('div');
            container.className = 'notification-container';
            container.innerHTML = `
                <div class="bell-wrapper" onclick="window.toggleNotificationPanel()">
                    <i class="fa-solid fa-bell"></i>
                    <span id="notif-badge" class="notif-badge" style="display: none;">0</span>
                </div>
                <div id="notif-panel" class="notif-panel">
                    <div class="notif-header">
                        <h4>Notifications</h4>
                        <button onclick="window.markAllRead()" class="mark-read-btn">Mark all read</button>
                    </div>
                    <div id="notif-list" class="notif-list">
                        <p class="empty-notif">No new alerts.</p>
                    </div>
                </div>
            `;
            header.appendChild(container);

            // Add styles dynamically if not already present
            if (!document.getElementById('notif-styles')) {
                const style = document.createElement('style');
                style.id = 'notif-styles';
                style.textContent = `
                    .notification-container { position: relative; margin-left: 15px; }
                    .bell-wrapper { cursor: pointer; position: relative; padding: 10px; color: white; font-size: 1.2rem; }
                    .notif-badge { position: absolute; top: 5px; right: 5px; background: #d32f2f; color: white; font-size: 0.65rem; padding: 2px 5px; border-radius: 10px; min-width: 15px; text-align: center; font-weight: bold; }
                    
                    .notif-panel { 
                        position: absolute; top: 50px; right: 0; width: 300px; max-height: 400px; 
                        background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
                        display: none; flex-direction: column; z-index: 3000; overflow: hidden;
                    }
                    .notif-panel.active { display: flex; }
                    .notif-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
                    .notif-header h4 { font-size: 0.95rem; color: #37474f; }
                    .mark-read-btn { background: none; border: none; color: #2e7d32; font-size: 0.75rem; cursor: pointer; font-weight: 600; }
                    
                    .notif-list { overflow-y: auto; flex: 1; }
                    .notif-item { padding: 12px 15px; border-bottom: 1px solid #f9f9f9; cursor: pointer; transition: background 0.2s; }
                    .notif-item:hover { background: #f4f7f6; }
                    .notif-item.unread { border-left: 4px solid #2e7d32; background: #f0f4f1; }
                    .notif-item h5 { font-size: 0.85rem; margin-bottom: 3px; color: #333; }
                    .notif-item p { font-size: 0.75rem; color: #666; margin: 0; }
                    .notif-time { font-size: 0.65rem; color: #999; margin-top: 5px; display: block; }
                    .empty-notif { padding: 30px; text-align: center; color: #999; font-size: 0.85rem; }
                `;
                document.head.appendChild(style);
            }
        }
    });
}

export async function updateUnreadBadge() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read_status', false);

    if (error) return;

    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

window.toggleNotificationPanel = async () => {
    const panel = document.getElementById('notif-panel');
    const isActive = panel.classList.contains('active');
    
    if (!isActive) {
        await loadNotifications();
        panel.classList.add('active');
        
        // Close when clicking outside
        const closeTrigger = (e) => {
            if (!panel.contains(e.target) && !e.target.closest('.bell-wrapper')) {
                panel.classList.remove('active');
                document.removeEventListener('click', closeTrigger);
            }
        };
        setTimeout(() => document.addEventListener('click', closeTrigger), 10);
    } else {
        panel.classList.remove('active');
    }
};

async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    const listContainer = document.getElementById('notif-list');
    
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error || !data || data.length === 0) {
        listContainer.innerHTML = '<p class="empty-notif">No new alerts.</p>';
        return;
    }

    listContainer.innerHTML = data.map(n => `
        <div class="notif-item ${!n.read_status ? 'unread' : ''}" onclick="window.handleNotificationClick('${n.id}', '${n.title}', '${n.type}')">
            <h5>${n.title}</h5>
            <p>${n.message}</p>
            <span class="notif-time">${new Date(n.created_at).toLocaleString()}</span>
        </div>
    `).join('');
}

window.handleNotificationClick = async (id, title, type) => {
    // 1. Mark as read
    await window.markRead(id);

    // 2. Intelligent Routing based on notification content
    const role = sessionStorage.getItem('kisansetu_user_role');
    const isFarmer = role === 'Farmer';
    const isBuyer = role === 'Buyer';

    const t = title.toLowerCase();

    if (isFarmer) {
        if (t.includes('offer') || t.includes('bid')) {
            window.location.href = 'bid.html';
        } else if (t.includes('payment')) {
            window.location.href = 'payment_status.html';
        }
    } else if (isBuyer) {
        if (t.includes('offer') || t.includes('counter') || t.includes('accept')) {
            window.location.href = 'bids_offers.html';
        }
    }
};

window.markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('notifications').update({ read_status: true }).eq('user_id', user.id);
    await loadNotifications();
    await updateUnreadBadge();
};

window.markRead = async (id) => {
    await supabase.from('notifications').update({ read_status: true }).eq('id', id);
    await loadNotifications();
    await updateUnreadBadge();
};

// Global function to trigger a system alert from other scripts
export async function sendSystemNotification(userId, title, message, type = 'info') {
    return await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type
    });
}

function showNotificationToast(notif) {
    // 4. Ring the bell visually (NFR-5.4 WOW factor)
    const bell = document.querySelector('.bell-wrapper i');
    if (bell) {
        bell.classList.add('ringing');
        setTimeout(() => bell.classList.remove('ringing'), 2000);
    }

    // 5. Elegant Floating Toast
    const toast = document.createElement('div');
    toast.className = 'notif-toast';
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid fa-bell"></i></div>
        <div class="toast-content">
            <strong>${notif.title}</strong>
            <p>${notif.message}</p>
        </div>
    `;
    
    // Inject Styles if not exists (only toast styles here)
    if (!document.getElementById('notif-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'notif-toast-styles';
        style.textContent = `
            .notif-toast {
                position: fixed; top: 25px; right: 25px; 
                background: white; border-left: 5px solid #2e7d32;
                padding: 15px 20px; border-radius: 12px; z-index: 9999;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                display: flex; gap: 15px; align-items: start;
                max-width: 300px; animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
                transition: all 0.4s ease;
            }
            .notif-toast .toast-icon { color: #2e7d32; font-size: 1.2rem; margin-top: 2px; }
            .notif-toast .toast-content strong { display: block; font-size: 0.9rem; color: #333; margin-bottom: 3px; }
            .notif-toast .toast-content p { font-size: 0.75rem; color: #666; margin: 0; line-height: 1.4; }
            
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(100px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes ring {
                0% { transform: rotate(0); }
                10% { transform: rotate(15deg); }
                20% { transform: rotate(-15deg); }
                30% { transform: rotate(10deg); }
                40% { transform: rotate(-10deg); }
                50% { transform: rotate(0); }
                100% { transform: rotate(0); }
            }
            .bell-wrapper i.ringing { animation: ring 0.5s ease infinite; color: #fbc02d; }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}
