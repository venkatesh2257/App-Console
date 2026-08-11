import 'dart:convert';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'sdk_config.dart';
import 'telemetry_tracker.dart';

class CrashReporter {
  static void initialize() {
    if (!SdkConfig.enableCrashReporting) return;

    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      _reportCrash(
        errorType: details.exception.runtimeType.toString(),
        errorMessage: details.exceptionAsString(),
        stackTrace: details.stack?.toString() ?? '',
        screenName: _extractScreenName(details),
      );
    };

    PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
      _reportCrash(
        errorType: error.runtimeType.toString(),
        errorMessage: error.toString(),
        stackTrace: stack.toString(),
        screenName: "AsyncPlatformScope",
      );
      return true;
    };
  }

  static Future<void> _reportCrash({
    required String errorType,
    required String errorMessage,
    required String stackTrace,
    required String screenName,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final packageInfo = await PackageInfo.fromPlatform();
      final telemetry = TelemetryTracker();

      final payload = {
        "app_id": SdkConfig.appId,
        "error_type": errorType,
        "error_message": errorMessage,
        "stack_trace": stackTrace,
        "screen_name": screenName,
        "app_version": packageInfo.version,
        "build_number": int.tryParse(packageInfo.buildNumber) ?? 1,
        "device_id": telemetry.deviceId.isNotEmpty ? telemetry.deviceId : (prefs.getString("sdk_device_id") ?? "DEV-UNKNOWN"),
        "device_brand": Platform.isAndroid ? "Android" : "iOS",
        "device_model": Platform.operatingSystem,
        "os_version": Platform.operatingSystemVersion,
        "free_ram_mb": 512,
        "total_ram_mb": 4096,
        "battery_percent": 80,
        "is_background": 0,
        "breadcrumbs": telemetry.recentBreadcrumbs,
      };

      await http.post(
        Uri.parse("${SdkConfig.serverUrl}/telemetry/crash"),
        headers: {
          "Content-Type": "application/json",
          "X-App-ID": SdkConfig.appId,
          "X-API-Key": SdkConfig.apiKey,
        },
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 5));
    } catch (_) {}
  }

  static String _extractScreenName(FlutterErrorDetails details) {
    try {
      final context = details.context?.toString() ?? '';
      if (context.contains("screen") || context.contains("Screen")) return context;
    } catch (_) {}
    return "FlutterWidgetScope";
  }
}
