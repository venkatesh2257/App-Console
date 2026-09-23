# App Console 📱

A self-hosted developer console to manage app versions, force updates, track APK installs, and catch crashes across multiple mobile apps — without needing Google Play Store or Firebase.

Built for internal apps, enterprise fleets, and government projects where apps are distributed directly via APK portals.

---

## What does it do?

- **Manage 20+ apps in one place**: Switch between projects easily from the top dropdown.
- **Remote Force Updates**: Block outdated app versions on launch and force users to download the latest APK with 1 click.
- **Install & Active Device Tracking**: See daily active users (DAU), total installs, and device specs (models, Android OS versions).
- **Crash Reports & Stack Traces**: View exact error stack traces, line numbers, affected screens, and user action breadcrumbs before a crash happened.
- **Audit Reports**: Export install counts and crash logs to CSV or JSON whenever needed.
- **Drop-in Flutter SDK**: Add it to any Flutter app in under 2 minutes.

---

## Quick Start (Run Locally)

### 1. Clone & Install
```bash
git clone https://github.com/venkatesh2257/App-Console.git
cd App-Console
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Default settings work out of the box with local SQLite).*

### 3. Start the Server
```bash
npm start
```
Open **`http://localhost:5000`** in your browser.

---

## Deploy to Cloud (Render / Free Tier)

1. Go to [render.com](https://render.com) and click **New +** > **Web Service**.
2. Connect this GitHub repo.
3. Choose **Docker** runtime and select the **Free** tier.
4. Add environment variable: `PORT` = `5000`.
5. Click **Deploy**.

Render will give you a free public HTTPS URL (e.g. `https://your-app-console.onrender.com`).

---

## How to Connect Your Flutter App

### 1. Copy SDK
Copy the `sdk/flutter/lib/` folder into your Flutter project's `lib/sdk/` folder.

Make sure you have these standard packages in your `pubspec.yaml`:
```yaml
dependencies:
  http: ^1.3.0
  shared_preferences: ^2.5.1
  package_info_plus: ^8.3.0
```

### 2. Initialize in `main.dart`
```dart
import 'package:flutter/material.dart';
import 'package:your_app/sdk/app_console_sdk.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Developer Console
  await AppConsoleSDK.initialize(
    serverUrl: "https://your-app-console.onrender.com/api/v1/app",
    appId: "in.gov.telangana.vas1962",
    apiKey: "app_key_your_generated_key_from_dashboard",
  );

  runApp(const MyApp());
}
```

### 3. Add Version Check in `SplashScreen`
```dart
import '../sdk/app_console_sdk.dart';

Future.delayed(const Duration(milliseconds: 1500), () async {
  bool canProceed = await AppConsoleSDK.checkAppVersion(context: context);
  if (canProceed) {
    // Version is good -> proceed to login/home
    loginController.checkLoginStatus();
  }
  // If outdated, a force update dialog pops up automatically and blocks login!
});
```

---

## License
MIT
