import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ForceUpdateDialog extends StatelessWidget {
  final String currentVersion;
  final String latestVersion;
  final String minSupportedVersion;
  final String title;
  final String releaseNotes;
  final String downloadUrl;
  final bool isForceUpdate;

  const ForceUpdateDialog({
    super.key,
    required this.currentVersion,
    required this.latestVersion,
    required this.minSupportedVersion,
    required this.title,
    required this.releaseNotes,
    required this.downloadUrl,
    required this.isForceUpdate,
  });

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !isForceUpdate,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: const Color(0xFF12141A),
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isForceUpdate ? const Color(0xFFFF4757).withOpacity(0.4) : const Color(0xFF00F59B).withOpacity(0.4),
              width: 1.5,
            ),
            gradient: const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF1A1E29), Color(0xFF0D0F14)],
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isForceUpdate ? const Color(0xFFFF4757).withOpacity(0.15) : const Color(0xFF00F59B).withOpacity(0.15),
                  border: Border.all(
                    color: isForceUpdate ? const Color(0xFFFF4757) : const Color(0xFF00F59B),
                    width: 1.5,
                  ),
                ),
                child: Icon(
                  isForceUpdate ? Icons.system_update_rounded : Icons.rocket_launch_rounded,
                  color: isForceUpdate ? const Color(0xFFFF4757) : const Color(0xFF00F59B),
                  size: 32,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                title.isNotEmpty ? title : (isForceUpdate ? "Mandatory Update Required" : "New Version Available"),
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildVersionBadge("Current: v$currentVersion", const Color(0xFF64748B)),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_rounded, color: Colors.white54, size: 14),
                  const SizedBox(width: 8),
                  _buildVersionBadge("Latest: v$latestVersion", const Color(0xFF00F59B)),
                ],
              ),
              const SizedBox(height: 16),
              if (releaseNotes.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxHeight: 140),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: SingleChildScrollView(
                    child: Text(releaseNotes, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.4)),
                  ),
                ),
                const SizedBox(height: 20),
              ],
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isForceUpdate ? const Color(0xFFFF4757) : const Color(0xFF00F59B),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  ),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: downloadUrl));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("APK Portal Download Link Copied:\n$downloadUrl"),
                        backgroundColor: const Color(0xFF00F59B),
                      ),
                    );
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.download_rounded, color: isForceUpdate ? Colors.white : Colors.black, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        "Download & Install Update",
                        style: TextStyle(color: isForceUpdate ? Colors.white : Colors.black, fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ],
                  ),
                ),
              ),
              if (isForceUpdate) ...[
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => SystemNavigator.pop(),
                  child: const Text("Exit Application", style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                ),
              ] else ...[
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text("Later", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVersionBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}
