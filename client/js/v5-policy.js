/* ==========================================================================
   RELEASEHUB V5 — GOOGLE PLAY POLICY PRE-AUDIT ENGINE
   A deterministic pre-submission checker that mirrors the published reasons
   Google Play blocks / rejects an app, and runs those same checks against the
   applications registered in this workspace.

   Honest scope:
     • Checks marked "Verified" use real data (registered permissions,
       declarations, keystore fingerprints, and any compiled bundle you have
       analysed through the release pipeline).
     • Checks marked "Not verified" need a compiled AAB/APK — upload one and
       run a release scan to fill them in. Nothing is fabricated.

   Additive: delete this file + its <script> to revert to the static catalog.
   ========================================================================== */
(function () {
  'use strict';

  var POLICY_VERSION = '2026.10';
  var REQUIRED_TARGET_SDK = 36;   // Android 16
  var LEGACY_TARGET_SDK = 35;     // Android 15 grace for existing updates
  var MIN_SDK_FLOOR = 23;

  /* ---- Restricted permissions that require a Play Console declaration ---- */
  var RESTRICTED = {
    'REQUEST_INSTALL_PACKAGES': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/12085295',
      why: 'Apps that request install-packages are blocked unless the core purpose is app-store / file-transfer functionality and a declaration is approved.',
      remediation: 'Remove the permission, or submit the "Request install packages" declaration in Play Console with justification.'
    },
    'QUERY_ALL_PACKAGES': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/10158779',
      why: 'Blanket package visibility is a sensitive permission; Google blocks it unless the app qualifies (antivirus, file manager, browser, etc.).',
      remediation: 'Query only the packages you need, or file the QUERY_ALL_PACKAGES declaration explaining the core use case.'
    },
    'MANAGE_EXTERNAL_STORAGE': {
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/10467955',
      why: 'All-files access is restricted to a small set of app types. Google rejects apps that use it without an approved declaration (e.g. file manager, backup, antivirus).',
      remediation: 'Migrate to scoped storage / Storage Access Framework, or submit the "All files access" declaration.'
    },
    'ACCESS_BACKGROUND_LOCATION': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/9799150',
      why: 'Background location is blocked unless the app has a core feature that cannot work without it, is prominently disclosed, and has a declaration + video.',
      remediation: 'Limit to foreground location, or complete the background-location declaration with a demo video and policy clause.'
    },
    'SCHEDULE_EXACT_ALARM': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/10962988',
      why: 'Exact alarms are reserved for alarm-clock / calendar apps; other uses risk rejection.',
      remediation: 'Use inexact alarms / WorkManager, or use USE_EXACT_ALARM only if the app is a primary alarm or calendar app.'
    },
    'USE_EXACT_ALARM': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/10962988',
      why: 'USE_EXACT_ALARM is only allowed for apps whose core function is an alarm clock or calendar.',
      remediation: 'Remove the permission or switch to SCHEDULE_EXACT_ALARM with an approved declaration.'
    },
    'USE_FULL_SCREEN_INTENT': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/13392821',
      why: 'Full-screen intents are restricted to calling and alarm apps; other uses are blocked.',
      remediation: 'Drop the permission, or request the full-screen-intent exception with a justification.'
    },
    'SYSTEM_ALERT_WINDOW': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/12085295',
      why: 'Draw-over-other-apps is high-risk and frequently abused; Google reviews it closely.',
      remediation: 'Remove overlay usage, or justify it against the permitted use cases.'
    },
    'PACKAGE_USAGE_STATS': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/10158779',
      why: 'Usage-access is a special permission that must be declared and justified.',
      remediation: 'Declare the usage (e.g. digital wellbeing) or remove the permission.'
    },
    'READ_SMS': {
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/9214102',
      why: 'SMS / Call Log permissions are restricted to the app being the default SMS or dialer handler; otherwise Google blocks the app.',
      remediation: 'Remove READ_SMS or become the default handler with a completed Permissions Declaration Form.'
    },
    'RECEIVE_SMS': {
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/9214102',
      why: 'Receiving SMS is restricted to default SMS handlers; other use is blocked.',
      remediation: 'Remove RECEIVE_SMS or complete the Permissions Declaration Form as the default SMS app.'
    },
    'READ_CALL_LOG': {
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/9214102',
      why: 'Call-log access is restricted to default dialer / call-handling apps.',
      remediation: 'Remove READ_CALL_LOG or complete the Permissions Declaration Form.'
    },
    'WRITE_CALL_LOG': {
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/9214102',
      why: 'Writing the call log is restricted to default dialer / call-handling apps.',
      remediation: 'Remove WRITE_CALL_LOG or complete the Permissions Declaration Form.'
    },
    'BODY_SENSORS': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/9888170',
      why: 'Body-sensor data is sensitive health data needing disclosure and a declaration.',
      remediation: 'Declare the health use case and complete the Data safety form.'
    },
    'ACTIVITY_RECOGNITION': {
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/9888170',
      why: 'Activity-recognition data must be declared and covered by the privacy policy.',
      remediation: 'Declare the usage in Data safety and the privacy policy.'
    },
    'READ_MEDIA_IMAGES': {
      severity: 'WARNING', url: 'https://support.google.com/googleplay/android-developer/answer/14115180',
      why: 'Broad photo/video access must be justified or replaced by the system photo picker.',
      remediation: 'Use the Photo Picker, or declare the broad media access with a justification.'
    },
    'READ_MEDIA_VIDEO': {
      severity: 'WARNING', url: 'https://support.google.com/googleplay/android-developer/answer/14115180',
      why: 'Broad video access must be justified or replaced by the system photo picker.',
      remediation: 'Use the Photo Picker, or declare the broad media access with a justification.'
    }
  };

  var SEVERITY_LABEL = { BLOCKER: 'Blocker', HIGH: 'High', WARNING: 'Warning', INFO: 'Info' };
  var STATUS_META = {
    'PASS':            { label: 'Pass',           cls: 'pol-pass' },
    'FAIL':            { label: 'Fail',           cls: 'pol-fail' },
    'WARNING':         { label: 'Warning',        cls: 'pol-warn' },
    'REVIEW_REQUIRED': { label: 'Review required',cls: 'pol-review' },
    'NOT_VERIFIED':    { label: 'Not verified',   cls: 'pol-unknown' },
    'NOT_APPLICABLE':  { label: 'Not applicable', cls: 'pol-na' },
    'ERROR':           { label: 'Error',          cls: 'pol-fail' }
  };

  /* ------------------------------- helpers -------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function shortPerm(p) {
    return String(p || '').replace(/^android\.permission\./, '').toUpperCase();
  }
  function scanFromReport(report) {
    if (!report) return null;
    var a = report.application || {};
    var sc = report.signingCertificate || {};
    return {
      targetSdk: a.targetSdk != null ? a.targetSdk : (a.target_sdk != null ? a.target_sdk : null),
      minSdk: a.minSdk != null ? a.minSdk : (a.min_sdk != null ? a.min_sdk : null),
      permissions: a.permissions || [],
      packageName: a.packageName || null,
      fileName: a.fileName || null,
      versionCode: a.versionCode || null,
      isProductionKey: sc.isProductionKey,
      signingSha256: sc.sha256 || null,
      page16Kb: report.page16KbAlignment || report.page16Kb || null,
      page: report.page || null,
      runtimeTests: report.runtimeTests || null,
      evidenceList: report.evidenceList || null
    };
  }
  function buildContext(app, dec, scan) {
    var perms = new Set();
    var ap = (app.permissions && app.permissions.approved) || [];
    ap.forEach(function (p) { perms.add(shortPerm(p)); });
    var sp = (scan && scan.permissions) || [];
    sp.forEach(function (p) { perms.add(shortPerm(p)); });
    var prohibited = new Set();
    ((app.permissions && app.permissions.prohibited) || []).forEach(function (p) { prohibited.add(shortPerm(p)); });
    return {
      app: app,
      dec: dec || null,
      scan: scan || null,
      perms: perms,
      prohibited: prohibited,
      signing: app.signing || {},
      minSdk: (app.android && app.android.minSdk) != null ? app.android.minSdk
            : (scan && scan.minSdk != null ? scan.minSdk : null),
      privacyUrl: (dec && dec.privacy_policy_url) || (app.privacy && app.privacy.policyUrl) || null,
      isMonitoring: app.moduleType === 'ENTERPRISE_MONITORING'
    };
  }

  /* ------------------------------- checks --------------------------------- */
  // Each check: { id, category, title, severity, url, why, requirement, remediation, test(ctx) }
  var STATIC_CHECKS = [
    {
      id: 'ANDROID-TARGET', category: 'Target API level',
      title: 'Targets required API level (Android 16 / API 36)',
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/11926878',
      why: 'Google Play blocks new apps and updates that target an API level below the annual requirement, to force security and privacy fixes.',
      requirement: 'targetSdkVersion >= 36 for new apps and updates.',
      remediation: 'Raise compileSdk/targetSdk to 36, retest, and re-upload the bundle.',
      test: function (c) {
        if (!c.scan || c.scan.targetSdk == null) return nv('No compiled bundle has been analysed. Upload an AAB/APK and run a release scan to read targetSdkVersion.');
        var t = c.scan.targetSdk;
        if (t >= REQUIRED_TARGET_SDK) return ok('Targets API ' + t + '.', { targetSdk: t });
        if (t === LEGACY_TARGET_SDK) return { status: 'WARNING', detail: 'Targets API 35 (Android 15). Existing updates are in a grace window; new apps are already blocked.', evidence: { targetSdk: t } };
        return fail('Targets API ' + t + ', below the required API ' + REQUIRED_TARGET_SDK + '. Google Play will reject the upload.', { targetSdk: t });
      }
    },
    {
      id: 'ANDROID-16KB', category: 'Native libraries',
      title: '16 KB memory-page alignment',
      severity: 'BLOCKER', url: 'https://developer.android.com/guide/practices/page-sizes',
      why: 'Since 1 Nov 2025 Google Play rejects uploads whose 64-bit native libraries are not aligned to 16 KB pages — they crash on 16 KB devices.',
      requirement: 'Every arm64-v8a / x86_64 .so LOAD segment must have p_align >= 0x4000.',
      remediation: 'Rebuild with a 16 KB-aligned NDK/toolchain (AGP 8.5.1+, NDK r28+) and re-check each .so.',
      test: function (c) {
        var p = c.scan && c.scan.page16Kb;
        if (!p) return nv('Not verified — needs the compiled 64-bit native libraries from a bundle scan.');
        var libs = p.libraries || p.libs || [];
        var bad = p.nonAligned || p.unaligned || libs.filter(function (l) { return l && (l.aligned === false || l.pageAligned === false); });
        if (bad && bad.length) return fail(bad.length + ' native library(ies) are not 16 KB aligned.', { nonAligned: bad });
        if (p.allAligned === true || (libs.length && !(bad && bad.length))) return ok('All analysed native libraries are 16 KB aligned.', { libraries: libs.length });
        return nv('Page-alignment result was inconclusive in the last scan.');
      }
    },
    {
      id: 'ANDROID-ABI64', category: 'Native libraries',
      title: '64-bit ABI support',
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/9363762',
      why: 'Google Play requires 64-bit native libraries; 32-bit-only uploads are blocked.',
      requirement: 'Any app with native code must ship arm64-v8a (and/or x86_64).',
      remediation: 'Add the 64-bit ABI to your build output.',
      test: function (c) {
        var abis = c.scan && (c.scan.abis || (c.scan.page16Kb && c.scan.page16Kb.abis));
        if (!abis || !abis.length) return nv('Not verified — needs a bundle scan that lists native ABIs.');
        var has64 = abis.some(function (a) { return /64/.test(a); });
        if (has64) return ok('64-bit ABI present (' + abis.join(', ') + ').', { abis: abis });
        return fail('Only 32-bit ABIs found (' + abis.join(', ') + '). Google Play will reject the upload.', { abis: abis });
      }
    },
    {
      id: 'ANDROID-SIGNING-DEBUG', category: 'App signing',
      title: 'Signed with a release (non-debug) key',
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/9842756',
      why: 'Google Play rejects uploads signed with the shared Android debug certificate — they cannot be distributed.',
      requirement: 'The bundle must be signed with a release/upload key, not the debug keystore.',
      remediation: 'Sign the release build with your upload key (or enrol in Play App Signing).',
      test: function (c) {
        if (c.scan && c.scan.isProductionKey === false) return fail('The analysed bundle is signed with a debug key.', { isProductionKey: false });
        if (c.scan && c.scan.isProductionKey === true) return ok('Signed with a production/upload key.', { isProductionKey: true });
        if (c.signing && c.signing.sha256 && c.signing.sha256.length) return ok('Registered release keystore fingerprint on file.', { sha256: c.signing.sha256.length });
        return nv('No signing evidence. Register a keystore fingerprint or upload a bundle to verify.');
      }
    },
    {
      id: 'ANDROID-DEBUGGABLE', category: 'App security',
      title: 'Debuggable flag disabled',
      severity: 'BLOCKER', url: 'https://developer.android.com/studio/debug',
      why: 'A debuggable release exposes app data and is rejected by Play.',
      requirement: 'android:debuggable must be false in the release manifest.',
      remediation: 'Build a release variant (debuggable=false) for submission.',
      test: function (c) {
        if (!c.scan || c.scan.debuggable == null) return nv('Not verified — needs a manifest from a bundle scan.');
        if (c.scan.debuggable) return fail('The release manifest is debuggable.', { debuggable: true });
        return ok('Release manifest is not debuggable.', { debuggable: false });
      }
    },
    {
      id: 'ANDROID-CLEARTEXT', category: 'App security',
      title: 'Cleartext (HTTP) traffic policy',
      severity: 'WARNING', url: 'https://developer.android.com/privacy-and-security/security-config',
      why: 'Apps that transmit cleartext traffic are reviewed for insecure data handling and may be blocked.',
      requirement: 'Do not use android:usesCleartextTraffic="true" in production.',
      remediation: 'Enforce HTTPS and remove the cleartext override.',
      test: function (c) {
        if (!c.scan || c.scan.cleartext == null) return nv('Not verified — needs a manifest from a bundle scan.');
        if (c.scan.cleartext) return { status: 'WARNING', detail: 'Cleartext traffic is enabled.', evidence: { cleartext: true } };
        return ok('Cleartext traffic is disabled.', { cleartext: false });
      }
    },
    {
      id: 'ANDROID-DEOBF', category: 'App security',
      title: 'Deobfuscation file uploaded',
      severity: 'WARNING', url: 'https://support.google.com/googleplay/android-developer/answer/9848633',
      why: 'Without a mapping file, crash reports are unreadable and reviews can be delayed (not a hard block, but a common rejection-adjacent issue).',
      requirement: 'Upload mapping.txt (or R8/ProGuard file) alongside the release.',
      remediation: 'Enable minification and upload the deobfuscation file to Play Console.',
      test: function (c) {
        if (!c.scan || c.scan.hasDeobf == null) return nv('Not verified — needs a bundle scan that reports the mapping file.');
        if (c.scan.hasDeobf) return ok('Deobfuscation file present.', {});
        return { status: 'WARNING', detail: 'No deobfuscation file detected.', evidence: {} };
      }
    },
    {
      id: 'PERM-PROHIBITED', category: 'Permissions',
      title: 'No prohibited permission requested',
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/9214102',
      why: 'Requesting a permission the app is not eligible for is one of the most common reasons Google Play blocks or removes an app.',
      requirement: 'The app must not declare permissions it is ineligible to use.',
      remediation: 'Remove the prohibited permission(s) from the manifest.',
      test: function (c) {
        var hits = [];
        c.perms.forEach(function (p) { if (c.prohibited.has(p)) hits.push(p); });
        if (hits.length) return fail('Declares registry-prohibited permission(s): ' + hits.join(', ') + '.', { prohibited: hits });
        return ok('No prohibited permissions declared.', { prohibited: [] });
      }
    },
    {
      id: 'PRIVACY-POLICY', category: 'Policy & declarations',
      title: 'Privacy policy URL published',
      severity: 'BLOCKER', url: 'https://support.google.com/googleplay/android-developer/answer/9859455',
      why: 'Every app that handles personal or sensitive data must publish a privacy policy; a missing policy blocks the listing.',
      requirement: 'A reachable privacy policy URL in the store listing and inside the app.',
      remediation: 'Publish a privacy policy covering all collected data and provide the URL in Play Console.',
      test: function (c) {
        if (c.privacyUrl) return ok('Privacy policy on file: ' + c.privacyUrl, { url: c.privacyUrl });
        return fail('No privacy policy URL is registered for this app.', {});
      }
    },
    {
      id: 'POLICY-CONFIRMED', category: 'Policy & declarations',
      title: 'Developer Program Policies declared',
      severity: 'BLOCKER', url: 'https://play.google.com/about/developer-content-policy/',
      why: 'Google Play blocks publishing until you confirm the app complies with the Developer Program Policies.',
      requirement: 'The "I confirm compliance with the Developer Program Policies" declaration must be accepted.',
      remediation: 'Complete the App content declarations in Play Console.',
      test: function (c) {
        if (!c.dec) return nv('Open this app to load its saved declarations.');
        if (Number(c.dec.policy_confirmed) === 1) return ok('Developer Program Policies confirmed.', { policy_confirmed: 1 });
        return fail('Developer Program Policies have not been confirmed.', { policy_confirmed: 0 });
      }
    },
    {
      id: 'EXPORT-LAWS', category: 'Policy & declarations',
      title: 'US export laws acknowledged',
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/113770',
      why: 'Google Play requires an export-compliance acknowledgement for every app; it blocks the release otherwise.',
      requirement: 'The US Export Laws declaration must be accepted.',
      remediation: 'Accept the export declaration in Play Console.',
      test: function (c) {
        if (!c.dec) return nv('Open this app to load its saved declarations.');
        if (Number(c.dec.export_laws_accepted) === 1) return ok('Export laws acknowledged.', { export_laws_accepted: 1 });
        return fail('Export laws have not been acknowledged.', { export_laws_accepted: 0 });
      }
    },
    {
      id: 'CONTENT-RATING', category: 'Policy & declarations',
      title: 'Content rating questionnaire completed',
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/9898842',
      why: 'An app without a completed content-rating questionnaire cannot be published.',
      requirement: 'A content-rating category from the IARC questionnaire.',
      remediation: 'Complete the content-rating questionnaire in Play Console.',
      test: function (c) {
        if (!c.dec) return nv('Open this app to load its saved declarations.');
        if (c.dec.content_rating_category) return ok('Rated: ' + c.dec.content_rating_category, { rating: c.dec.content_rating_category });
        return fail('No content rating recorded.', {});
      }
    },
    {
      id: 'ADS-DECLARATION', category: 'Policy & declarations',
      title: 'Ads declaration completed',
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/9859455',
      why: 'Google Play blocks publishing until you declare whether the app contains ads.',
      requirement: 'The "Contains ads" declaration must be set.',
      remediation: 'Set the ads declaration in Play Console.',
      test: function (c) {
        if (!c.dec) return nv('Open this app to load its saved declarations.');
        if (c.dec.contains_ads === 0 || c.dec.contains_ads === 1 || c.dec.contains_ads === '0' || c.dec.contains_ads === '1') {
          return ok('Ads declared: ' + (Number(c.dec.contains_ads) ? 'contains ads' : 'no ads') + '.', { contains_ads: c.dec.contains_ads });
        }
        return fail('Ads declaration is missing.', {});
      }
    },
    {
      id: 'APP-ACCESS', category: 'Policy & declarations',
      title: 'App access instructions provided',
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/9859455',
      why: 'If any feature is behind a login, Google Play needs test credentials; missing them blocks the review.',
      requirement: 'Provide app-access (login) instructions, or declare the app is fully accessible.',
      remediation: 'Add reviewer credentials in the App access section of Play Console.',
      test: function (c) {
        if (!c.dec) return nv('Open this app to load its saved declarations.');
        var restricted = Number(c.dec.app_access_restricted);
        var hasDetails = !!c.dec.sign_in_details && c.dec.sign_in_details !== '[]';
        if (restricted === 0 || hasDetails) return ok('App access instructions on file.', { app_access_restricted: restricted });
        return { status: 'REVIEW_REQUIRED', detail: 'App is marked access-restricted but no reviewer credentials were found.', evidence: {} };
      }
    },
    {
      id: 'DATA-SAFETY', category: 'Policy & declarations',
      title: 'Data safety form completed',
      severity: 'WARNING', url: 'https://support.google.com/googleplay/android-developer/answer/10787469',
      why: 'The Data safety form is mandatory; an incomplete form blocks rollout and mismatches can trigger removal.',
      requirement: 'Data safety must be completed accurately for every data type collected.',
      remediation: 'Complete Data safety in Play Console and keep it aligned with the privacy policy.',
      test: function (c) {
        if (!c.dec) return nv('Open this app to load its saved declarations.');
        return { status: 'REVIEW_REQUIRED', detail: 'Confirm the Data safety form matches the permissions actually used (camera, location, audio).', evidence: {} };
      }
    },
    {
      id: 'MONITORING-TOOL', category: 'Policy & declarations',
      title: 'Monitoring-tool disclosure',
      severity: 'WARNING', url: 'https://support.google.com/googleplay/android-developer/answer/9888170',
      why: 'Apps that monitor a device/user must disclose it and cannot be used for covert tracking; Google blocks stalkerware.',
      requirement: 'Declare whether the app is a monitoring/enterprise tool and disclose it prominently.',
      remediation: 'Mark the app as a monitoring tool and add a clear in-app disclosure + consent.',
      test: function (c) {
        if (!c.isMonitoring) return { status: 'NOT_APPLICABLE', detail: 'Not an enterprise-monitoring app.', evidence: {} };
        return { status: 'REVIEW_REQUIRED', detail: 'Enterprise-monitoring app — ensure the monitoring disclosure and consent are published.', evidence: {} };
      }
    },
    {
      id: 'MIN-SDK', category: 'Target API level',
      title: 'Minimum SDK within supported range',
      severity: 'WARNING', url: 'https://developer.android.com/google/play/requirements/target-sdk',
      why: 'Very old minimum SDKs pull in unsupported platform behaviour and security gaps that Play flags.',
      requirement: 'minSdkVersion >= ' + MIN_SDK_FLOOR + '.',
      remediation: 'Raise minSdkVersion to a currently supported level.',
      test: function (c) {
        if (c.minSdk == null) return nv('Minimum SDK not available.');
        if (c.minSdk >= MIN_SDK_FLOOR) return ok('Minimum SDK ' + c.minSdk + '.', { minSdk: c.minSdk });
        return { status: 'WARNING', detail: 'Minimum SDK ' + c.minSdk + ' is below the recommended floor of ' + MIN_SDK_FLOOR + '.', evidence: { minSdk: c.minSdk } };
      }
    },
    {
      id: 'FGS-TYPES', category: 'App security',
      title: 'Foreground-service types declared',
      severity: 'HIGH', url: 'https://support.google.com/googleplay/android-developer/answer/13392821',
      why: 'Since API 34 every foreground service must declare an approved type; missing types crash the app and fail Play review.',
      requirement: 'Every <service android:foregroundServiceType="..."> must use a permitted type.',
      remediation: 'Declare a valid foregroundServiceType and the matching permission for each service.',
      test: function (c) {
        if (c.scan && c.scan.fgsTypes) {
          var bad = (c.scan.fgsTypes.missing || []);
          if (bad.length) return fail('Foreground services missing a type: ' + bad.join(', '), { missing: bad });
          return ok('All foreground services declare a type.', {});
        }
        if (c.perms.has('FOREGROUND_SERVICE')) return { status: 'REVIEW_REQUIRED', detail: 'App declares a foreground service — confirm each service sets an approved foregroundServiceType.', evidence: {} };
        return { status: 'NOT_APPLICABLE', detail: 'No foreground services declared.', evidence: {} };
      }
    },
    {
      id: 'EXPORTED-COMPONENTS', category: 'App security',
      title: 'Exported components protected',
      severity: 'HIGH', url: 'https://developer.android.com/guide/topics/manifest/activity-element',
      why: 'Unprotected exported activities/receivers are a security hole and a common Play data-safety flag.',
      requirement: 'Exported components must be protected or set android:exported="false".',
      remediation: 'Add the correct android:exported flag / permissions to each component.',
      test: function (c) {
        if (!c.scan || !c.scan.exportedComponents) return nv('Not verified — needs a manifest from a bundle scan.');
        var bad = c.scan.exportedComponents.unprotected || [];
        if (bad.length) return { status: 'WARNING', detail: bad.length + ' exported component(s) without protection: ' + bad.join(', '), evidence: { unprotected: bad } };
        return ok('Exported components look protected.', {});
      }
    },
    {
      id: 'STORE-LISTING', category: 'Store presence',
      title: 'Store listing completeness',
      severity: 'WARNING', url: 'https://support.google.com/googleplay/android-developer/answer/9859152',
      why: 'An incomplete store listing (missing icon, screenshots, description) blocks publication.',
      requirement: 'App name, icon, feature graphic, screenshots, and description all present.',
      remediation: 'Fill every required store-listing field in Play Console.',
      test: function () {
        return nv('Not verifiable locally — confirm store listing assets in Play Console.');
      }
    }
  ];

  function ok(detail, evidence) { return { status: 'PASS', detail: detail, evidence: evidence || {} }; }
  function fail(detail, evidence) { return { status: 'FAIL', detail: detail, evidence: evidence || {} }; }
  function nv(detail) { return { status: 'NOT_VERIFIED', detail: detail, evidence: {} }; }

  function buildPermissionChecks(ctx) {
    var present = [];
    ctx.perms.forEach(function (p) { if (RESTRICTED[p]) present.push(p); });
    if (!present.length) {
      return [{
        id: 'PERM-RESTRICTED', category: 'Permissions',
        title: 'No declaration-gated permissions used',
        severity: 'INFO', url: 'https://support.google.com/googleplay/android-developer/answer/9888170',
        why: 'Certain permissions require an approved Play Console declaration before Google Play stops blocking the app.',
        requirement: 'Only request permissions the app is eligible for, and declare the gated ones.',
        remediation: 'None — no gated permissions are used.',
        test: function () { return ok('No restricted permissions declared.', {}); }
      }];
    }
    return present.map(function (p) {
      var meta = RESTRICTED[p];
      return {
        id: 'PERM-' + p, category: 'Permissions',
        title: 'Declaration required: ' + p,
        severity: meta.severity, url: meta.url,
        why: meta.why, requirement: 'Approved declaration for ' + p + '.', remediation: meta.remediation,
        test: function () {
          return { status: 'REVIEW_REQUIRED', detail: p + ' is declared. Google Play blocks the release until the matching declaration is approved.', evidence: { permission: p, severity: meta.severity } };
        }
      };
    });
  }

  function runCheck(chk, ctx) {
    var res;
    try { res = chk.test(ctx) || {}; }
    catch (e) { res = { status: 'ERROR', detail: e && e.message ? e.message : String(e) }; }
    return {
      id: chk.id, category: chk.category, title: chk.title,
      severity: res.severity || chk.severity || 'WARNING',
      url: chk.url, why: chk.why, requirement: chk.requirement, remediation: chk.remediation,
      status: res.status || 'NOT_VERIFIED', detail: res.detail || '', evidence: res.evidence || {}
    };
  }

  function evaluateApp(app, dec, scan) {
    var ctx = buildContext(app, dec, scan);
    var items = [];
    STATIC_CHECKS.forEach(function (chk) { items.push(runCheck(chk, ctx)); });
    buildPermissionChecks(ctx).forEach(function (chk) { items.push(runCheck(chk, ctx)); });

    var counts = { blockers: 0, review: 0, warnings: 0, passed: 0, notVerified: 0, total: items.length };
    var blocked = false, reviewNeeded = false;
    items.forEach(function (it) {
      if (it.status === 'FAIL' && it.severity === 'BLOCKER') { counts.blockers++; blocked = true; }
      else if (it.status === 'FAIL') { counts.review++; reviewNeeded = true; }
      else if (it.status === 'REVIEW_REQUIRED') { counts.review++; reviewNeeded = true; }
      else if (it.status === 'WARNING') { counts.warnings++; reviewNeeded = true; }
      else if (it.status === 'PASS') { counts.passed++; }
      else if (it.status === 'NOT_VERIFIED') { counts.notVerified++; }
    });
    var verdict = blocked ? 'BLOCKED' : (reviewNeeded ? 'REVIEW_REQUIRED' : (counts.notVerified === counts.total ? 'INCONCLUSIVE' : 'READY'));
    return { app: app, ctx: ctx, items: items, counts: counts, verdict: verdict };
  }

  /* ------------------------------- rendering ------------------------------ */
  var state = { apps: [], declarations: {}, scan: null, selected: null, view: 'app' };
  var VERDICT_META = {
    'BLOCKED':         { label: 'Blocked', cls: 'pol-verdict-blocked' },
    'REVIEW_REQUIRED': { label: 'Review required', cls: 'pol-verdict-review' },
    'READY':           { label: 'Ready', cls: 'pol-verdict-ready' },
    'INCONCLUSIVE':    { label: 'Inconclusive', cls: 'pol-verdict-unknown' }
  };

  function root() { return document.getElementById('policy-status-root'); }

  function renderShell() {
    var r = root();
    if (!r) return;
    r.innerHTML =
      '<div class="pol-topbar">' +
        '<div class="pol-topbar-text">' +
          '<h2>Policy status</h2>' +
          '<p>Internal pre-submission audit · mirrors the published reasons Google Play blocks an app, run against your registered applications. ' +
          'This is not Google\'s official evaluation and does not replace Play Console.</p>' +
        '</div>' +
        '<span class="pol-version">Policy set ' + POLICY_VERSION + '</span>' +
      '</div>' +
      '<div class="pol-toolbar">' +
        '<label class="pol-field"><span>Application</span>' +
          '<select id="pol-app-select"></select></label>' +
        '<button class="pol-btn pol-btn-primary" id="pol-run">Run checks</button>' +
        '<button class="pol-btn" id="pol-run-all">Check all apps</button>' +
      '</div>' +
      '<div id="pol-summary"></div>' +
      '<div id="pol-body"></div>';
  }

  function fillSelect() {
    var sel = document.getElementById('pol-app-select');
    if (!sel) return;
    sel.innerHTML = state.apps.map(function (a) {
      return '<option value="' + esc(a.appId) + '">' + esc(a.name) + ' — ' + esc(a.packageName || '') + '</option>';
    }).join('');
  }

  function summaryHtml(result) {
    var vm = VERDICT_META[result.verdict] || VERDICT_META['INCONCLUSIVE'];
    var c = result.counts;
    function stat(n, label, cls) { return '<div class="pol-stat ' + cls + '"><span class="pol-stat-num">' + n + '</span><span class="pol-stat-lbl">' + label + '</span></div>'; }
    return '<div class="pol-summary-card">' +
      '<div class="pol-verdict ' + vm.cls + '">' + vm.label + '</div>' +
      '<div class="pol-stats">' +
        stat(c.blockers, 'Blockers', 'is-blocker') +
        stat(c.review, 'Review', 'is-review') +
        stat(c.warnings, 'Warnings', 'is-warn') +
        stat(c.passed, 'Passed', 'is-pass') +
        stat(c.notVerified, 'Not verified', 'is-unknown') +
      '</div>' +
      '<div class="pol-scan-note">' + (state.scan
        ? 'Binary evidence loaded from the latest release scan.'
        : 'No binary analysed — upload an AAB/APK in the release pipeline to verify the native and manifest checks.') + '</div>' +
    '</div>';
  }

  function checksTableHtml(result) {
    var rows = result.items.map(function (it, i) {
      var sm = STATUS_META[it.status] || STATUS_META['NOT_VERIFIED'];
      var sevCls = it.severity === 'BLOCKER' ? 'pol-sev-blocker' : (it.severity === 'HIGH' ? 'pol-sev-high' : 'pol-sev-warn');
      return '<tr class="pol-row" data-idx="' + i + '" tabindex="0" role="button" aria-expanded="false">' +
          '<td class="pol-c-check"><span class="pol-chk-title">' + esc(it.title) + '</span><span class="pol-chk-cat">' + esc(it.category) + '</span></td>' +
          '<td class="pol-c-status"><span class="pol-badge ' + sm.cls + '">' + sm.label + '</span></td>' +
          '<td class="pol-c-sev"><span class="pol-sev ' + sevCls + '">' + (SEVERITY_LABEL[it.severity] || it.severity) + '</span></td>' +
          '<td class="pol-c-why">' + esc(it.why) + '</td>' +
          '<td class="pol-c-action">' + esc(it.remediation || '') + '</td>' +
        '</tr>' +
        '<tr class="pol-detail" data-detail="' + i + '" hidden><td colspan="5">' +
          '<div class="pol-detail-grid">' +
            '<div><span class="pol-detail-k">Result</span><p>' + esc(it.detail) + '</p></div>' +
            '<div><span class="pol-detail-k">Requirement</span><p>' + esc(it.requirement) + '</p></div>' +
            (it.evidence && Object.keys(it.evidence).length ? '<div><span class="pol-detail-k">Evidence</span><pre>' + esc(JSON.stringify(it.evidence, null, 2)) + '</pre></div>' : '') +
            (it.url ? '<div><span class="pol-detail-k">Google reference</span><p><a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.url) + '</a></p></div>' : '') +
          '</div>' +
        '</td></tr>';
    }).join('');
    return '<div class="pol-table-wrap"><table class="pol-table"><thead><tr>' +
        '<th>Requirement</th><th>Status</th><th>Severity</th><th>Why Google Play blocks it</th><th>How to fix</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderApp(appId) {
    var app = state.apps.filter(function (a) { return a.appId === appId; })[0];
    if (!app) return;
    state.selected = appId;
    var dec = state.declarations[appId] || null;
    var scan = state.scan && state.scan.packageName &&
      (state.scan.packageName === app.packageName || state.scan.packageName === app.appId) ? state.scan : null;
    var result = evaluateApp(app, dec, scan);
    var body = document.getElementById('pol-body');
    var summary = document.getElementById('pol-summary');
    if (summary) summary.innerHTML = summaryHtml(result);
    if (body) body.innerHTML = checksTableHtml(result);
    bindRows();
  }

  function renderAll() {
    var rows = state.apps.map(function (app) {
      var dec = state.declarations[app.appId] || null;
      var scan = state.scan && state.scan.packageName && (state.scan.packageName === app.packageName || state.scan.packageName === app.appId) ? state.scan : null;
      var r = evaluateApp(app, dec, scan);
      var vm = VERDICT_META[r.verdict] || VERDICT_META['INCONCLUSIVE'];
      return '<tr class="pol-row" data-app="' + esc(app.appId) + '" tabindex="0" role="button">' +
          '<td><span class="pol-chk-title">' + esc(app.name) + '</span><span class="pol-chk-cat">' + esc(app.packageName || '') + '</span></td>' +
          '<td><span class="pol-badge ' + vm.cls + '">' + vm.label + '</span></td>' +
          '<td><span class="pol-sev ' + (r.counts.blockers ? 'pol-sev-blocker' : 'pol-sev-warn') + '">' + r.counts.blockers + '</span></td>' +
          '<td>' + r.counts.review + '</td>' +
          '<td>' + r.counts.passed + '</td>' +
          '<td>' + r.counts.notVerified + '</td>' +
        '</tr>';
    }).join('');
    var summary = document.getElementById('pol-summary');
    var body = document.getElementById('pol-body');
    if (summary) summary.innerHTML = '';
    if (body) body.innerHTML =
      '<div class="pol-table-wrap"><table class="pol-table"><thead><tr>' +
        '<th>Application</th><th>Verdict</th><th>Blockers</th><th>Review</th><th>Passed</th><th>Not verified</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="pol-hint">Select a row to open its full requirement-by-requirement report.</p></div>';
    Array.prototype.forEach.call(document.querySelectorAll('#pol-body .pol-row[data-app]'), function (tr) {
      function open() {
        var sel = document.getElementById('pol-app-select');
        if (sel) sel.value = tr.getAttribute('data-app');
        renderApp(tr.getAttribute('data-app'));
      }
      tr.addEventListener('click', open);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  function bindRows() {
    Array.prototype.forEach.call(document.querySelectorAll('#pol-body .pol-row[data-idx]'), function (tr) {
      function toggle() {
        var idx = tr.getAttribute('data-idx');
        var detail = document.querySelector('#pol-body .pol-detail[data-detail="' + idx + '"]');
        if (!detail) return;
        var open = detail.hasAttribute('hidden');
        if (open) detail.removeAttribute('hidden'); else detail.setAttribute('hidden', '');
        tr.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      tr.addEventListener('click', toggle);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  /* ------------------------------- data flow ------------------------------ */
  function detectScan() {
    try {
      var rep = window.PlayStoreAuditor && window.PlayStoreAuditor.currentReport;
      return scanFromReport(rep);
    } catch (e) { return null; }
  }

  async function loadDeclarations(appId) {
    if (state.declarations[appId] !== undefined) return state.declarations[appId];
    try {
      var res = await API.getPlayStoreDeclarations(appId);
      state.declarations[appId] = (res && res.data) ? res.data : null;
    } catch (e) { state.declarations[appId] = null; }
    return state.declarations[appId];
  }

  async function runSelected() {
    var sel = document.getElementById('pol-app-select');
    var appId = sel ? sel.value : state.selected;
    state.scan = detectScan();
    var body = document.getElementById('pol-body');
    if (body) body.innerHTML = '<p class="pol-hint">Running checks…</p>';
    await loadDeclarations(appId);
    renderApp(appId);
  }

  async function runAll() {
    state.scan = detectScan();
    var body = document.getElementById('pol-body');
    if (body) body.innerHTML = '<p class="pol-hint">Checking all applications…</p>';
    await Promise.all(state.apps.map(function (a) { return loadDeclarations(a.appId); }));
    renderAll();
  }

  async function init() {
    if (!root()) return;
    renderShell();
    try {
      var res = await API.getAppRegistry();
      state.apps = (res && res.data) ? res.data : [];
    } catch (e) { state.apps = []; }
    if (!state.apps.length) {
      var body = document.getElementById('pol-body');
      if (body) body.innerHTML = '<p class="pol-hint">No applications are registered yet.</p>';
      return;
    }
    fillSelect();
    state.scan = detectScan();
    var first = state.apps[0].appId;
    await loadDeclarations(first);
    renderApp(first);

    var runBtn = document.getElementById('pol-run');
    var allBtn = document.getElementById('pol-run-all');
    var sel = document.getElementById('pol-app-select');
    if (runBtn) runBtn.addEventListener('click', runSelected);
    if (allBtn) allBtn.addEventListener('click', runAll);
    if (sel) sel.addEventListener('change', function () { runSelected(); });
  }

  window.PolicyStatus = { init: init, evaluateApp: evaluateApp, RESTRICTED: RESTRICTED, reload: runSelected };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
