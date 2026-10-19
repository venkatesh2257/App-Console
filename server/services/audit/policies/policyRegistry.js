/**
 * Versioned Google Play Policy Registry
 * Self-describing policy rules with versioning, effective dates, platform scopes, and documentation URLs.
 */
const POLICY_DATABASE = {
  policyVersion: '2026.09',
  lastVerified: '2026-09-22',
  rules: {
    // 1. Target API Level
    'ANDROID-TARGET-2026-001': {
      ruleId: 'ANDROID-TARGET-2026-001',
      name: 'Target API Level Mandate (Android 16 / SDK 36)',
      category: 'TARGET_SDK',
      version: '2026.09',
      effectiveDate: '2026-08-31',
      source: {
        organization: 'Google Play',
        url: 'https://support.google.com/googleplay/android-developer/answer/11926878'
      },
      scopes: {
        'android-mobile': {
          new_app: { minTargetSdk: 36 },
          update: { minTargetSdk: 36, legacyGraceMinSdk: 35 }
        },
        'wear-os': {
          new_app: { minTargetSdk: 34 },
          update: { minTargetSdk: 34 }
        },
        'android-tv': {
          new_app: { minTargetSdk: 34 },
          update: { minTargetSdk: 34 }
        }
      },
      description: 'New apps and updates must target API level 36 (Android 16 preview/release) or higher.'
    },

    // 2. 16 KB Page Memory Alignment
    'ANDROID-16KB-001': {
      ruleId: 'ANDROID-16KB-001',
      name: '16 KB Memory Page Size Compatibility',
      category: 'PAGE_SIZE_16KB',
      version: '2026.09',
      effectiveDate: '2025-11-01',
      mandatoryDate: '2026-11-01',
      source: {
        organization: 'Android Developers',
        url: 'https://developer.android.com/guide/practices/page-sizes'
      },
      scopes: ['android-mobile', 'android-tv', 'android-xr'],
      requirements: {
        minLoadAlignment: 0x4000, // 16384 bytes (16 KB)
        bundlePackagingAlignment: true,
        agpMinVersion: '8.5.1'
      },
      description: 'All 64-bit native libraries (.so) and AAB packaging must support 16 KB page memory alignment.'
    },

    // 3. Signing Keystore Security
    'ANDROID-SIGNING-001': {
      ruleId: 'ANDROID-SIGNING-001',
      name: 'Production Signing Certificate & App Registry Match',
      category: 'SIGNING',
      version: '2026.09',
      effectiveDate: '2020-01-01',
      source: {
        organization: 'Google Play Security',
        url: 'https://developer.android.com/studio/publish/app-signing'
      },
      description: 'Release artifacts must be signed with official organization keystores and match the registered SHA-256 fingerprint; debug keystores are strictly blocked.'
    },

    // 4. 64-Bit Native Support
    'ANDROID-64BIT-001': {
      ruleId: 'ANDROID-64BIT-001',
      name: '64-Bit Architecture Requirement',
      category: 'ABI_64BIT',
      version: '2026.09',
      effectiveDate: '2019-08-01',
      source: {
        organization: 'Google Play',
        url: 'https://developer.android.com/distribute/best-practices/develop/64-bit'
      },
      description: 'Apps with 32-bit native code must also include 64-bit native code (arm64-v8a or x86_64).'
    },

    // 5. Package Installation Restrictions
    'ANDROID-INSTALL-PKG-001': {
      ruleId: 'ANDROID-INSTALL-PKG-001',
      name: 'Package Installation Permission Policy Review',
      category: 'PERMISSIONS',
      version: '2026.09',
      effectiveDate: '2022-07-01',
      source: {
        organization: 'Google Play Developer Policy',
        url: 'https://support.google.com/googleplay/android-developer/answer/12085295'
      },
      permission: 'android.permission.REQUEST_INSTALL_PACKAGES',
      description: 'REQUEST_INSTALL_PACKAGES requires app core functionality verification, human justification, and store listing declaration.'
    },

    // 6. Foreground Service Types
    'ANDROID-FGS-TYPE-001': {
      ruleId: 'ANDROID-FGS-TYPE-001',
      name: 'Foreground Service Type Declaration (Android 14+)',
      category: 'SECURITY_MANIFEST',
      version: '2026.09',
      effectiveDate: '2023-08-31',
      source: {
        organization: 'Android Developers',
        url: 'https://developer.android.com/about/versions/14/changes/fgs-types-required'
      },
      description: 'Services targeting Android 14+ must declare specific foregroundServiceType in the manifest.'
    },

    // 7. Component Export Security
    'ANDROID-EXPORT-001': {
      ruleId: 'ANDROID-EXPORT-001',
      name: 'Component Export Safety & Intent Filter Protection',
      category: 'SECURITY_MANIFEST',
      version: '2026.09',
      effectiveDate: '2021-11-01',
      source: {
        organization: 'Android Developers',
        url: 'https://developer.android.com/about/versions/12/behavior-changes-12#exported'
      },
      description: 'All activities, services, and receivers with intent-filters must declare android:exported and appropriate permission guards.'
    },

    // 8. R8 / ProGuard Code Optimization
    'ANDROID-R8-001': {
      ruleId: 'ANDROID-R8-001',
      name: 'R8 / ProGuard Code Optimization & Deobfuscation Mapping',
      category: 'R8_PROGUARD',
      version: '2026.09',
      effectiveDate: '2021-08-01',
      source: {
        organization: 'Android Developers',
        url: 'https://developer.android.com/topic/performance/app-optimization/troubleshoot-the-optimization'
      },
      description: 'Release builds must generate deobfuscation mappings and verify missing classes/keep rules.'
    },

    // 9. Privacy Policy & Data Disclosure Consistency
    'ANDROID-PRIVACY-001': {
      ruleId: 'ANDROID-PRIVACY-001',
      name: 'Privacy Policy & Data Safety Consistency',
      category: 'PRIVACY_CONSISTENCY',
      version: '2026.09',
      effectiveDate: '2026-07-15',
      source: {
        organization: 'Google Play Policy',
        url: 'https://support.google.com/googleplay/android-developer/answer/17134731'
      },
      description: 'All sensitive hardware permissions and data access must have consistent disclosures in the Privacy Policy and Data Safety form.'
    },

    // 10. Stalkerware & Monitoring Applications Policy
    'ANDROID-STALKERWARE-001': {
      ruleId: 'ANDROID-STALKERWARE-001',
      name: 'Stalkerware & Monitoring Applications Policy (isMonitoringTool Flag)',
      category: 'SECURITY_MANIFEST',
      version: '2026.09',
      effectiveDate: '2022-11-01',
      source: {
        organization: 'Google Play Developer Policy',
        url: 'https://support.google.com/googleplay/android-developer/answer/9888380#commercial-spyware'
      },
      description: 'Apps with monitoring or tracking capabilities (e.g. child monitoring, enterprise management) must declare the android.app.isMonitoringTool metadata flag in AndroidManifest.xml and provide persistent user notification.'
    },

    // 11. Photo and Video Permissions Policy
    'ANDROID-PHOTO-VIDEO-PERM-001': {
      ruleId: 'ANDROID-PHOTO-VIDEO-PERM-001',
      name: 'Photo and Video Permissions Policy (System Photo Picker Mandate)',
      category: 'PERMISSIONS',
      version: '2026.09',
      effectiveDate: '2024-08-31',
      source: {
        organization: 'Google Play Developer Policy',
        url: 'https://developer.android.com/training/data-storage/shared/photopicker'
      },
      description: 'Apps targeting Android 13+ (API 33+) must use the Android Photo Picker or system picker instead of broad READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions unless technically insufficient for core functionality.'
    },

    // 12. Package Visibility Policy (QUERY_ALL_PACKAGES)
    'ANDROID-QUERY-ALL-PKG-001': {
      ruleId: 'ANDROID-QUERY-ALL-PKG-001',
      name: 'Package Visibility Policy (QUERY_ALL_PACKAGES)',
      category: 'PERMISSIONS',
      version: '2026.09',
      effectiveDate: '2021-04-01',
      source: {
        organization: 'Google Play Developer Policy',
        url: 'https://support.google.com/googleplay/android-developer/answer/10158779'
      },
      description: 'QUERY_ALL_PACKAGES is restricted to device search, antivirus, and launchers. All other apps must use targeted <queries> declarations in AndroidManifest.xml.'
    },

    // 13. Exact Alarm Policy (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM)
    'ANDROID-EXACT-ALARM-001': {
      ruleId: 'ANDROID-EXACT-ALARM-001',
      name: 'Exact Alarm Policy (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM)',
      category: 'PERMISSIONS',
      version: '2026.09',
      effectiveDate: '2023-08-31',
      source: {
        organization: 'Android Developers',
        url: 'https://developer.android.com/about/versions/14/changes/schedule-exact-alarms'
      },
      description: 'Apps targeting Android 13+ or 14+ must only use SCHEDULE_EXACT_ALARM or USE_EXACT_ALARM if core functionality requires time-sensitive user actions (e.g. alarm clock, calendar).'
    },

    // 14. Full-Screen Intent Policy (USE_FULL_SCREEN_INTENT)
    'ANDROID-FULL-SCREEN-INTENT-001': {
      ruleId: 'ANDROID-FULL-SCREEN-INTENT-001',
      name: 'Full-Screen Intent Policy (USE_FULL_SCREEN_INTENT)',
      category: 'PERMISSIONS',
      version: '2026.09',
      effectiveDate: '2024-05-31',
      source: {
        organization: 'Android Developers',
        url: 'https://developer.android.com/about/versions/14/changes/full-screen-intents'
      },
      description: 'USE_FULL_SCREEN_INTENT permission is restricted to calling and alarm apps on Android 14+ devices.'
    }
  },

  // Upcoming Requirements Horizon for Release Planning
  upcomingRequirements: [
    {
      id: 'UPCOMING-16KB-MANDATE',
      title: 'Mandatory 16 KB Page Support for all App Updates',
      effectiveDate: '2026-11-01',
      category: 'PAGE_SIZE_16KB',
      impact: 'Apps containing non-16KB native binaries will be blocked from uploading new version codes.',
      recommendedAction: 'Recompile NDK binaries with -Wl,-z,max-page-size=16384 and update vendor SDKs.'
    },
    {
      id: 'UPCOMING-SDK37-HORIZON',
      title: 'Target SDK 37 (Android 17) Horizon',
      effectiveDate: '2027-08-31',
      category: 'TARGET_SDK',
      impact: 'Google Play annual target API bump.',
      recommendedAction: 'Plan SDK upgrade path in Q1/Q2 2027.'
    }
  ]
};

function getPolicyRule(ruleId) {
  return POLICY_DATABASE.rules[ruleId] || null;
}

function getPolicyVersion() {
  return POLICY_DATABASE.policyVersion;
}

function getUpcomingRequirements() {
  return POLICY_DATABASE.upcomingRequirements;
}

module.exports = {
  POLICY_DATABASE,
  getPolicyRule,
  getPolicyVersion,
  getUpcomingRequirements
};
