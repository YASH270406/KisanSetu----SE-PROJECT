KisanSetu: Farmer-Centric Digital Agri-Ecosystem

KisanSetu is an integrated "phygital" (physical + digital) platform designed to revolutionize the Indian agricultural sector. By leveraging a Peer-to-Peer (P2P) and Business-to-Business (B2B) operational paradigm, the platform connects farmers directly with buyers, equipment owners, and government services to increase farmer income by an estimated 25–35%.

TABLE OF CONTENTS:

1. Core Functionalities
2. System Architecture
3. Key Features
4. Tech Stack
5. External Integrations
6. Security Design

----------------------------------------------

1. Core Functionalities
   
  Smart Marketplace: Real-time mandi price discovery and direct B2B/B2C sales to eliminate exploitative intermediaries.

  Asset Sharing: A rental-based platform for affordable access to modern machinery like tractors, harvesters, and drones.

  Government Integration: Centralized access to eNAM, Soil Health Card data, and various subsidy schemes.

  Post-Harvest Management: Digital ledger for harvest tracking and shelf-life estimation to reduce crop wastage.



2. System Architecture

  KisanSetu utilizes a Microservices Architecture to ensure high scalability and flexibility.

  Presentation Layer: Optimized for rural use with multilingual support and a voice-first interface for users with low digital literacy.

  Application Layer: Core logic including User Management, Crop Listing, Equipment Sharing, and Notification Services.

  Data Layer: A dual-database approach featuring a Cloud Database for global sync and a Local SQLite Database for 100% offline resilience.



3. Key Features


<img width="1095" height="582" alt="Screenshot 2026-04-09 232211" src="https://github.com/user-attachments/assets/8aecd1b8-7c27-44d5-adbd-d677213ecf0d" />



4. Tech Stack

  Backend: Cloud-based Microservices.

  Mobile: Lightweight Android application optimized for mid-to-low-range hardware.

  Database: Cloud Database (Centralized) + SQLite (Local).

  Communication: MQTT for low-bandwidth IoT/Sensor data and HTTPS/REST for secure API calls.



5. External Integrations

  e-NAM API: For real-time auction and wholesale price data.

  Soil Health Card DB: To provide data-driven fertilizer and crop recommendations.

  Payment Gateways: Secure UPI and Net Banking integration with escrow support.



6. Security Design

  Authentication: OTP-based mobile login with 30-minute session timeouts.

  Data Protection: PII (Aadhaar/Phone) encrypted at rest using AES-256.

  Integrity: Passwords secured via bcrypt hashing.

  Auditability: Immutable transaction logs recorded on a private ledger.



DEVELOPMENT TEAM (K2M)

Yash Yadav

Deepanshu

Shivansh Tripathi

Mayank Agarwal

Vishal Kumar


Instructor: Rekha R, Assistant Professor
