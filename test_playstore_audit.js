const fs = require('fs');
const path = require('path');
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
    const tempPolicyPath = path.join(__dirname, 'temp_test_policy.html');
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
  }

  // ---------------------------------------------------------------------------
  // STAGE 5: Runtime Smoke Testing & Crash Verification
  // ---------------------------------------------------------------------------
  console.log('\n📌 STAGE 5: Runtime Smoke Testing & Crash Verification');
  {
    const runtimeContext = {
      appProfile: getAppProfile('btgs'),
      metadata: { packageName: 'com.bavya.btgs', versionName: '6.0.1' },
      page16KbAlignment: { allAligned: true }
    };
    const runtimeRes = await RuntimeScanner.run(runtimeContext);
    assert(
      runtimeRes.results.some(r => r.status === 'PASS' && r.ruleId === 'RUNTIME-SMOKE-PROFILE-001') &&
      runtimeRes.runtimeTests.length >= 5,
      'Stage 5.1: 16 KB runtime smoke simulation and critical path validation'
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
  }

  console.log('\n================================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PLAY STORE AUDIT 7-STAGE RELEASE GATE TESTS PASSED!`);
  console.log('================================================================================\n');
}

runAllPlayStoreAuditTests().catch(err => {
  console.error('💥 Play Store Audit Test Suite failed:', err);
  process.exit(1);
});
