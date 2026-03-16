# KisanSetu — Farmer-Centric Digital Agri-Ecosystem

> A digital platform connecting farmers, buyers, and equipment owners to create a transparent and efficient agricultural marketplace.

**Team:** K2M  
**Course Project — Construction Phase**  
**Version:** 1.0  

---

## Team Members

| Name | Roll Number | Responsibility |
|------|-------------|---------------|
| Yash Yadav | 24293916139 | Auth flow, Farmer sell & listings, README |
| Deepanshu | 24293919105 | Mandi prices, Bid inbox, Buyer browse |
| Shivansh Tripathi | 24293916066 | Inventory, Soil health, Buyer orders |
| Mayank Agarwal | 24293916106 | Equipment rental, Fleet management |
| Vishal Kumar | 24293916137 | Offline sync, Notifications, Session guard |

---

## How to Run

No installation needed. This is a pure HTML/CSS/JS project.

1. Clone the repository:
   ```
   git clone <your-repo-url>
   cd kisansetu
   ```

2. Open `index.html` in any browser:
   ```
   open index.html
   ```
   Or simply double-click `index.html` in your file explorer.

3. The app starts at the splash screen and walks through:
   - Language selection → Login → OTP → Role selection → Dashboard

> **Note:** All data is stored in `localStorage`. No backend or internet connection is required to run the app.

---

## Folder Structure

```
kisansetu/
│
├── index.html                  # Entry point — splash, login, OTP, role selection
├── app.js                      # Auth flow logic and screen navigation
├── style.css                   # Shared styles for auth screens
├── registration.html           # New user registration form
├── registration.js             # Registration logic and preview
├── registration_style.css      # Registration-specific styles
├── .gitignore
├── README.md
│
├── farmer/                     # All farmer-role pages
│   ├── farmer_dashboard.html   # Farmer home screen
│   ├── farmer_dashboard.js
│   ├── farmer_dashboard_style.css
│   ├── farmer_profile.html     # KYC and profile completion
│   ├── farmer_profile.js
│   ├── form_style.css          # Shared form styles (used by sell + profile)
│   ├── sell_produce.html       # Create crop listing
│   ├── sell_produce.js
│   ├── my_listings.html        # View and manage listings
│   ├── my_listings.js
│   ├── bid_inbox.html          # Incoming buyer bids
│   ├── bid_inbox.js
│   ├── mandi_prices.html       # Real-time mandi price dashboard
│   ├── mandi_prices.js
│   ├── price_trend.html        # 30-day price trend chart
│   ├── price_trend.js
│   ├── inventory.html          # Post-harvest stock management
│   ├── inventory.js
│   ├── soil_health.html        # Soil Health Card + recommendations
│   ├── soil_health.js
│   ├── rent_equipment.html     # Browse and book equipment
│   ├── rent_equipment.js
│   ├── my_bookings.html        # Track equipment bookings
│   ├── my_bookings.js
│   ├── payment_status.html     # Escrow and payment tracker
│   └── payment_status.js
│
├── buyer/                      # All buyer-role pages
│   ├── buyer_dashboard.html
│   ├── buyer_dashboard.js
│   ├── buyer_dashboard_style.css
│   ├── browse_produce.html     # Marketplace listing browser
│   ├── browse_produce.js
│   ├── bids_offers.html        # Active bids placed by buyer
│   ├── bids_offers.js
│   ├── track_orders.html       # Order status and delivery tracking
│   ├── track_orders.js
│   ├── live_mandi.html         # Mandi price view with 30-day chart
│   └── live_mandi.js
│
├── equipment/                  # All equipment owner pages
│   ├── equipment_dashboard.html
│   ├── equipment_dashboard.js
│   ├── equipment_dashboard_style.css
│   ├── manage_fleet.html       # Add/edit/remove equipment
│   ├── manage_fleet.js
│   ├── booking_requests.html   # Approve or reject farmer bookings
│   ├── booking_requests.js
│   ├── rental_calendar.html    # Availability calendar per asset
│   ├── rental_calendar.js
│   ├── earnings_report.html    # Monthly earnings summary
│   └── earnings_report.js
│
├── shared/                     # Shared utilities used across all roles
│   ├── offline_sync.js         # localStorage queue + auto-sync on reconnect
│   ├── session_guard.js        # RBAC session check + 30-min auto-logout
│   ├── notifications.html      # Central notification centre
│   ├── notifications.js
│   └── toast.js                # Reusable toast notification utility
│
└── images/                     # All image assets
    ├── logo.jpeg
    ├── farmer_profile.jpeg
    ├── sell_produce.jpeg
    └── ...
```

---

## Features by Role

### Farmer
| Feature | SRS Reference | Status |
|---------|--------------|--------|
| Mobile OTP login | FR-1.1 | Done |
| Role selection and registration | FR-1.2 | Done |
| Farmer profile and KYC | FR-1.3 | In progress |
| Farmer dashboard | FR-1.3 | Done |
| Create produce listing | FR-3.1 | Done |
| My listings with state machine | FR-3.1, FR-3.5 | In progress |
| Bid inbox (accept/reject/counter) | FR-3.2 | In progress |
| Mandi prices with filter | FR-2.1, FR-2.2 | In progress |
| Best price highlight (50km) | FR-2.4 | In progress |
| 30-day price trend chart | FR-2.3 | Planned |
| Inventory and shelf-life tracking | FR-5.1 – FR-5.3 | Planned |
| Stock summary PDF report | FR-5.4 | Planned |
| Soil Health Card lookup | FR-6.1, FR-6.2 | Planned |
| Government schemes feed | FR-6.3 | Planned |
| Equipment rental booking | FR-4.1 – FR-4.3 | Planned |
| My bookings tracker | FR-4.4 | Planned |
| Payment and escrow status | FR-3.4, FR-7.2 | Planned |

### Buyer
| Feature | SRS Reference | Status |
|---------|--------------|--------|
| Buyer dashboard | FR-1.4 | Done |
| Browse produce marketplace | FR-3.2, FR-3.3 | Planned |
| Bids and offers management | FR-3.2 | Planned |
| Track orders | FR-3.4 | Planned |
| Live mandi prices with chart | FR-2.3 | Planned |

### Equipment Owner
| Feature | SRS Reference | Status |
|---------|--------------|--------|
| Equipment owner dashboard | FR-1.5 | Done |
| Manage fleet (add/edit/delete) | FR-4.1 | Planned |
| Booking requests (approve/reject) | FR-4.4 | Planned |
| Rental availability calendar | FR-4.2 | Planned |
| Earnings report | FR-1.5, FR-7.2 | Planned |

### Shared / Infrastructure
| Feature | SRS Reference | Status |
|---------|--------------|--------|
| Offline data queue and sync | NFR-5.2 | Planned |
| Session guard and RBAC routing | FR-1.6, NFR-5.3 | Planned |
| Notification centre | FR-7.1, FR-7.3 | Planned |
| Toast notification utility | FR-7.1 | Planned |

---

## SRS Reference

The full Software Requirements Specification document is included in this repository: `docs/SRS_KisanSetu_v1.0.pdf`

Key functional requirements implemented:
- **FR-1**: Role-Based User Access and Management (RBAC)
- **FR-2**: Real-Time Mandi Price Dashboard
- **FR-3**: Direct Produce Listing and Transaction System
- **FR-4**: Agricultural Equipment Rental and Booking Module
- **FR-5**: Inventory and Post-Harvest Management
- **FR-6**: Government Service Integration (eNAM, Soil Health Cards)
- **FR-7**: Notifications, Alerts and Digital Records

---

## Known TBD Items (from SRS Appendix C)

| ID | Item | Reason |
|----|------|--------|
| TBD-01 | Payment gateway vendor | Cost-benefit analysis pending |
| TBD-02 | Voice NLP engine (Bhashini vs Google STT) | Dialect accuracy evaluation pending |
| TBD-03 | Soil Health Card API method | Government lab API confirmation pending |
| TBD-06 | Mandi price refresh frequency | eNAM API rate limit confirmation pending |

---

## Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Storage:** localStorage / sessionStorage (client-side, offline-capable)
- **Fonts:** Poppins (Google Fonts)
- **Icons:** Font Awesome 6.4.0
- **Charts:** Chart.js (planned for price trend pages)

---

## Git Workflow

This project follows feature-branch workflow:
- All development happens on `feat/<feature-name>` branches
- Branches are merged to `main` when the feature is complete
- Each commit represents one logical unit of work
- Commit messages follow the format: `type(scope): description`

---

*KisanSetu — Empowering the Agri-Ecosystem*
