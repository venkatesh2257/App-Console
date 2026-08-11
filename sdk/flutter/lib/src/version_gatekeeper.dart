import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

import 'sdk_config.dart';
import 'ui/force_update_dialog.dart';

class VersionGatekeeper {
  static final VersionGatekeeper _instance = VersionGatekeeper._internal();
  factory VersionGatekeeper() => _instance;
  VersionGatekeeper._internal();

  Future<bool> checkAppVersion({BuildContext? context}) async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      final buildNumber = packageInfo.buildNumber;

      final uri = Uri.parse(
        "${SdkConfig.serverUrl}/version-check?app_id=${SdkConfig.appId}&version=$currentVersion&buildNumber=$buildNumber&platform=Android",
      );

      final response = await http.get(
        uri,
        headers: {
          "X-App-ID": SdkConfig.appId,
          "X-API-Key": SdkConfig.apiKey,
        },
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data["status"] == "success" && data["data"] != null) {
          final verData = data["data"];
          final bool isForceUpdate = verData["is_force_update"] ?? false;
          final bool isUpdateRequired = verData["is_update_required"] ?? false;
          final String latestVersion = verData["latest_version"] ?? currentVersion;
          final String minSupported = verData["min_supported_version"] ?? currentVersion;
          final String title = verData["title"] ?? "Update Available";
          final String releaseNotes = verData["release_notes"] ?? "";
          final String downloadUrl = verData["download_url"] ?? "";

          if (isForceUpdate || isUpdateRequired) {
            if (context != null && context.mounted) {
              showDialog(
                context: context,
                barrierDismissible: !isForceUpdate,
                builder: (_) => ForceUpdateDialog(
                  currentVersion: currentVersion,
                  latestVersion: latestVersion,
                  minSupportedVersion: minSupported,
                  title: title,
                  releaseNotes: releaseNotes,
                  downloadUrl: downloadUrl,
                  isForceUpdate: isForceUpdate,
                ),
              );
            }
            return !isForceUpdate;
          }
        }
      }
    } catch (e) {
      debugPrint("⚠️ [Version Gatekeeper] Failed to verify version: $e");
    }
    return true;
  }
}
