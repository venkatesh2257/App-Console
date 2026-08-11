# Universal Flutter Client SDK - Enterprise App Developer Console

Integrate any Flutter application into your company's central developer console in **under 2 minutes** to get:
- Real-time **Version Gatekeeper & Force Update**
- **Portal Installation KPIs** & Active User Telemetry (DAU/WAU/MAU)
- Automatic **Crashlytics Error Reporting** with full stack traces & device memory state
- Pre-crash **Diagnostic Breadcrumbs**

---

## ⚡ Integration in 2 Steps

### 1. Initialize in `main()`
```dart
import 'package:flutter/material.dart';
import 'package:your_app/sdk/app_console_sdk.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Developer Console SDK
  await AppConsoleSDK.initialize(
    serverUrl: "http://139.167.190.26:5000/api/v1/app",
    appId: "in.gov.telangana.vas1962",           // Your App ID
    apiKey: "app_key_vas1962_a98f12c409e3",      // Your Project API Key
  );

  runApp(MyApp());
}
```

---

### 2. Verify Version in `SplashScreen`
```dart
// Inside your Splash Screen check:
Future.delayed(const Duration(milliseconds: 1500), () async {
  bool canProceed = await AppConsoleSDK.checkAppVersion(context: context);
  
  if (canProceed) {
    // Normal flow: proceed to login or home
    loginController.checkLoginStatus();
  }
  // If canProceed is false, the non-dismissible Force Update dialog is displayed automatically!
});
```

---

### 3. (Optional) Custom Event Logging / Breadcrumbs
```dart
AppConsoleSDK.logEvent("BiometricAttendance", "Staff punch verified for employee #462");
```
