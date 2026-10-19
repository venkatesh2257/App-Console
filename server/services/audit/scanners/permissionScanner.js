/**
 * Permission & Restricted Capabilities Policy Scanner (Stage 4)
 * Evaluates sensitive and prohibited permissions with policy context.
 * Treats REQUEST_INSTALL_PACKAGES as REVIEW_REQUIRED with human justification rather than unconditional BLOCKER.
 */

const { buildEvidence } = require('../evidence/evidenceBuilder');
const { getPolicyRule } = require('../policies/policyRegistry');

const PermissionScanner = {
  id: 'PERMISSION_POLICY_VALIDATOR',
  name: 'Restricted Permissions & Google Play Capability Policy Scanner',
  version: '2.0.0',
  stage: 4,

  supports(context) {
    return context.metadata && Array.isArray(context.metadata.permissions);
  },

  async run(context) {
    const results = [];
    const permissions = context.metadata.permissions || [];
    const appProfile = context.appProfile;
    const approvedPerms = appProfile && appProfile.permissions ? appProfile.permissions.approved : [];
    const prohibitedPerms = appProfile && appProfile.permissions ? appProfile.permissions.prohibited : [];

    // 1. Nuanced REQUEST_INSTALL_PACKAGES Evaluation
    const ruleInstall = getPolicyRule('ANDROID-INSTALL-PKG-001');
    const hasInstallPkg = permissions.some(p => p.includes('REQUEST_INSTALL_PACKAGES'));

    if (hasInstallPkg) {
      results.push(buildEvidence({
        ruleId: ruleInstall.ruleId,
        category: ruleInstall.category,
        title: 'Package Installation (REQUEST_INSTALL_PACKAGES): Policy Review Required',
        severity: 'HIGH',
        status: 'REVIEW_REQUIRED',
        verification: 'HUMAN',
        verificationLevel: 'PARTIAL',
        confidence: 'HIGH',
        what: 'Application declares android.permission.REQUEST_INSTALL_PACKAGES.',
        where: 'AndroidManifest.xml (<uses-permission>)',
        why: 'Google Play restricts in-app package installation. Permitted only if core app functionality requires user-initiated package dispatching (e.g. enterprise MDM, package managers).',
        source: ruleInstall.source.url,
        requirement: 'App core functionality must require package installation + prominent store listing disclosure + Play Console declaration declaration form.',
        remediation: 'Complete the Human Justification Form in Stage 4: confirm whether core functionality requires package installation and ensure store listing documentation is present.',
        evidence: {
          permission: 'android.permission.REQUEST_INSTALL_PACKAGES',
          requiresDeclarationForm: true,
          humanApprovalRequired: true,
          policyCategory: 'RESTRICTED_PERMISSION'
        }
      }));
    }

    // 2. Prohibited Permissions (SMS / Call Log / Query All Packages)
    const smsCallPerms = permissions.filter(p => 
      p.includes('READ_SMS') || 
      p.includes('SEND_SMS') || 
      p.includes('RECEIVE_SMS') || 
      p.includes('READ_CALL_LOG') || 
      p.includes('WRITE_CALL_LOG')
    );

    if (smsCallPerms.length > 0) {
      results.push(buildEvidence({
        ruleId: 'ANDROID-RESTRICTED-SMS-CALL-001',
        category: 'PERMISSIONS',
        title: `Restricted SMS/Call Log Permissions Detected (${smsCallPerms.length} found)`,
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: `Application requests high-risk SMS / Call Log permissions: ${smsCallPerms.join(', ')}.`,
        where: 'AndroidManifest.xml',
        why: 'Google Play prohibits SMS/Call Log access unless the app is registered as the default SMS handler or default Phone dialer on the device.',
        source: 'https://support.google.com/googleplay/android-developer/answer/10208820',
        requirement: 'App must be default phone/SMS assistant or remove SMS/Call permissions.',
        remediation: 'Remove SMS/Call Log permissions and migrate to SMS Retriever API or Web OTP API.',
        evidence: {
          restrictedPermissions: smsCallPerms
        }
      }));
    }

    // 3. Background Location (ACCESS_BACKGROUND_LOCATION)
    const hasBgLocation = permissions.some(p => p.includes('ACCESS_BACKGROUND_LOCATION'));
    if (hasBgLocation) {
      const isApprovedInRegistry = approvedPerms.includes('android.permission.ACCESS_BACKGROUND_LOCATION');

      results.push(buildEvidence({
        ruleId: 'ANDROID-PERM-BG-LOCATION-001',
        category: 'PERMISSIONS',
        title: 'Background Location Permission (ACCESS_BACKGROUND_LOCATION)',
        severity: 'HIGH',
        status: isApprovedInRegistry ? 'PASS' : 'REVIEW_REQUIRED',
        verification: isApprovedInRegistry ? 'STATIC' : 'HUMAN',
        verificationLevel: isApprovedInRegistry ? 'FULL' : 'HEURISTIC',
        what: 'Application requests 24/7 background location tracking (ACCESS_BACKGROUND_LOCATION).',
        where: 'AndroidManifest.xml',
        why: 'Google Play requires prominent in-app disclosure, background video demonstration, and Play Console approval.',
        source: 'https://support.google.com/googleplay/android-developer/answer/9799150',
        requirement: 'Core functionality justification, prominent in-app disclosure dialog before OS permission request, and Privacy Policy disclosure.',
        remediation: 'Ensure prominent disclosure dialog is shown in-app and video proof is submitted in Play Console.',
        evidence: {
          permission: 'android.permission.ACCESS_BACKGROUND_LOCATION',
          isApprovedInOrgRegistry: isApprovedInRegistry
        }
      }));
    }

    // 4. Restricted Photo and Video Permissions (Android 13+ / SDK 33+)
    const rulePhotoVideo = getPolicyRule('ANDROID-PHOTO-VIDEO-PERM-001') || {
      ruleId: 'ANDROID-PHOTO-VIDEO-PERM-001',
      category: 'PERMISSIONS',
      source: { url: 'https://developer.android.com/training/data-storage/shared/photopicker' }
    };

    const mediaPerms = permissions.filter(p =>
      p.includes('READ_MEDIA_IMAGES') ||
      p.includes('READ_MEDIA_VIDEO') ||
      p.includes('READ_MEDIA_VISUAL_USER_SELECTED')
    );

    const targetSdk = parseInt((context.metadata && context.metadata.targetSdk) || 36, 10);
    const hasBroadMediaExemption = (context.declarations && (context.declarations.hasMediaExemption || context.declarations.coreMediaApp)) ||
                                   (appProfile && appProfile.hasMediaExemption);

    if (mediaPerms.length > 0) {
      if (hasBroadMediaExemption) {
        results.push(buildEvidence({
          ruleId: rulePhotoVideo.ruleId,
          category: rulePhotoVideo.category,
          title: 'Photo and Video Permissions: Core Functionality Declaration Required',
          severity: 'HIGH',
          status: 'REVIEW_REQUIRED',
          verification: 'HUMAN',
          verificationLevel: 'PARTIAL',
          what: `Application declares broad media permissions: ${mediaPerms.join(', ')}.`,
          where: 'AndroidManifest.xml (<uses-permission>)',
          why: 'Under Google Play Photo and Video Permissions policy, broad media access is only allowed for core app functionality (e.g., photo galleries, device backup).',
          source: rulePhotoVideo.source.url,
          requirement: 'Core functionality justification and Play Console Photo & Video Declaration form submission.',
          remediation: 'Submit the Photo and Video Permissions declaration form in Play Console or switch to Android Photo Picker.',
          evidence: {
            targetSdk,
            declaredPermissions: mediaPerms,
            requiresDeclarationForm: true
          }
        }));
      } else {
        results.push(buildEvidence({
          ruleId: rulePhotoVideo.ruleId,
          category: rulePhotoVideo.category,
          title: `Broad Media Permissions Detected (${mediaPerms.join(', ')}): Switch to Android Photo Picker`,
          severity: 'BLOCKER',
          status: 'FAIL',
          verification: 'DETERMINISTIC',
          verificationLevel: 'FULL',
          what: `Application requests broad media permissions (${mediaPerms.join(', ')}) targeting Android 13+ (SDK ${targetSdk}).`,
          where: 'AndroidManifest.xml (<uses-permission>)',
          why: 'Google Play policy mandates using the Android photo picker or system picker instead of requesting broad READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions.',
          source: rulePhotoVideo.source.url,
          requirement: 'Remove READ_MEDIA_IMAGES / READ_MEDIA_VIDEO and use Android Photo Picker (ActivityResultContracts.PickVisualMedia) or system picker.',
          remediation: 'Remove broad media permissions from AndroidManifest.xml and migrate to Android Photo Picker API or system document picker.',
          evidence: {
            targetSdk,
            violatingPermissions: mediaPerms,
            recommendedPicker: 'Android Photo Picker (ActivityResultContracts.PickVisualMedia)'
          }
        }));
      }
    } else {
      results.push(buildEvidence({
        ruleId: rulePhotoVideo.ruleId,
        category: rulePhotoVideo.category,
        title: 'Photo & Video Policy: Compliant with Android Photo Picker Mandate',
        severity: 'INFO',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: 'Manifest does not request broad READ_MEDIA_IMAGES or READ_MEDIA_VIDEO permissions.',
        where: 'AndroidManifest.xml',
        why: 'Satisfies Google Play Photo and Video Permissions policy requirement for Android 13+ (API 33+).',
        source: rulePhotoVideo.source.url,
        requirement: 'Use Android Photo Picker without broad media permissions.',
        evidence: {
          targetSdk,
          hasBroadMediaPermissions: false
        }
      }));
    }

    // 5. Restricted Package Visibility (QUERY_ALL_PACKAGES)
    const hasQueryAllPkg = permissions.some(p => p.includes('QUERY_ALL_PACKAGES'));
    if (hasQueryAllPkg) {
      const isApprovedInRegistry = approvedPerms.includes('android.permission.QUERY_ALL_PACKAGES');
      results.push(buildEvidence({
        ruleId: 'ANDROID-QUERY-ALL-PKG-001',
        category: 'PERMISSIONS',
        title: 'Restricted Package Visibility Permission (QUERY_ALL_PACKAGES)',
        severity: 'HIGH',
        status: isApprovedInRegistry ? 'PASS' : 'REVIEW_REQUIRED',
        verification: isApprovedInRegistry ? 'STATIC' : 'HUMAN',
        verificationLevel: isApprovedInRegistry ? 'FULL' : 'HEURISTIC',
        what: 'Application requests broad device-wide package querying (QUERY_ALL_PACKAGES).',
        where: 'AndroidManifest.xml (<uses-permission>)',
        why: 'Google Play restricts QUERY_ALL_PACKAGES to device search, antivirus, and launchers. All other apps must declare specific <queries> filters.',
        source: 'https://support.google.com/googleplay/android-developer/answer/10158779',
        requirement: 'Replace with specific <queries> intent declarations or complete the Play Console Declaration Form.',
        remediation: 'Remove QUERY_ALL_PACKAGES and specify necessary package/intent signatures in <queries> within AndroidManifest.xml.',
        evidence: {
          permission: 'android.permission.QUERY_ALL_PACKAGES',
          isApprovedInOrgRegistry: isApprovedInRegistry
        }
      }));
    }

    // 6. Exact Alarm Permissions (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM)
    const hasExactAlarm = permissions.some(p => p.includes('SCHEDULE_EXACT_ALARM') || p.includes('USE_EXACT_ALARM'));
    if (targetSdk >= 33 && hasExactAlarm) {
      results.push(buildEvidence({
        ruleId: 'ANDROID-EXACT-ALARM-001',
        category: 'PERMISSIONS',
        title: 'Exact Alarm Permission Policy (SCHEDULE_EXACT_ALARM)',
        severity: 'MEDIUM',
        status: 'REVIEW_REQUIRED',
        verification: 'HUMAN',
        verificationLevel: 'PARTIAL',
        what: 'Application requests exact alarm scheduling on Android 13+ (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM).',
        where: 'AndroidManifest.xml (<uses-permission>)',
        why: 'Google Play restricts exact alarms to apps whose core function requires precise timing (e.g., alarm clocks, calendar reminders).',
        source: 'https://developer.android.com/about/versions/14/changes/schedule-exact-alarms',
        requirement: 'App core use case must require exact timing or migrate to WorkManager / inexact AlarmManager.',
        remediation: 'Use WorkManager for background jobs or inexact AlarmManager unless exact alarms are essential to core features.',
        evidence: {
          targetSdk,
          hasExactAlarm: true
        }
      }));
    }

    // 7. Full-Screen Intent (USE_FULL_SCREEN_INTENT on Android 14+)
    const hasFullScreenIntent = permissions.some(p => p.includes('USE_FULL_SCREEN_INTENT'));
    if (targetSdk >= 34 && hasFullScreenIntent) {
      results.push(buildEvidence({
        ruleId: 'ANDROID-FULL-SCREEN-INTENT-001',
        category: 'PERMISSIONS',
        title: 'Full-Screen Intent Policy Review (USE_FULL_SCREEN_INTENT)',
        severity: 'MEDIUM',
        status: 'REVIEW_REQUIRED',
        verification: 'HUMAN',
        verificationLevel: 'PARTIAL',
        what: 'Application requests USE_FULL_SCREEN_INTENT on Android 14+ (SDK 34+).',
        where: 'AndroidManifest.xml (<uses-permission>)',
        why: 'Google Play restricts full-screen notifications exclusively to incoming call and active alarm apps.',
        source: 'https://developer.android.com/about/versions/14/changes/full-screen-intents',
        requirement: 'Calling or alarm core app functionality justification.',
        remediation: 'Ensure app is a dialer/calling or alarm application before requesting full-screen intent.',
        evidence: {
          targetSdk,
          hasFullScreenIntent: true
        }
      }));
    }

    return { results };
  }
};

module.exports = PermissionScanner;

