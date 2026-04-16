/* ── Toast ─────────────────────────────────────── */
function showToast(msg, type = 'info') {
    let wrap = document.getElementById('toast-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'toast-wrap';
        wrap.className = 'toast-wrap';
        document.body.appendChild(wrap);
    }
    const icons = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i> ${msg}`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(8px)'; t.style.transition='all 0.3s'; setTimeout(()=>t.remove(),300); }, 3000);
}

/* ── Active nav highlight ──────────────────────── */
function setActiveNav() {
    const page = location.pathname.split('/').pop();
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('href') === page);
    });
}

/* ── Demo Data ─────────────────────────────────── */
const DEMO = {

    users: [
        { id:'u1', name:'Ramesh Kumar Verma',    phone:'9876543210', role:'farmer',          joined:'2024-02-10', banned:false, state:'Uttar Pradesh' },
        { id:'u2', name:'Sunita Devi',            phone:'9123456780', role:'farmer',          joined:'2024-03-05', banned:false, state:'Bihar' },
        { id:'u3', name:'Arjun Singh Rathore',    phone:'9988776655', role:'buyer',           joined:'2024-01-20', banned:false, state:'Rajasthan' },
        { id:'u4', name:'Meena Kumari',           phone:'8877665544', role:'buyer',           joined:'2024-04-01', banned:false, state:'Madhya Pradesh' },
        { id:'u5', name:'Harpreet Singh',         phone:'7766554433', role:'equipment_owner', joined:'2024-01-08', banned:false, state:'Punjab' },
        { id:'u6', name:'Kavya Nair',             phone:'9012345678', role:'farmer',          joined:'2024-05-14', banned:false, state:'Kerala' },
        { id:'u7', name:'Dinesh Patel',           phone:'9234567890', role:'buyer',           joined:'2024-02-28', banned:false, state:'Gujarat' },
        { id:'u8', name:'Priya Sharma',           phone:'9345678901', role:'farmer',          joined:'2024-03-18', banned:false, state:'Haryana' },
        { id:'u9', name:'Mohammed Irfan',         phone:'9456789012', role:'equipment_owner', joined:'2024-04-22', banned:true,  state:'Telangana' },
        { id:'u10',name:'Lalita Bai',             phone:'9567890123', role:'farmer',          joined:'2024-06-01', banned:false, state:'Chhattisgarh' },
        { id:'u11',name:'Vikram Yadav',           phone:'9678901234', role:'buyer',           joined:'2024-05-30', banned:false, state:'Bihar' },
        { id:'u12',name:'Seema Goswami',          phone:'9789012345', role:'farmer',          joined:'2024-06-10', banned:true,  state:'West Bengal' },
    ],

    listings: [
        { id:'l1',  crop:'Basmati Rice',   farmer:'Ramesh Kumar Verma',  qty:'50 Quintal',  price:'₹3,200/q',  date:'2025-06-10', status:'Pending',  district:'Lucknow' },
        { id:'l2',  crop:'Alphonso Mango', farmer:'Kavya Nair',          qty:'200 kg',      price:'₹120/kg',   date:'2025-06-09', status:'Pending',  district:'Ratnagiri' },
        { id:'l3',  crop:'Wheat',          farmer:'Priya Sharma',        qty:'100 Quintal', price:'₹2,100/q',  date:'2025-06-08', status:'Verified', district:'Karnal' },
        { id:'l4',  crop:'Tomato',         farmer:'Lalita Bai',          qty:'30 Quintal',  price:'₹1,800/q',  date:'2025-06-07', status:'Pending',  district:'Raipur' },
        { id:'l5',  crop:'Sugarcane',      farmer:'Sunita Devi',         qty:'500 Quintal', price:'₹280/q',    date:'2025-06-06', status:'Verified', district:'Muzaffarpur' },
        { id:'l6',  crop:'Potato',         farmer:'Ramesh Kumar Verma',  qty:'80 Quintal',  price:'₹900/q',    date:'2025-06-05', status:'Rejected', district:'Agra' },
        { id:'l7',  crop:'Cotton',         farmer:'Harpreet Singh',      qty:'40 Quintal',  price:'₹6,500/q',  date:'2025-06-04', status:'Pending',  district:'Bathinda' },
        { id:'l8',  crop:'Onion',          farmer:'Dinesh Patel',        qty:'60 Quintal',  price:'₹1,200/q',  date:'2025-06-03', status:'Verified', district:'Nashik' },
        { id:'l9',  crop:'Soybean',        farmer:'Seema Goswami',       qty:'25 Quintal',  price:'₹4,100/q',  date:'2025-06-02', status:'Pending',  district:'Indore' },
        { id:'l10', crop:'Mustard',        farmer:'Priya Sharma',        qty:'35 Quintal',  price:'₹5,200/q',  date:'2025-06-01', status:'Verified', district:'Rohtak' },
    ],

    disputes: [
        { id:'d1', title:'Payment Not Received',           raised_by:'Ramesh Kumar Verma', against:'Arjun Singh Rathore', order:'ORD-2847', desc:'Buyer received goods worth ₹24,000 but payment has not been credited to my account for 12 days.', status:'open',      date:'2025-06-08', resolution:'' },
        { id:'d2', title:'Wrong Quality Delivered',        raised_by:'Meena Kumari',       against:'Sunita Devi',         order:'ORD-2791', desc:'Ordered Grade A wheat but received Grade C quality. Loss of ₹6,000 due to quality mismatch.',        status:'open',      date:'2025-06-07', resolution:'' },
        { id:'d3', title:'Overcharging on Transport',      raised_by:'Dinesh Patel',       against:'Harpreet Singh',      order:'ORD-2705', desc:'Equipment owner charged ₹3,500 extra beyond agreed transport rate without prior notice.',              status:'escalated', date:'2025-06-04', resolution:'' },
        { id:'d4', title:'Quantity Shortage',              raised_by:'Vikram Yadav',       against:'Kavya Nair',          order:'ORD-2688', desc:'Ordered 200kg mangoes, received only 145kg. Shortfall of 55kg worth ₹6,600 unaccounted.',             status:'resolved',  date:'2025-05-30', resolution:'Refund of ₹6,600 processed to buyer. Farmer penalty applied as per policy §4.2.' },
        { id:'d5', title:'Delayed Delivery Beyond SLA',   raised_by:'Arjun Singh Rathore',against:'Ramesh Kumar Verma',  order:'ORD-2665', desc:'Agreed delivery was June 1st. Goods arrived June 8th causing spoilage loss of approx ₹9,000.',        status:'resolved',  date:'2025-05-28', resolution:'Compensation of ₹4,500 split equally. Both parties agreed to settlement.' },
        { id:'d6', title:'Damaged Equipment Returned',    raised_by:'Harpreet Singh',     against:'Dinesh Patel',        order:'ORD-2601', desc:'Rented tractor returned with broken hydraulic arm. Repair estimate ₹22,000. Insurance claim pending.',   status:'open',      date:'2025-06-09', resolution:'' },
    ],

    logs: [
        { id:'lg1',  action:'APPROVE_LISTING',  cat:'listing',  detail:'Wheat listing by Priya Sharma approved',              by:'Super Admin',    time:'2025-06-10 14:32' },
        { id:'lg2',  action:'BAN_USER',         cat:'user',     detail:'Mohammed Irfan banned — repeated policy violations',   by:'Super Admin',    time:'2025-06-10 13:10' },
        { id:'lg3',  action:'REJECT_LISTING',   cat:'listing',  detail:'Potato listing by Ramesh Verma rejected — low quality',by:'Super Admin',    time:'2025-06-10 11:55' },
        { id:'lg4',  action:'RESOLVE_DISPUTE',  cat:'dispute',  detail:'Dispute ORD-2688 resolved — refund ₹6,600',           by:'Super Admin',    time:'2025-06-09 16:00' },
        { id:'lg5',  action:'CHANGE_ROLE',      cat:'user',     detail:'Kavya Nair role updated: farmer → equipmentOwner',   by:'Super Admin',    time:'2025-06-09 12:20' },
        { id:'lg6',  action:'ESCALATE_DISPUTE', cat:'dispute',  detail:'Dispute ORD-2705 escalated to senior management',     by:'Super Admin',    time:'2025-06-08 17:45' },
        { id:'lg7',  action:'APPROVE_LISTING',  cat:'listing',  detail:'Sugarcane listing by Sunita Devi approved',           by:'Super Admin',    time:'2025-06-08 10:30' },
        { id:'lg8',  action:'UNBAN_USER',       cat:'user',     detail:'Seema Goswami account reinstated after appeal',       by:'Super Admin',    time:'2025-06-07 15:10' },
        { id:'lg9',  action:'RESOLVE_DISPUTE',  cat:'dispute',  detail:'Dispute ORD-2665 resolved — compensation split',      by:'Super Admin',    time:'2025-06-07 09:50' },
        { id:'lg10', action:'APPROVE_LISTING',  cat:'listing',  detail:'Onion listing by Dinesh Patel approved',              by:'Super Admin',    time:'2025-06-06 14:00' },
        { id:'lg11', action:'REJECT_LISTING',   cat:'listing',  detail:'Soybean listing rejected — missing certification',    by:'Super Admin',    time:'2025-06-06 11:15' },
        { id:'lg12', action:'BAN_USER',         cat:'user',     detail:'Seema Goswami temporarily banned',                   by:'Super Admin',    time:'2025-06-05 16:30' },
        { id:'lg13', action:'CHANGE_ROLE',      cat:'user',     detail:'Vikram Yadav role updated: farmer → buyer',          by:'Super Admin',    time:'2025-06-05 12:00' },
        { id:'lg14', action:'APPROVE_LISTING',  cat:'listing',  detail:'Mustard listing by Priya Sharma approved',           by:'Super Admin',    time:'2025-06-04 10:45' },
        { id:'lg15', action:'ESCALATE_DISPUTE', cat:'dispute',  detail:'Dispute ORD-2601 under review',                      by:'Super Admin',    time:'2025-06-04 09:10' },
    ],

    alerts: [
        { type:'error',   title:'High Open Disputes',           msg:'3 disputes unresolved for 5+ days — immediate attention required.',    time:'2 hrs ago' },
        { type:'warning', title:'Pending Listings Backlog',     msg:'4 produce listings awaiting moderation for over 48 hours.',            time:'5 hrs ago' },
        { type:'warning', title:'Banned User Login Attempt',    msg:'Mohammed Irfan attempted login. Session blocked automatically.',       time:'Yesterday' },
        { type:'success', title:'System Backup Completed',      msg:'Full database backup completed successfully. Size: 2.4 GB.',          time:'Yesterday' },
        { type:'info',    title:'New User Registrations',       msg:'6 new farmers registered from Bihar and UP in the last 24 hours.',    time:'2 days ago' },
    ]
};

window.DEMO      = DEMO;
window.showToast = showToast;
window.setActiveNav = setActiveNav;

document.addEventListener('DOMContentLoaded', setActiveNav);
