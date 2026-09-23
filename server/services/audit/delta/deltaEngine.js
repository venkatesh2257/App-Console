/**
 * Release-to-Release Delta Engine
 * Analyzes regression, changes, and new risk vectors between the current build
 * and the previous production baseline.
 */

const { buildEvidence } = require('../evidence/evidenceBuilder');

function computeReleaseDelta(currentBuild, previousBuild) {
  if (!previousBuild) {
    return {
      hasBaseline: false,
      summary: 'Initial release scan. No previous baseline found in audit records.',
      deltas: [],
      newPermissions: [],
      removedPermissions: [],
      isVersionCodeValid: true,
      artifactLockPassed: true
    };
  }

  const deltas = [];
  const currMeta = currentBuild.metadata || {};
  const prevMeta = previousBuild.metadata || {};

  // 1. Version Code Continuity & Artifact Tampering Check
  const currCode = parseInt(currMeta.versionCode || 1, 10);
  const prevCode = parseInt(prevMeta.versionCode || 0, 10);
  let isVersionCodeValid = currCode > prevCode;
  let artifactLockPassed = true;

  if (currCode === prevCode) {
    if (currentBuild.artifactHash && previousBuild.artifactHash && currentBuild.artifactHash !== previousBuild.artifactHash) {
      artifactLockPassed = false;
      deltas.push({
        type: 'ARTIFACT_TAMPER',
        category: 'SECURITY',
        severity: 'BLOCKER',
        title: 'Release Lock Violation: Artifact Hash Modified for Same Version Code',
        description: `Version Code ${currCode} was previously validated with SHA-256 ${previousBuild.artifactHash.substring(0, 12)}..., but a different binary was uploaded (${currentBuild.artifactHash.substring(0, 12)}...).`,
        risk: 'CRITICAL',
        remediation: 'Bump versionCode in build.gradle before rebuilding or revert to previously validated artifact.'
      });
    } else {
      deltas.push({
        type: 'VERSION_CODE',
        category: 'VERSION',
        severity: 'WARNING',
        title: `Same Version Code (${currCode}) as previous scan`,
        description: 'Re-scanning same version code. If submitting to Play Console, versionCode must be strictly higher than currently published releases.',
        risk: 'MEDIUM'
      });
    }
  } else if (currCode < prevCode) {
    deltas.push({
      type: 'VERSION_CODE_REGRESSION',
      category: 'VERSION',
      severity: 'BLOCKER',
      title: `Version Code Regression (${prevCode} ➔ ${currCode})`,
      description: `New version code (${currCode}) is lower than previously scanned version code (${prevCode}). Play Store rejects downgrades.`,
      risk: 'CRITICAL',
      remediation: `Set versionCode to at least ${prevCode + 1}.`
    });
  } else {
    deltas.push({
      type: 'VERSION_CODE_BUMP',
      category: 'VERSION',
      severity: 'INFO',
      title: `Version Code Incremented: ${prevCode} ➔ ${currCode}`,
      description: `Proper monotonic version code progression.`,
      risk: 'NONE'
    });
  }

  // 2. Target SDK Delta
  const currTarget = parseInt(currMeta.targetSdk || 36, 10);
  const prevTarget = parseInt(prevMeta.targetSdk || 35, 10);
  if (currTarget > prevTarget) {
    deltas.push({
      type: 'TARGET_SDK_UPGRADE',
      category: 'TARGET_SDK',
      severity: 'INFO',
      title: `Target SDK Upgraded: API ${prevTarget} ➔ API ${currTarget}`,
      description: 'Upgraded target API level to meet newest Google Play requirements.',
      risk: 'LOW'
    });
  } else if (currTarget < prevTarget) {
    deltas.push({
      type: 'TARGET_SDK_DOWNGRADE',
      category: 'TARGET_SDK',
      severity: 'BLOCKER',
      title: `Target SDK Downgraded: API ${prevTarget} ➔ API ${currTarget}`,
      description: 'Downgrading target SDK causes immediate Play Store submission failure.',
      risk: 'CRITICAL'
    });
  }

  // 3. Permission Delta (Critical Risk Vector)
  const currPerms = currMeta.permissions || [];
  const prevPerms = prevMeta.permissions || [];
  const newPermissions = currPerms.filter(p => !prevPerms.includes(p));
  const removedPermissions = prevPerms.filter(p => !currPerms.includes(p));

  if (newPermissions.length > 0) {
    const isSensitive = newPermissions.some(p => 
      p.includes('LOCATION') || p.includes('CAMERA') || p.includes('AUDIO') || p.includes('RECORD_AUDIO') || p.includes('READ_MEDIA')
    );
    deltas.push({
      type: 'PERMISSIONS_ADDED',
      category: 'PERMISSIONS',
      severity: isSensitive ? 'HIGH' : 'WARNING',
      title: `New Permissions Introduced (+${newPermissions.length})`,
      description: `New capabilities added in this build: ${newPermissions.join(', ')}`,
      risk: isSensitive ? 'HIGH' : 'MEDIUM',
      requiresJustification: isSensitive,
      items: newPermissions
    });
  }

  if (removedPermissions.length > 0) {
    deltas.push({
      type: 'PERMISSIONS_REMOVED',
      category: 'PERMISSIONS',
      severity: 'INFO',
      title: `Permissions Removed (-${removedPermissions.length})`,
      description: `Permissions dropped: ${removedPermissions.join(', ')}`,
      risk: 'NONE',
      items: removedPermissions
    });
  }

  // 4. Native Library (.so) Delta
  const currLibs = (currentBuild.page16KbAlignment && currentBuild.page16KbAlignment.checkedLibs) || [];
  const prevLibs = (previousBuild.page16KbAlignment && previousBuild.page16KbAlignment.checkedLibs) || [];
  const currLibNames = currLibs.map(l => l.name);
  const prevLibNames = prevLibs.map(l => l.name);

  const addedLibs = currLibNames.filter(n => !prevLibNames.includes(n));
  const removedLibs = prevLibNames.filter(n => !currLibNames.includes(n));

  if (addedLibs.length > 0) {
    deltas.push({
      type: 'NATIVE_LIBS_ADDED',
      category: 'NATIVE_CODE',
      severity: 'WARNING',
      title: `New Native Libraries Added (+${addedLibs.length})`,
      description: `New .so binaries bundled: ${addedLibs.join(', ')}. Must verify 16 KB page alignment for all new binaries.`,
      risk: 'MEDIUM',
      items: addedLibs
    });
  }

  // 5. Signing Certificate Continuity
  const currCert = currentBuild.signingCertificate || {};
  const prevCert = previousBuild.signingCertificate || {};
  if (currCert.sha256 && prevCert.sha256 && currCert.sha256 !== prevCert.sha256) {
    deltas.push({
      type: 'SIGNING_CERT_CHANGED',
      category: 'SIGNING',
      severity: 'BLOCKER',
      title: 'Signing Certificate SHA-256 Mismatch vs Previous Release',
      description: `Signing fingerprint changed from ${prevCert.sha256.substring(0, 16)}... to ${currCert.sha256.substring(0, 16)}...`,
      risk: 'CRITICAL',
      remediation: 'Build must be signed with the identical production keystore to permit app updates.'
    });
  }

  return {
    hasBaseline: true,
    previousVersionCode: prevCode,
    currentVersionCode: currCode,
    isVersionCodeValid,
    artifactLockPassed,
    deltas,
    newPermissions,
    removedPermissions,
    addedNativeLibs: addedLibs
  };
}

module.exports = {
  computeReleaseDelta
};
