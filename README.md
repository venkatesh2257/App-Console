# Enterprise Multi-App Developer Console & Version Control Hub

A centralized, enterprise-grade **Developer Control Console, Crashlytics & Force Update Hub** designed to manage **20+ mobile applications** across your organization with:
- **Project Switcher & Multi-App Registry** (Like Google Play Console & Firebase Console)
- **Per-App Version Gatekeeper & Live Force Update Master Switch**
- **Portal Distribution KPIs** (Installs, Active Fleets, DAU, WAU, MAU)
- **Real-Time Crashlytics Engine** (Stack traces, line numbers, hardware states, breadcrumbs)
- **Comprehensive Period Reports** (Day / Week / Month / Year with CSV & JSON exports)
- **Universal Flutter Client SDK** (`sdk/flutter/`) for instant 2-line integration into any app.

---

## 🚀 Quick Deployment Guide

```bash
# 1. Enter the console directory
cd app_dev_console

# 2. Install dependencies
npm install

# 3. Start the console server
npm start
```
Open **`http://localhost:5000`** in your browser to access the live Multi-App Developer Console!

---

## 📱 Mobile API Endpoints (Shared Across All 20 Apps)

All apps hit the same central API host by providing their `app_id` and `api_key`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET / POST` | `/api/v1/app/version-check` | Returns version status, force update flag & APK URL for specific app |
| `POST` | `/api/v1/app/telemetry/install` | Records first-time installation / activation |
| `POST` | `/api/v1/app/telemetry/session` | Sends session heartbeat & active status |
| `POST` | `/api/v1/app/telemetry/crash` | Uploads full stack trace & device diagnostics |
| `POST` | `/api/v1/app/telemetry/logs` | Uploads batch breadcrumb logs |

---

## 💻 Admin Console Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET / POST` | `/api/v1/admin/projects` | List all 20+ apps, register new mobile app |
| `GET` | `/api/v1/admin/overview` | Global & Per-app KPI overview |
| `GET` | `/api/v1/admin/timeseries` | Installs & crash timeline trends |
| `GET / POST` | `/api/v1/admin/versions/:projectId`| Manage version releases & force update rules |
| `GET` | `/api/v1/admin/crashes` | Paginated crash issues with search & filters |
| `GET` | `/api/v1/admin/devices` | All registered government tablet inventory |
| `GET` | `/api/v1/admin/export` | Download CSV / JSON audit reports |
