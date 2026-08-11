import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'sdk_config.dart';

class TelemetryTracker {
  static final TelemetryTracker _instance = TelemetryTracker._internal();
  factory TelemetryTracker() => _instance;
  TelemetryTracker._internal();

  String _deviceId = '';
  String _sessionId = '';
  final List<Map<String, dynamic>> _breadcrumbs = [];
  Timer? _heartbeatTimer;

  String get deviceId => _deviceId;
  String get sessionId => _sessionId;
  List<Map<String, dynamic>> get recentBreadcrumbs => List.unmodifiable(_breadcrumbs);

  Future<void> initTelemetry() async {
    if (!SdkConfig.enableTelemetry) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      _deviceId = prefs.getString("sdk_device_id") ?? '';

      if (_deviceId.isEmpty) {
        final randomNum = Random().nextInt(899999) + 100000;
        _deviceId = "DEV-${SdkConfig.appId.substring(0, min(5, SdkConfig.appId.length)).toUpperCase()}-$randomNum";
        await prefs.setString("sdk_device_id", _deviceId);
      }

      _sessionId = "SESS-${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(9999)}";

      final packageInfo = await PackageInfo.fromPlatform();
      final appVersion = packageInfo.version;
      final buildNumber = int.tryParse(packageInfo.buildNumber) ?? 1;

      final payload = {
        "app_id": SdkConfig.appId,
        "device_id": _deviceId,
        "device_brand": Platform.isAndroid ? "Android" : "iOS",
        "device_model": Platform.operatingSystem,
        "os_type": Platform.isAndroid ? "Android" : "iOS",
        "os_version": Platform.operatingSystemVersion,
        "sdk_int": 34,
        "app_version": appVersion,
        "build_number": buildNumber,
      };

      await http.post(
        Uri.parse("${SdkConfig.serverUrl}/telemetry/install"),
        headers: {
          "Content-Type": "application/json",
          "X-App-ID": SdkConfig.appId,
          "X-API-Key": SdkConfig.apiKey,
        },
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 6));

      addBreadcrumb(tag: "AppLifecycle", message: "Application launched and telemetry initialized");

      if (SdkConfig.enableSessionHeartbeat) {
        _startHeartbeat();
      }
    } catch (e) {
      debugPrint("⚠️ [Telemetry Tracker] Sync failed: $e");
    }
  }

  void addBreadcrumb({required String tag, required String message, Map<String, dynamic>? metadata}) {
    final crumb = {
      "tag": tag,
      "message": message,
      "metadata": metadata,
      "timestamp": DateTime.now().toIso8601String(),
    };
    _breadcrumbs.add(crumb);
    if (_breadcrumbs.length > 25) _breadcrumbs.removeAt(0);
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(
      Duration(seconds: SdkConfig.heartbeatIntervalSeconds),
      (_) => _sendHeartbeat(),
    );
  }

  Future<void> _sendHeartbeat() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final payload = {
        "app_id": SdkConfig.appId,
        "session_id": _sessionId,
        "device_id": _deviceId,
        "app_version": packageInfo.version,
        "duration_seconds": SdkConfig.heartbeatIntervalSeconds,
      };

      await http.post(
        Uri.parse("${SdkConfig.serverUrl}/telemetry/session"),
        headers: {
          "Content-Type": "application/json",
          "X-App-ID": SdkConfig.appId,
          "X-API-Key": SdkConfig.apiKey,
        },
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 4));
    } catch (_) {}
  }
}
