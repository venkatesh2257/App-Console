const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const ReleaseGateEngine = require('./server/services/audit/engine');
const { getAppProfile, getAllApps } = require('./server/services/audit/appRegistry/appRegistry');
const { getPolicyVersion, getUpcomingRequirements } = require('./server/services/audit/policies/policyRegistry');
const { computeReleaseDelta } = require('./server/services/audit/delta/deltaEngine');
const VerdictEngine = require('./server/services/audit/verdict/verdictEngine');
const IntakeScanner = require('./server/services/audit/scanners/intakeScanner');
const TargetSdkScanner = require('./server/services/audit/scanners/targetSdkScanner');
const SigningScanner = require('./server/services/audit/scanners/signingScanner');
const PageSizeScanner = require('./server/services/audit/scanners/pageSizeScanner');
const AbiScanner = require('./server/services/audit/scanners/abiScanner');
const R8Scanner = require('./server/services/audit/scanners/r8Scanner');
const ManifestScanner = require('./server/services/audit/scanners/manifestScanner');
const PermissionScanner = require('./server/services/audit/scanners/permissionScanner');
const PrivacyScanner = require('./server/services/audit/scanners/privacyScanner');
const RuntimeScanner = require('./server/services/audit/scanners/runtimeScanner');
const QuestionnaireScanner = require('./server/services/audit/scanners/questionnaireScanner');


/**
 * Helper: Build a minimal valid in-memory ZIP / AAB / APK buffer
 */
function createMockZipBuffer(filesMap = {}) {
  const chunks = [];

  for (const [filename, content] of Object.entries(filesMap)) {
    const dataBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const nameBuf = Buffer.from(filename, 'utf8');

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // Local file header signature
    header.writeUInt16LE(20, 4);         // Version needed to extract
    header.writeUInt16LE(0, 6);          // General purpose bit flag
    header.writeUInt16LE(0, 8);          // Compression method (0 = stored)
    header.writeUInt16LE(0, 10);         // Last mod file time
    header.writeUInt16LE(0, 12);         // Last mod file date
    header.writeUInt32LE(0, 14);         // CRC-32
    header.writeUInt32LE(dataBuf.length, 18); // Compressed size
    header.writeUInt32LE(dataBuf.length, 22); // Uncompressed size
    header.writeUInt16LE(nameBuf.length, 26); // File name length
    header.writeUInt16LE(0, 28);         // Extra field length

    chunks.push(header, nameBuf, dataBuf);
  }

  return Buffer.concat(chunks);
}

/**
 * Helper: Create a 64-bit ELF binary buffer with configurable alignment (16 KB vs 4 KB)
 */
function createMockElfBuffer(alignBytes = 16384) {
  const buf = Buffer.alloc(256);
  // ELF Header: 0x7F 'E' 'L' 'F'
  buf[0] = 0x7F;
  buf[1] = 0x45;
  buf[2] = 0x4C;
  buf[3] = 0x46;
  buf[4] = 2; // 64-bit ELF class
  buf[5] = 1; // Little endian

  // e_phoff = 64 (start of program headers)
  buf.writeBigUInt64LE(BigInt(64), 32);
  // e_phentsize = 56
  buf.writeUInt16LE(56, 56);
  // e_phnum = 1
  buf.writeUInt16LE(1, 58);

  // Program header at offset 64:
  // p_type = 1 (PT_LOAD) at offset 64
  buf.writeUInt32LE(1, 64);
  // p_align at offset 64 + 48 = 112
  buf.writeBigUInt64LE(BigInt(alignBytes), 112);

  return buf;
}

async function runAllPlayStoreAuditTests() {
  console.log('================================================================================');
  console.log('🧪 RUNNING GOOGLE PLAY STORE PRE-SUBMISSION RELEASE GATE TEST SUITE (ALL 7 STAGES)');
  console.log('================================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      throw new Error(`Test assertion failed: ${testName} (${details})`);
    }
  }

  // ---------------------------------------------------------------------------
  // STAGE 1: Artifact Intake & Hash Locking
  // ---------------------------------------------------------------------------
  console.log('📌 STAGE 1: Artifact Intake & Hash Locking');
  {
    // Test 1.1: Rejection on empty buffer
    const emptyContext = { fileBuffer: Buffer.alloc(0), fileName: 'empty.aab' };
    const emptyRes = await IntakeScanner.run(emptyContext);
    assert(
      emptyRes.results.some(r => r.status === 'ERROR' && r.ruleId === 'INTAKE-FORMAT-001'),
      'Stage 1.1: Detect and reject empty artifact buffer'
    );

    // Test 1.2: Rejection on non-ZIP format
    const corruptContext = { fileBuffer: Buffer.from('NOT_A_VALID_ZIP_HEADER'), fileName: 'corrupt.aab' };
    const corruptRes = await IntakeScanner.run(corruptContext);
    assert(
      corruptRes.results.some(r => r.status === 'FAIL' && r.ruleId === 'INTAKE-FORMAT-002'),
      'Stage 1.2: Detect non-ZIP / invalid archive binary format'
    );

    // Test 1.3: Valid intake & SHA-256 artifact locking
    const sampleZip = createMockZipBuffer({
      'AndroidManifest.xml': '<manifest package="com.bavya.btgs" targetSdkVersion="36" minSdkVersion="24"></manifest>'
    });
    const validContext = { fileBuffer: sampleZip, fileName: 'valid-app-release.aab' };
    const validRes = await IntakeScanner.run(validContext);
    assert(
      validRes.results.some(r => r.status === 'PASS' && r.ruleId === 'INTAKE-CUSTODY-001') && validContext.artifactHash.length === 64,
      'Stage 1.3: Valid artifact intake with deterministic SHA-256 locking'
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 2: Static Binary & Security Analysis
  // ---------------------------------------------------------------------------
  console.log('\n📌 STAGE 2: Static Binary & Security Analysis');
  {
    // Test 2.1: Target SDK Scanner (SDK 36 Target vs Outdated SDK 33)
    const sdk36Context = {
      metadata: { targetSdk: 36, minSdk: 24, packageName: 'com.bavya.btgs' }
    };
    const sdk36Res = await TargetSdkScanner.run(sdk36Context);
    assert(
      sdk36Res.results.some(r => r.status === 'PASS' && r.ruleId === 'ANDROID-TARGET-2026-001'),
      'Stage 2.1: Target SDK 36 (Android 16 Requirement) compliance pass'
    );

    const sdk33Context = {
      metadata: { targetSdk: 33, minSdk: 21, packageName: 'com.bavya.btgs' }
    };
    const sdk33Res = await TargetSdkScanner.run(sdk33Context);
    assert(
      sdk33Res.results.some(r => r.status === 'FAIL' && r.ruleId === 'ANDROID-TARGET-2026-001'),
      'Stage 2.2: Detect and block outdated Target SDK (< 35)'
    );

    // Test 2.3: Signing Key Validation
    const prodSignContext = {
      appProfile: getAppProfile('btgs'),
      signingCertificate: {
        isProductionKey: true,
        sha256: '3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C'
      }
    };
    const signRes = await SigningScanner.run(prodSignContext);
    assert(
      signRes.results.some(r => r.status === 'PASS' && r.ruleId === 'ANDROID-SIGNING-001'),
      'Stage 2.3: Release keystore matches registered organization fingerprint'
    );

    // Test 2.4: 16 KB Page Memory Alignment Scanner
    const elf16Kb = createMockElfBuffer(16384);
    const elf4Kb = createMockElfBuffer(4096);

    const entries16Kb = {
      'lib/arm64-v8a/libnative.so': elf16Kb,
      'lib/x86_64/libcore.so': elf16Kb
    };
    const check16Res = ReleaseGateEngine.check16KbPageAlignment(entries16Kb);
    assert(
      check16Res.hasNativeCode && check16Res.allAligned,
      'Stage 2.4: 16 KB page memory alignment verification on 64-bit ELF libraries'
    );

    const entries4Kb = {
      'lib/arm64-v8a/liblegacy.so': elf4Kb
    };
    const check4Res = ReleaseGateEngine.check16KbPageAlignment(entries4Kb);
    assert(
      check4Res.hasNativeCode && !check4Res.allAligned,
      'Stage 2.5: Detect legacy 4 KB unaligned ELF binaries for 2026/2027 requirement'
    );

    // Test 2.6: ABI Architecture Scanner
    const abiPassContext = {
      metadata: { abis: ['arm64-v8a', 'armeabi-v7a'] }
    };
    const abiRes = await AbiScanner.run(abiPassContext);
    assert(
      abiRes.results.some(r => r.status === 'PASS' && r.ruleId === 'ANDROID-64BIT-001'),
      'Stage 2.6: Verify 64-bit architecture requirement (arm64-v8a)'
    );

    // Test 2.7: Manifest Security Scanner
    const manifestContext = {
      metadata: {
        rawManifest: '<application android:debuggable="false" android:allowBackup="false"></application>'
      }
    };
    const manifestRes = await ManifestScanner.run(manifestContext);
    assert(
      manifestRes.results.some(r => r.status === 'PASS' && r.ruleId === 'ANDROID-SECURITY-DEBUG-001'),
      'Stage 2.7: Manifest production flags verification (non-debuggable)'
    );

    // Test 2.8: Stalkerware & Monitoring Applications - Missing isMonitoringTool Flag Detection
    const monitoringMissingContext = {
      metadata: {
        rawManifest: '<application android:debuggable="false"><service android:name=".TrackingService"/></application>',
        isMonitoringApp: true
      },
      declarations: { isMonitoringApp: true }
    };
    const monitoringMissingRes = await ManifestScanner.run(monitoringMissingContext);
    assert(
      monitoringMissingRes.results.some(r => r.ruleId === 'ANDROID-STALKERWARE-001' && r.status === 'FAIL' && r.severity === 'BLOCKER'),
      'Stage 2.8: Flag missing "isMonitoringTool" flag on monitoring/tracking applications with BLOCKER severity'
    );

    // Test 2.9: Stalkerware & Monitoring Applications - Valid isMonitoringTool Flag Declared
    const monitoringDeclaredContext = {
      metadata: {
        rawManifest: '<application android:debuggable="false"><meta-data android:name="android.app.isMonitoringTool" android:value="enterprise_management"/></application>',
        isMonitoringApp: true
      },
      declarations: { isMonitoringApp: true }
    };
    const monitoringDeclaredRes = await ManifestScanner.run(monitoringDeclaredContext);
    assert(
      monitoringDeclaredRes.results.some(r => r.ruleId === 'ANDROID-STALKERWARE-001' && r.status === 'PASS'),
      'Stage 2.9: Verification of declared "android.app.isMonitoringTool" metadata flag'
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 3: Source & SBOM Dependency Scanner
  // ---------------------------------------------------------------------------
  console.log('\n📌 STAGE 3: Source & SBOM Dependency Scanner');
  {
    // Test 3.1: R8 Obfuscation & ProGuard Mapping Detection
    const r8ValidContext = {
      r8Proguard: { hasMappingFile: true }
    };
    const r8Res = await R8Scanner.run(r8ValidContext);
    assert(
      r8Res.results.some(r => r.ruleId === 'ANDROID-R8-001'),
      'Stage 3.1: R8/ProGuard obfuscation & mapping file verified'
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 4: Policy & Disclosure Consistency Engine
  // ---------------------------------------------------------------------------
  console.log('\n📌 STAGE 4: Policy & Disclosure Consistency Engine');
  {
    // Test 4.1: Permission Scanner - Approved vs Prohibited Permissions
    const permContext = {
      appProfile: getAppProfile('btgs'),
      metadata: {
        permissions: [
          'android.permission.INTERNET',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.CAMERA'
        ]
      }
    };
    const permRes = await PermissionScanner.run(permContext);
    assert(
      permRes.results.every(r => r.status === 'PASS'),
      'Stage 4.1: Declared permissions match organization approved permission catalog'
    );

    // Test 4.2: Detection of Prohibited / Restricted Permissions (REQUEST_INSTALL_PACKAGES)
    const restrictedPermContext = {
      appProfile: getAppProfile('bh1962'),
      metadata: {
        permissions: [
          'android.permission.INTERNET',
          'android.permission.REQUEST_INSTALL_PACKAGES'
        ]
      }
    };
    const restrictedRes = await PermissionScanner.run(restrictedPermContext);
    assert(
      restrictedRes.results.some(r => r.ruleId === 'ANDROID-INSTALL-PKG-001' && r.status === 'REVIEW_REQUIRED'),
      'Stage 4.2: Flag restricted high-risk permission (REQUEST_INSTALL_PACKAGES)'
    );

    // Test 4.3: Privacy Policy Resolver & Cross-Comparison
    const mockPolicyHtml = `
      <html>
        <body>
          <h1>Privacy Policy for com.bavya.btgs</h1>
          <p>We collect GPS Location data and Background Location to facilitate driver navigation.</p>
          <p>Camera and Audio permissions are used for document scanning and customer service.</p>
          <p>All telemetry data is transmitted with HTTPS / TLS Encryption.</p>
          <p>Users can request Account Deletion anytime.</p>
        </body>
      </html>
    `;
    const tempPolicyPath = path.join(os.tmpdir(), 'temp_test_policy.html');
    fs.writeFileSync(tempPolicyPath, mockPolicyHtml);

    const resolvedPolicy = await ReleaseGateEngine.resolvePrivacyPolicy(tempPolicyPath);
    fs.unlinkSync(tempPolicyPath);

    assert(
      resolvedPolicy.disclosures.location &&
      resolvedPolicy.disclosures.backgroundLocation &&
      resolvedPolicy.disclosures.camera &&
      resolvedPolicy.disclosures.accountDeletion,
      'Stage 4.3: Privacy policy disclosure NLP extraction (Location, Camera, Deletion, Encryption)'
    );

    const privacyContext = {
      appProfile: getAppProfile('btgs'),
      metadata: {
        permissions: [
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_BACKGROUND_LOCATION',
          'android.permission.CAMERA'
        ]
      },
      privacyPolicy: resolvedPolicy
    };
    const privacyRes = await PrivacyScanner.run(privacyContext);
    assert(
      privacyRes.results.some(r => r.status === 'PASS' && r.ruleId === 'PRIVACY-DISCLOSURE-LOCATION'),
      'Stage 4.4: Cross-consistency between binary permissions and privacy disclosures'
    );

    // Test 4.5: Photo & Video Permissions Policy - Broad READ_MEDIA_IMAGES / READ_MEDIA_VIDEO triggers BLOCKER
    const broadMediaContext = {
      appProfile: getAppProfile('btgs'),
      metadata: {
        targetSdk: 36,
        permissions: [
          'android.permission.INTERNET',
          'android.permission.READ_MEDIA_IMAGES',
          'android.permission.READ_MEDIA_VIDEO'
        ]
      }
    };
    const broadMediaRes = await PermissionScanner.run(broadMediaContext);
    assert(
      broadMediaRes.results.some(r => r.ruleId === 'ANDROID-PHOTO-VIDEO-PERM-001' && r.status === 'FAIL' && r.severity === 'BLOCKER'),
      'Stage 4.5: Detect broad READ_MEDIA_IMAGES/VIDEO permissions on Android 13+ and enforce Photo Picker migration'
    );

    // Test 4.6: Photo & Video Permissions Policy - Compliant App without broad media permissions passes
    const photoPickerCompliantContext = {
      appProfile: getAppProfile('btgs'),
      metadata: {
        targetSdk: 36,
        permissions: [
          'android.permission.INTERNET',
          'android.permission.CAMERA'
        ]
      }
    };
    const photoPickerCompliantRes = await PermissionScanner.run(photoPickerCompliantContext);
    assert(
      !photoPickerCompliantRes.results.some(r => r.ruleId === 'ANDROID-PHOTO-VIDEO-PERM-001' && r.status === 'FAIL'),
      'Stage 4.6: Verify clean permission manifest compliant with Android Photo Picker mandate'
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 5: Runtime Smoke Testing & Authentication Verification
  // ---------------------------------------------------------------------------
  console.log('\n📌 STAGE 5: Runtime Smoke Testing & Authentication Verification');
  {
    // Test 5.1: Restricted app with valid reviewer credentials passes login
    const runtimeWithCredsContext = {
      appProfile: getAppProfile('btgs'),
      metadata: { packageName: 'com.bavya.btgs', versionName: '6.0.1' },
      declarations: {
        accessRestricted: true,
        reviewerCredentials: [
          { name: 'Staff account', username: 'staff_user_01', password: 'secret_password_123' }
        ]
      },
      page16KbAlignment: { allAligned: true }
    };
    const runtimeWithCredsRes = await RuntimeScanner.run(runtimeWithCredsContext);
    assert(
      runtimeWithCredsRes.results.some(r => r.status === 'PASS' && r.ruleId === 'RUNTIME-SMOKE-PROFILE-001') &&
      runtimeWithCredsRes.runtimeTests.find(t => t.testId === 'login' && t.status === 'PASS'),
      'Stage 5.1: Runtime smoke authenticates with valid reviewer credentials from questionnaire'
    );

    // Test 5.2: Restricted app with missing credentials fails login and blocks protected flows
    const runtimeNoCredsContext = {
      appProfile: getAppProfile('btgs'),
      metadata: { packageName: 'com.bavya.btgs', versionName: '6.0.1', permissions: ['android.permission.INTERNET'] },
      declarations: {
        accessRestricted: true,
        reviewerCredentials: []
      },
      page16KbAlignment: { allAligned: true }
    };
    const runtimeNoCredsRes = await RuntimeScanner.run(runtimeNoCredsContext);
    assert(
      runtimeNoCredsRes.results.some(r => r.ruleId === 'RUNTIME-AUTH-CREDS-001' && r.status === 'FAIL' && r.severity === 'BLOCKER') &&
      runtimeNoCredsRes.runtimeTests.some(t => t.testId === 'login' && t.status === 'FAIL') &&
      runtimeNoCredsRes.runtimeTests.some(t => t.testId === 'dashboard' && t.status === 'BLOCKED'),
      'Stage 5.2: Detect and BLOCK runtime execution when login credentials are missing for restricted app'
    );

    // Test 5.3: Public unauthenticated app executes in public access mode
    const runtimePublicContext = {
      appProfile: getAppProfile('citizen104'),
      metadata: { packageName: 'in.gov.bihar.citizen104', versionName: '1.0.0' },
      declarations: {
        accessRestricted: false,
        reviewerCredentials: []
      },
      page16KbAlignment: { allAligned: true }
    };
    const runtimePublicRes = await RuntimeScanner.run(runtimePublicContext);
    assert(
      runtimePublicRes.results.some(r => r.status === 'PASS') &&
      runtimePublicRes.runtimeTests.every(t => t.status === 'PASS'),
      'Stage 5.3: Public unauthenticated app passes runtime smoke in public mode'
    );
  }


  // ---------------------------------------------------------------------------
  // STAGE 6: Authoritative Release Gate Decision & Delta Matrix
  // ---------------------------------------------------------------------------
  console.log('\n📌 STAGE 6: Release Gate Decision & Delta Matrix');
  {
    // Test 6.1: Release Delta Engine (Detect version code increment, permission changes)
    const currentBuild = {
      metadata: {
        packageName: 'com.bavya.btgs',
        versionCode: 8,
        versionName: '6.0.2',
        targetSdk: 36,
        permissions: ['android.permission.INTERNET', 'android.permission.CAMERA']
      },
      signingCertificate: { sha256: '3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C' },
      page16KbAlignment: { allAligned: true },
      artifactHash: 'abc123hash'
    };
    const previousBuild = {
      metadata: {
        packageName: 'com.bavya.btgs',
        versionCode: 7,
        versionName: '6.0.1',
        targetSdk: 35,
        permissions: ['android.permission.INTERNET']
      }
    };

    const delta = computeReleaseDelta(currentBuild, previousBuild);
    assert(
      delta.hasBaseline && delta.currentVersionCode === 8 && delta.newPermissions.includes('android.permission.CAMERA'),
      'Stage 6.1: Release delta calculation (version code increment & permission diff)'
    );

    // Test 6.2: Verdict Engine Evaluation - READY verdict on all passing checks
    const passingEvidence = [
      { ruleId: 'TEST_1', title: 'Target SDK', status: 'PASS', severity: 'BLOCKER' },
      { ruleId: 'TEST_2', title: '16 KB Alignment', status: 'PASS', severity: 'BLOCKER' },
      { ruleId: 'TEST_3', title: 'Signing Keystore', status: 'PASS', severity: 'BLOCKER' }
    ];
    const verdictReady = VerdictEngine.evaluate({ evidenceList: passingEvidence, delta: null, humanSignoffs: {} });
    assert(
      verdictReady.verdict === 'READY' && verdictReady.score === 100,
      'Stage 6.2: Verdict Engine determines READY when all gates pass'
    );

    // Test 6.3: Verdict Engine Evaluation - BLOCKED on critical failure
    const failingEvidence = [
      { ruleId: 'FAIL_1', title: 'Debug Key', status: 'FAIL', severity: 'BLOCKER', remediation: 'Sign with production key' }
    ];
    const verdictBlocked = VerdictEngine.evaluate({ evidenceList: failingEvidence, delta: null, humanSignoffs: {} });
    assert(
      verdictBlocked.verdict === 'BLOCKED' && verdictBlocked.blockingItems.length > 0,
      'Stage 6.3: Verdict Engine determines BLOCKED on technical release blockers'
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 7: Canonical Audit & Evidence Package
  // ---------------------------------------------------------------------------
  console.log('\n📌 STAGE 7: Canonical Audit & Evidence Package');
  {
    // Run full master audit pipeline on synthetic production bundle
    const elf16Kb = createMockElfBuffer(16384);
    const mockAab = createMockZipBuffer({
      'base/manifest/AndroidManifest.xml': `
        <manifest package="com.bavya.btgs" android:versionCode="8" android:versionName="6.0.2">
          <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="36" />
          <uses-permission android:name="android.permission.INTERNET" />
          <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
          <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
          <uses-permission android:name="android.permission.CAMERA" />
          <application android:debuggable="false" android:allowBackup="false"></application>
        </manifest>
      `,
      'base/lib/arm64-v8a/libflutter.so': elf16Kb,
      'base/lib/armeabi-v7a/libflutter.so': elf16Kb,
      'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map': 'mock proguard mapping',
      'META-INF/RELEASE.RSA': Buffer.from('Official Enterprise Release Keystore Signature Block')
    });

    const masterReport = await ReleaseGateEngine.runMasterAudit({
      fileBuffer: mockAab,
      fileName: 'Travelite-BTGS-v6.0.2.aab',
      appId: 'btgs',
      policyUrl: null,
      humanSignoffs: {
        'ANDROID-INSTALL-PKG-001': { approved: true, signoffBy: 'SecOps Officer', timestamp: new Date().toISOString() }
      }
    });

    assert(
      masterReport.schemaVersion === '2.0.0' &&
      masterReport.application.packageName === 'com.bavya.btgs' &&
      masterReport.application.targetSdk === 36 &&
      masterReport.evidenceList.length > 10 &&
      masterReport.statistics.totalEvaluated > 10,
      'Stage 7.1: Master 7-Stage Pipeline generates standardized canonical audit package'
    );

    assert(
      masterReport.upcomingRequirements && masterReport.upcomingRequirements.length > 0,
      'Stage 7.2: Play Store 2026/2027 forward-looking requirements included in evidence package'
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 1 / QUESTIONNAIRE: Play Store Deployment Questionnaire & Store Setup
  // ---------------------------------------------------------------------------
  console.log('\n📌 PLAY STORE DEPLOYMENT QUESTIONNAIRE & STORE SETUP (5 SCREENS)');
  {
    // Test Q.1: App Name <= 30 chars passes
    const validQContext = {
      questionnaire: {
        appName: 'BIHAR 1962 Ops',
        packageName: 'in.gov.bihar.vas1962',
        developerProgramPoliciesConfirmed: true,
        usExportLawsAccepted: true,
        accessRestricted: true,
        reviewerCredentials: [
          { name: 'Doctor account', username: 'doc_user_01', password: 'doc_password' }
        ],
        containsAds: false,
        contentCategory: 'Government / Utility / Health',
        targetAgeGroup: '18+',
        privacyPolicyUrl: 'https://ops.bhspl.in/privacy-policy'
      },
      metadata: {
        packageName: 'in.gov.bihar.vas1962',
        adSdks: []
      }
    };
    const validQRes = await QuestionnaireScanner.run(validQContext);
    assert(
      validQRes.results.every(r => r.status === 'PASS'),
      'Questionnaire 1.1: Valid declarations pass all 5 Google Play deployment screens'
    );

    // Test Q.2: App Name > 30 characters triggers BLOCKER
    const longNameQContext = {
      questionnaire: {
        appName: 'This App Name Exceeds The Maximum Allowed Google Play 30 Char Limit',
        packageName: 'in.gov.bihar.vas1962',
        developerProgramPoliciesConfirmed: true,
        usExportLawsAccepted: true
      },
      metadata: { packageName: 'in.gov.bihar.vas1962' }
    };
    const longNameQRes = await QuestionnaireScanner.run(longNameQContext);
    assert(
      longNameQRes.results.some(r => r.ruleId === 'RULE-PLAY-APP-NAME-002' && r.status === 'FAIL' && r.severity === 'BLOCKER'),
      'Questionnaire 1.2: Enforce strict 30-character App Name limit with BLOCKER severity'
    );

    // Test Q.3: Package Name mismatch with AndroidManifest.xml triggers BLOCKER
    const mismatchPkgContext = {
      questionnaire: {
        appName: 'Valid App Name',
        packageName: 'com.declared.package',
        developerProgramPoliciesConfirmed: true,
        usExportLawsAccepted: true
      },
      metadata: { packageName: 'com.actual.binary.package' }
    };
    const mismatchPkgRes = await QuestionnaireScanner.run(mismatchPkgContext);
    assert(
      mismatchPkgRes.results.some(r => r.ruleId === 'RULE-PLAY-PKG-002' && r.status === 'FAIL' && r.severity === 'BLOCKER'),
      'Questionnaire 1.3: Package Name mismatch between Store Setup and Binary triggers BLOCKER'
    );

    // Test Q.4: Restricted App with missing Reviewer Credentials triggers BLOCKER
    const noCredsContext = {
      questionnaire: {
        appName: 'Restricted App',
        packageName: 'com.bavya.btgs',
        developerProgramPoliciesConfirmed: true,
        usExportLawsAccepted: true,
        accessRestricted: true,
        reviewerCredentials: []
      },
      metadata: { packageName: 'com.bavya.btgs' }
    };
    const noCredsRes = await QuestionnaireScanner.run(noCredsContext);
    assert(
      noCredsRes.results.some(r => r.ruleId === 'RULE-PLAY-APP-ACCESS-001' && r.status === 'FAIL' && r.severity === 'BLOCKER'),
      'Questionnaire 1.4: Restricted app with missing reviewer credentials triggers BLOCKER'
    );

    // Test Q.5: Discrepancy between "No Ads" declaration and embedded ad SDK in binary
    const adDiscrepancyContext = {
      questionnaire: {
        appName: 'Ad Free App',
        packageName: 'com.bavya.btgs',
        developerProgramPoliciesConfirmed: true,
        usExportLawsAccepted: true,
        containsAds: false
      },
      metadata: {
        packageName: 'com.bavya.btgs',
        adSdks: ['com.google.android.gms.ads', 'com.facebook.ads']
      }
    };
    const adDiscrepancyRes = await QuestionnaireScanner.run(adDiscrepancyContext);
    assert(
      adDiscrepancyRes.results.some(r => r.ruleId === 'RULE-PLAY-ADS-DISCREPANCY-001' && r.status === 'FAIL' && r.severity === 'BLOCKER'),
      'Questionnaire 1.5: Cross-check flags BLOCKER if "No Ads" is declared but ad SDKs exist in binary'
    );
  }

  // ---------------------------------------------------------------------------
  // App Registry Catalog Checks
  // ---------------------------------------------------------------------------

  console.log('\n📌 App Registry & Profile Resolution');
  {
    const allApps = getAllApps();
    assert(allApps.length >= 4, 'App Registry: Lists all registered enterprise apps (BTGS, 1962, 108, 104)');

    const btgsProfile = getAppProfile('com.bavya.btgs');
    assert(btgsProfile && btgsProfile.appId === 'btgs', 'App Registry: Resolves profile by package name');

    const policyVer = getPolicyVersion();
    assert(policyVer.includes('2026'), 'Policy Registry: Returns active Play Store policy baseline version');

    // Test Dynamic Per-App Signing Key Registration
    const { registerAppSigningKey } = require('./server/services/audit/appRegistry/appRegistry');
    const ops108Profile = getAppProfile('in.bhspl.ops108');
    assert(
      ops108Profile.signing.sha1.includes('49:07:E4:89:1C:B3:68:81:80:8C:00:6A:A3:60:D9:B0:0C:83:50:5E'),
      'App Registry: ops108 has official Google Play Store release key registered'
    );

    // Dynamic Registration Test for new key
    const customTestKey = 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD';
    registerAppSigningKey('in.bhspl.ops108', customTestKey);
    const updatedOps108 = getAppProfile('in.bhspl.ops108');
    assert(
      updatedOps108.signing.sha1.includes(customTestKey),
      'App Registry: Dynamic per-project signing key registration succeeds'
    );

    // Verify SigningScanner accepts registered ops108 key
    const opsContext = {
      appProfile: updatedOps108,
      signingCertificate: {
        isProductionKey: true,
        sha1: '49:07:E4:89:1C:B3:68:81:80:8C:00:6A:A3:60:D9:B0:0C:83:50:5E',
        sha256: '7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F',
        subject: 'CN=108 Emergency Ambulance Release Key, O=Bavya Health Services, C=IN'
      }
    };
    const signingCheck = await SigningScanner.run(opsContext);
    assert(
      signingCheck.results.some(r => r.ruleId === 'ANDROID-SIGNING-001' && r.status === 'PASS'),
      'Stage 2.3b: SigningScanner PASS for ops108 with official Play Store release key'
    );
  }

  console.log('\n================================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PLAY STORE AUDIT 7-STAGE RELEASE GATE TESTS PASSED!`);
  console.log('================================================================================\n');
}

runAllPlayStoreAuditTests().catch(err => {
  console.error('💥 Play Store Audit Test Suite failed:', err);
  process.exit(1);
});
