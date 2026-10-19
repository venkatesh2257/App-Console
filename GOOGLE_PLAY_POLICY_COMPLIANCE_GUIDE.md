# Google Play Developer Policy Compliance & Pre-Launch Review Guide

> **Official Comprehensive Play Console Policy Reference & Pre-Submission Auditor Handbook**  
> *Targeting Android 14, 15, and 16 (API Levels 34, 35, 36) | Policy Baseline: 2026.09*

---

## Overview

Google Play app reviews typically take **7 to 14 business days**. If an application is rejected during review, fixing the issue and submitting a new version resets the entire 14-day review clock.

Our **App Dev Console (Play Store Pre-Submission Auditor)** is designed to simulate **100% of Google Play's automated pre-launch checks and policy review algorithms** before you submit to Google Play. 

This guide provides the complete catalog of Google Play Developer Program policies, how Google Play automatically detects violations in your `.aab` / `.apk`, and the exact step-by-step code solutions.

---

## Standard Google Play Rejection Notice Format

Whenever Google Play flags an issue during automated testing or human review, it generates a standardized notification in this structure:

```text
Issue details:
[Policy Name]: [Specific Violation Description]
We found that your app is not compliant with the [Policy Name] policy...

App bundle [X]: [Specific Reason]

Why it occurred:
[Detailed explanation of the policy rule, affected Android API versions, and requirements]

How to fix:
Option 1: [Recommended Technical Migration / Code Fix]
Option 2: [Policy Exemption / Declaration Form Submission in Play Console]

Reference:
[Official Google Play Help Center / Android Developers URL]
```

Our console formats all test findings, warnings, and blockers in this exact format with copy-pasteable code fixes.

---

## Master Policy & Compliance Catalog

---

### 1. Stalkerware and Monitoring Applications Policy

#### Issue Details:
* **Policy**: Stalkerware and Monitoring Applications
* **Violation**: Missing `isMonitoringTool` flag in app manifest
* **Severity**: 🚫 **BLOCKER (Immediate App Rejection / Removal)**

#### Why It Occurs:
Google Play strictly prohibits commercial spyware and stalkerware. Apps that have legitimate monitoring or tracking functionality (such as **parental control / child safety apps** or **enterprise employee / fleet management apps**) must explicitly declare themselves as monitoring tools in the manifest, must not hide or disguise their tracking behavior, and must present a persistent notification to the device user whenever tracking is active.

#### How Google Play Identifies It in the `.aab`:
1. Google Play parses the merged manifest (`base/manifest/AndroidManifest.xml`).
2. If the app requests tracking capabilities (e.g. `ACCESS_BACKGROUND_LOCATION`, `PACKAGE_USAGE_STATS`, `BIND_DEVICE_ADMIN`, `BIND_ACCESSIBILITY_SERVICE`) or is declared as enterprise/monitoring, Play checks for the `<meta-data android:name="android.app.isMonitoringTool">` tag.
3. If the tag is missing, Google Play rejects the submission with:  
   `Missing "isMonitoringTool" Flag`.

#### How to Fix:

##### Option A: If your app is a legitimate monitoring/enterprise tool
Add the `<meta-data>` tag inside the `<application>` element in `AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.app">

    <application
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name">

        <!-- Google Play Stalkerware & Monitoring Tool Declaration -->
        <!-- Use: "child_monitoring" | "enterprise_management" | "other" -->
        <meta-data
            android:name="android.app.isMonitoringTool"
            android:value="enterprise_management" />

    </application>
</manifest>
```

> **Important**: Ensure your app displays a persistent, non-dismissible notification (`NotificationCompat.Builder.setOngoing(true)`) while running in the background.

##### Option B: If your app is NOT a monitoring app
* Remove any monitoring SDKs or unused background tracking permissions.
* In Google Play Console, review your **App Content -> Declarations** and ensure you did not check monitoring tools.
* Increment your `versionCode` in `build.gradle` (or `pubspec.yaml`) and build a new release.

---

### 2. Photo and Video Permissions Policy

#### Issue Details:
* **Policy**: Photo and Video Permissions
* **Violation**: Requesting broad media storage permissions instead of system photo picker
* **Severity**: 🚫 **BLOCKER (Immediate Upload/Release Block)**

#### Why It Occurs:
Starting with **Android 13 (API 33+)**, apps may only request broad storage permissions (`READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`, or `READ_EXTERNAL_STORAGE`) if broad access to all media files across the device is **essential for core app functionality** (e.g., dedicated photo gallery apps, device backup apps, or file managers). Apps that only require users to select photos for profile avatars, attachments, or document uploads must use the **Android Photo Picker**.

#### How Google Play Identifies It in the `.aab`:
1. Google Play reads `targetSdkVersion >= 33`.
2. It scans `<uses-permission>` tags in `AndroidManifest.xml`.
3. If `READ_MEDIA_IMAGES` or `READ_MEDIA_VIDEO` is present without an approved Core Functionality Declaration in Play Console, the upload is rejected.

#### How to Fix:

##### Step 1: Remove broad permissions from `AndroidManifest.xml`
```xml
<!-- Remove these lines from AndroidManifest.xml -->
<!-- If injected by third-party libraries, add tools:node="remove" -->
<uses-permission
    android:name="android.permission.READ_MEDIA_IMAGES"
    tools:node="remove" />
<uses-permission
    android:name="android.permission.READ_MEDIA_VIDEO"
    tools:node="remove" />
<uses-permission
    android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32"
    tools:node="remove" />
```

##### Step 2: Implement the Android Photo Picker (No Permissions Required!)

* **In Native Android (Kotlin / Jetpack)**:
```kotlin
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.PickVisualMediaRequest

// Single image picker
val pickMedia = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
    if (uri != null) {
        // Use selected photo URI
    }
}
// Launch picker (Images & Videos)
pickMedia.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo))

// Multiple images picker (up to 5 items)
val pickMultipleMedia = registerForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(5)) { uris ->
    // Handle list of URIs
}
```

* **In Flutter**:
Using `image_picker` (v0.8.9+):
```dart
import 'package:image_picker/image_picker.dart';

final ImagePicker picker = ImagePicker();
// Automatically uses the system Android Photo Picker on Android 13+ with ZERO permissions
final XFile? image = await picker.pickImage(source: ImageSource.gallery);
```

---

### 3. Target API Level Mandate (Android 15 / 16)

#### Issue Details:
* **Policy**: Target API Level Requirement
* **Violation**: App targets an outdated API level
* **Severity**: 🚫 **BLOCKER (Cannot upload new AAB / Release updates)**

#### Why It Occurs:
Google Play mandates that all new app submissions and updates must target the latest Android platform version:
* Target SDK must be **API Level 35 (Android 15)** or **API Level 36 (Android 16)**.

#### How to Fix:
Update your module-level `build.gradle` (or `build.gradle.kts`):

```groovy
android {
    compileSdk = 36

    defaultConfig {
        minSdk = 24
        targetSdk = 36
        versionCode = 10
        versionName = "1.0.1"
    }
}
```

---

### 4. 16 KB Page Memory Alignment Mandate

#### Issue Details:
* **Policy**: 16 KB Memory Page Size Compatibility
* **Violation**: 64-bit native `.so` ELF binaries compiled with 4 KB alignment
* **Severity**: 🚫 **BLOCKER (Enforced for all 64-bit Android 15+ updates)**

#### Why It Occurs:
Android 15+ introduces support for 16 KB page sizes to improve CPU cache efficiency and memory performance. Google Play requires all 64-bit native binaries (`arm64-v8a` and `x86_64`) to be built with an ELF segment alignment of **16384 bytes (16 KB)**.

#### How Google Play Identifies It in the `.aab`:
Google Play parses all `.so` files in `base/lib/arm64-v8a/` and `base/lib/x86_64/`, inspects the ELF header `PT_LOAD` segment headers, and verifies `p_align >= 16384`.

#### How to Fix:

##### In CMake (`CMakeLists.txt`):
```cmake
# Add 16 KB alignment linker flag for 64-bit architectures
target_link_options(${PROJECT_NAME} PRIVATE "-Wl,-z,max-page-size=16384")
```

##### In Android NDK (`Android.mk`):
```makefile
LOCAL_LDFLAGS += -Wl,-z,max-page-size=16384
```

##### In Gradle (`build.gradle`):
Upgrade Android Gradle Plugin (AGP) to `8.5.1` or higher and NDK to `r27` or higher.

---

### 5. Production Keystore & Signing Certificate Security

#### Issue Details:
* **Policy**: App Signing & Security Standards
* **Violation**: App signed with debug keystore or fingerprint mismatch
* **Severity**: 🚫 **BLOCKER (Immediate Upload Rejection)**

#### Why It Occurs:
Release binaries uploaded to Google Play must be signed with official organization keystores. Release builds signed with the default `Android Debug Key` (`androiddebugkey`, SHA-1 `FA:C6:17:...`) are strictly rejected.

#### How to Fix:
Configure production signing in `build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file("release-keystore.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

### 6. Component Export & Intent-Filter Security (`android:exported`)

#### Issue Details:
* **Policy**: Security & Component Exposure
* **Violation**: Missing `android:exported` attribute on activities, services, or receivers with intent filters
* **Severity**: 🚫 **BLOCKER (AAPT2 Build & Parse Failure)**

#### Why It Occurs:
Starting with Android 12 (API 31+), any component containing an `<intent-filter>` must explicitly declare `android:exported="true"` or `android:exported="false"` to prevent IPC hijacking and unintended access.

#### How to Fix:
```xml
<!-- Main Launcher Activity (Must be exported) -->
<activity
    android:name=".MainActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>

<!-- Internal Services & Receivers (Must NOT be exported) -->
<service
    android:name=".DataSyncService"
    android:exported="false" />

<receiver
    android:name=".CustomAlarmReceiver"
    android:exported="false">
    <intent-filter>
        <action android:name="com.example.app.ACTION_ALARM" />
    </intent-filter>
</receiver>
```

---

### 7. Foreground Service Types (Android 14+ / SDK 34+)

#### Issue Details:
* **Policy**: Foreground Service Policy
* **Violation**: Requesting base `FOREGROUND_SERVICE` without specific type permission
* **Severity**: 🚫 **BLOCKER / Crash (`ForegroundServiceTypeNotAllowedException`)**

#### Why It Occurs:
On Android 14+ (API 34+), foreground services must declare a specific `foregroundServiceType` attribute in the `<service>` tag and declare the matching permission in `<uses-permission>`.

#### How to Fix:
```xml
<!-- 1. Declare specific FGS permission -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- 2. Specify foregroundServiceType on the service element -->
<service
    android:name=".TrackingForegroundService"
    android:exported="false"
    android:foregroundServiceType="location" />
```

---

### 8. Restricted SMS and Call Log Permissions

#### Issue Details:
* **Policy**: Permissions Policy (SMS and Call Log)
* **Violation**: `READ_SMS`, `SEND_SMS`, `READ_CALL_LOG` in manifest
* **Severity**: 🚫 **BLOCKER (Immediate App Rejection)**

#### Why It Occurs:
Google Play strictly prohibits apps from requesting SMS or Call Log permissions unless the app is registered as the user's **Default SMS Handler** or **Default Phone Dialer**.

#### How to Fix:
* **For OTP / Phone Verification**: Migrate to the **SMS Retriever API** (automatic OTP autofill without permissions) or **Web OTP API**.
* **Remove permissions**: Delete `READ_SMS`, `RECEIVE_SMS`, `SEND_SMS`, `READ_CALL_LOG`, `WRITE_CALL_LOG` from `AndroidManifest.xml`.

---

### 9. Package Visibility Policy (`QUERY_ALL_PACKAGES`)

#### Issue Details:
* **Policy**: Package Visibility Policy
* **Violation**: Using `android.permission.QUERY_ALL_PACKAGES`
* **Severity**: 🚫 **BLOCKER / Declaration Required**

#### Why It Occurs:
`QUERY_ALL_PACKAGES` grants broad visibility into all installed applications on the user's device. Google Play restricts this permission strictly to device search apps, antivirus tools, and alternative launchers.

#### How to Fix:
Replace `QUERY_ALL_PACKAGES` with explicit `<queries>` elements in `AndroidManifest.xml`:

```xml
<manifest package="com.example.app">

    <!-- Specific packages or intent filters your app needs to interact with -->
    <queries>
        <!-- For opening web links in browsers -->
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>

        <!-- For sharing text / images to WhatsApp / Gmail -->
        <intent>
            <action android:name="android.intent.action.SEND" />
            <data android:mimeType="text/plain" />
        </intent>

        <!-- Specific payment apps (e.g. UPI apps) -->
        <package android:name="com.google.android.apps.nbu.paisa.user" />
        <package android:name="net.one97.paytm" />
    </queries>

</manifest>
```

---

### 10. Background Location (`ACCESS_BACKGROUND_LOCATION`)

#### Issue Details:
* **Policy**: Location Permissions Policy
* **Violation**: `ACCESS_BACKGROUND_LOCATION` without in-app disclosure or review approval
* **Severity**: ⚠️ **REVIEW REQUIRED / Play Console Video Submission**

#### Why It Occurs:
Google Play requires apps requesting 24/7 background location to prove that core functionality fails without it, display an in-app prominent disclosure dialog before asking for OS permission, and submit a video proof in Play Console.

#### How to Fix:
1. Show a prominent in-app dialog explaining: *"We collect location data in the background to enable [specific feature] even when the app is closed."*
2. Request foreground location (`ACCESS_FINE_LOCATION`) first, and only ask for background location in a separate, subsequent step.
3. Submit the video demonstration URL in Google Play Console under **App Content -> Location permissions**.

---

### 11. User Account Deletion Requirement

#### Issue Details:
* **Policy**: User Data & Account Deletion Policy
* **Violation**: App supports account creation but does not offer account deletion
* **Severity**: 🚫 **BLOCKER (Store Listing & Policy Review Failure)**

#### Why It Occurs:
Google Play policy requires any app that allows users to create an account to provide:
1. An **in-app deletion mechanism** within app settings.
2. A **public web URL** where users can request account and associated data deletion without reinstalling the app.

#### How to Fix:
1. Add an *"Account Deletion"* screen or button in your app's profile/settings screen.
2. Publish a live, publicly accessible deletion webpage (e.g., `https://yourdomain.com/account-deletion`).
3. Add this URL to the **Data Safety** questionnaire in Play Console.

---

### 12. App Access & Reviewer Credentials

#### Issue Details:
* **Policy**: App Access Policy
* **Violation**: Google Play testers unable to log in to test app features
* **Severity**: 🚫 **BLOCKER (Review Stalled / App Rejected)**

#### Why It Occurs:
If parts of your app are restricted by login credentials, phone OTPs, two-factor authentication, enterprise VPNs, or location geofencing, you **must provide working test account credentials** in Play Console.

#### How to Fix:
In Google Play Console:
1. Go to **Policy and programs -> App content -> App access**.
2. Select **"All or some functionality in my app is restricted"**.
3. Add active test credentials (e.g. Username: `tester@example.com`, Password: `TestPassword123!`, instructions for OTP bypass).

---

### 13. R8 / ProGuard Obfuscation & Deobfuscation Mapping

#### Issue Details:
* **Policy**: App Performance & Crash Analytics
* **Violation**: Uploading AAB without deobfuscation mapping
* **Severity**: ⚠️ **WARNING (Crashes cannot be symbolicated in Play Console)**

#### Why It Occurs:
When R8 obfuscation is enabled, stack traces from production crashes become obfuscated. Uploading the mapping file ensures Google Play Console can symbolicate crashes in Android Vitals.

#### How to Fix:
When building an Android App Bundle (`./gradlew bundleRelease`), Android Gradle Plugin automatically packages the mapping file inside `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`. Ensure `minifyEnabled true` is enabled in your release build type.

---

### 14. Store Listing Metadata Policy (30-Character Limit)

#### Issue Details:
* **Policy**: Metadata & Store Listing Policy
* **Violation**: App Name > 30 characters or containing promotional text / emojis
* **Severity**: 🚫 **BLOCKER (Store Listing Submission Rejection)**

#### Why It Occurs:
Google Play strictly limits App Names to a maximum of **30 characters**. App titles containing keywords like *"Free"*, *"Best"*, *"#1"*, or emojis are automatically rejected.

#### How to Fix:
* Keep App Name $\le 30$ characters.
* Put descriptive details in the Short Description ($\le 80$ characters) or Full Description ($\le 4000$ characters).

---

## Pre-Submission Verification Summary

By running your `.aab` or `.apk` through the **App Dev Console Release Gate**, all 14 policy categories are automatically evaluated in under 3 seconds.

```
+-------------------------------------------------------------------------------+
|                      PRE-SUBMISSION VERDICT: READY                            |
|                           COMPLIANCE SCORE: 100/100                           |
+-------------------------------------------------------------------------------+
| ✅ Stage 1: Artifact Integrity & SHA-256 Custody Validated                   |
| ✅ Stage 2: Target SDK 36, 16 KB Page Memory, Production Keystore Verified    |
| ✅ Stage 3: R8 Obfuscation & ProGuard Symbol Mapping Present                  |
| ✅ Stage 4: Restricted Permissions & Photo Picker Mandate Compliant           |
| ✅ Stage 5: Reviewer Credentials & Runtime Smoke Passes                       |
| ✅ Stage 6: Version Code Increment & Release Delta Approved                   |
| ✅ Stage 7: Canonical Evidence Report Generated for Zero-Rejection Release    |
+-------------------------------------------------------------------------------+
```
