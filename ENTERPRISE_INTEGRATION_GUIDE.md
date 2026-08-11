# 📘 Enterprise Developer Console & SDK Master Integration Guide

Welcome to the **Enterprise Multi-App Developer Console & Version Control Hub**! This complete guide explains how to manage your **20+ mobile applications**, register new apps, configure remote force updates, inspect live Crashlytics stack traces, and integrate the universal Flutter SDK into any mobile app codebase in **under 2 minutes**.

---

## 🌐 Live & Local Endpoints

| Environment | Dashboard Web URL | Mobile SDK API Base URL |
| :--- | :--- | :--- |
| ☁️ **Live Cloud (Render)** | `https://app-console-z991.onrender.com/` | `https://app-console-z991.onrender.com/api/v1/app` |
| 💻 **Local Development** | `http://localhost:5000/` | `http://localhost:5000/api/v1/app` |

---

## 🖥️ Part 1: How to Use the Web Dashboard

### 1. How to Run the Dashboard Locally
```bash
cd ~/Desktop/app_dev_console
npm start
```
Open **`http://localhost:5000`** in your browser.

---

### 2. How to Add a New Mobile Application (Managing 20+ Apps)
1. In the top right corner of the dashboard, click the purple button: **`+ Add App`**.
2. Fill in your application metadata:
   * **App Name**: e.g., `108 Emergency Medical Response`
   * **App Package ID**: e.g., `in.gov.emergency.108`
   * **Category**: Government / Emergency / Public Safety / Healthcare
   * **Platform**: Android / iOS / Cross-Platform
   * **Description**: Brief purpose of the application.
3. Click **`Register Project`**.
4. The dashboard will instantly generate a **Unique API Key** (e.g. `app_key_emri108_c34e88f550a1`).

---

### 3. How to Switch Between Apps
* In the top-left header, click the **Project Dropdown**:
  * Select **`All Projects (Global Fleet)`** to see total company-wide installations, global crash rates, and fleet share.
  * Select any **Individual App** (e.g. `1962 Mobile Veterinary Unit`) to filter charts, version rules, crash logs, and device tablets for that specific app only!

---

### 4. How to Manage Versions & Enforce Mandatory Updates
1. On the left sidebar menu, click **`Version Gatekeeper`**.
2. **Master Switch**: Toggle the top right button **`Force Update Active`** to turn mandatory update on/off with 1 click.
3. **Publishing a New APK Release**:
   * Click **`+ Publish New Version`**.
   * **Version Name**: e.g., `1.3.0`
   * **Build Number**: e.g., `3`
   * **Min Supported Version**: e.g., `1.3.0` *(Any phone running an older version will be locked out until updated!)*
   * **Force Update**: `Mandatory`
   * **Portal APK Link**: Paste your server APK link (e.g. `http://139.167.190.26/portal/app_v1.3.0.apk`)
   * **Release Notes**: Changes list for users.
   * Click **`Publish Version Release`**.

---

### 5. How to Inspect Crashes & Stack Traces (`Crashlytics`)
1. Click **`Crashlytics`** on the left sidebar.
2. View all grouped error issues, affected Android versions, and impact counts.
3. Click **`Inspect`** on any error to view:
   * Full Flutter / Dart **Stack Trace with exact file names & line numbers**
   * Device Hardware state (RAM free, Battery %, OS version)
   * **Pre-Crash Breadcrumb Trail** (what buttons or screens the user clicked before the crash).
   * **1-Click Copy Stack Trace** to clipboard for quick debugging.

---

### 6. How to Export Audit Reports (`Period Reports`)
1. Click **`Period Reports`** on the left sidebar.
2. Select period: **Day, Week, Month, or Year**.
3. Click **`Export CSV`** or **`Export JSON`** to instantly download full installation logs or crash logs for government audit reports.

---

## 📱 Part 2: Step-by-Step Flutter App Integration (For Any of your 20 Apps)

Integrating any Flutter application into the central console takes **2 minutes in 4 easy steps**:

---

### Step 1: Copy the SDK folder to your Flutter App
Copy the `lib/sdk/` folder into your Flutter project's `lib/` directory:

```
your_flutter_app/
└── lib/
    ├── sdk/
    │   ├── app_console_sdk.dart
    │   └── src/
    │       ├── sdk_config.dart
    │       ├── version_gatekeeper.dart
    │       ├── telemetry_tracker.dart
    │       ├── crash_reporter.dart
    │       └── ui/
    │           └── force_update_dialog.dart
    ├── main.dart
    └── screens/
        └── splash_screen.dart
```

---

### Step 2: Verify Dependencies in `pubspec.yaml`
Ensure your app's `pubspec.yaml` includes standard packages:
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.3.0
  shared_preferences: ^2.5.1
  package_info_plus: ^8.3.0
```

---

### Step 3: Initialize in `lib/main.dart`
In your mobile app's `main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:your_app_package/sdk/app_console_sdk.dart'; // 👈 1. Import SDK

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 👈 2. Initialize Developer Console SDK
  await AppConsoleSDK.initialize(
    serverUrl: "https://app-console-z991.onrender.com/api/v1/app", // Your Live Cloud URL
    appId: "in.gov.telangana.vas1962",                              // Your App ID
    apiKey: "app_key_vas1962_a98f12c409e3",                         // Generated in Dashboard
  );

  runApp(const MyApp());
}
```

---

### Step 4: Add Version Gatekeeper Check in `SplashScreen`
In your `lib/screens/splash_screen.dart`:

```dart
import 'package:flutter/material.dart';
import '../sdk/app_console_sdk.dart'; // 👈 Import SDK

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Check version gatekeeper on launch:
    Future.delayed(const Duration(milliseconds: 1500), () async {
      // 👈 Checks if an update is mandatory
      bool canProceed = await AppConsoleSDK.checkAppVersion(context: context);
      
      if (canProceed) {
        // App is valid -> Proceed to Login / Home
        loginController.checkLoginStatus();
      }
      // If outdated, the non-dismissible Force Update popup appears automatically!
    });

    return Scaffold(
      body: Center(child: Text("Your Splash Screen UI")),
    );
  }
}
```

---

### Step 5: (Optional) Add Custom Breadcrumb Logs
Log key milestones in your app logic so if a crash occurs later, you can see what happened:
```dart
AppConsoleSDK.logEvent("Attendance", "Punch verified for Staff #482");
AppConsoleSDK.logEvent("TripManagement", "Trip #26081100434 started by driver");
```

---

## 📋 App ID & API Key Reference Table (Sample 20 Apps)

| # | Application Name | Package ID (`appId`) | Environment |
| :--- | :--- | :--- | :--- |
| **1** | **1962 Mobile Veterinary Unit** | `in.gov.telangana.vas1962` | Live Production |
| **2** | **ERC Biometric Attendance** | `in.gov.attendance.erc` | Registered |
| **3** | **108 Emergency Medical Response**| `in.gov.emergency.108` | Registered |
| **4** | **Dial 100 Citizen Safety** | `in.gov.citizen.dial100` | Ready for integration |
| **5** | **eSanjeevani Telemedicine** | `in.gov.health.telemedicine`| Ready for integration |
| **6-20**| *Add via "+ Add App" in Dashboard* | *Your custom package IDs* | Instant API key generation |

---

## ❓ Frequently Asked Questions (FAQ)

#### Q1: What happens if the tablet is offline / no internet when opening the app?
* The SDK handles network timeouts gracefully in the background without blocking or freezing your splash screen, so field staff can still use offline features smoothly.

#### Q2: What if we want to release an optional update instead of a mandatory one?
* In **`Version Gatekeeper`**, publish the release with **`Rule: Optional`** or click **`Set Optional`**. The popup will give the user a **"Later"** button to skip and continue using the app.

#### Q3: Does this slow down our main database server?
* **No!** All crash reports, telemetry heartbeats, and version handshakes run on this dedicated cloud server, keeping your main operational database (`139.167.190.26`) fast and clean.
