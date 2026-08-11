import 'package:flutter/material.dart';

import 'src/sdk_config.dart';
import 'src/version_gatekeeper.dart';
import 'src/telemetry_tracker.dart';
import 'src/crash_reporter.dart';

export 'src/sdk_config.dart';
export 'src/version_gatekeeper.dart';
export 'src/telemetry_tracker.dart';
export 'src/crash_reporter.dart';

/// Enterprise Multi-App Developer Console SDK for Flutter
class AppConsoleSDK {
  /// One-line initialization in main() for any of your 20+ mobile apps!
  static Future<void> initialize({
    required String serverUrl,
    required String appId,
    required String apiKey,
    bool enableTelemetry = true,
    bool enableCrashReporting = true,
    bool enableSessionHeartbeat = true,
    int heartbeatIntervalSeconds = 60,
  }) async {
    SdkConfig.serverUrl = serverUrl;
    SdkConfig.appId = appId;
    SdkConfig.apiKey = apiKey;
    SdkConfig.enableTelemetry = enableTelemetry;
    SdkConfig.enableCrashReporting = enableCrashReporting;
    SdkConfig.enableSessionHeartbeat = enableSessionHeartbeat;
    SdkConfig.heartbeatIntervalSeconds = heartbeatIntervalSeconds;

    if (enableCrashReporting) {
      CrashReporter.initialize();
    }

    if (enableTelemetry) {
      await TelemetryTracker().initTelemetry();
    }
  }

  /// Call this in your Splash Screen to enforce mandatory or optional updates
  static Future<bool> checkAppVersion({BuildContext? context}) async {
    return await VersionGatekeeper().checkAppVersion(context: context);
  }

  /// Add custom telemetry breadcrumb for debugging
  static void logEvent(String tag, String message, {Map<String, dynamic>? metadata}) {
    TelemetryTracker().addBreadcrumb(tag: tag, message: message, metadata: metadata);
  }
}
