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
