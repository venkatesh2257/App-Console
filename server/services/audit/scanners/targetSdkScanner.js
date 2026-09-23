/**
 * Target SDK Scanner (Stage 2)
 * Evaluates targetSdkVersion against versioned platform policy (mobile vs wear vs tv, new vs update).
 */

const { buildEvidence } = require('../evidence/evidenceBuilder');
const { getPolicyRule } = require('../policies/policyRegistry');

const TargetSdkScanner = {
  id: 'TARGET_SDK_VALIDATOR',
  name: 'Target API Level Policy Scanner',
  version: '2.0.0',
  stage: 2,

  supports(context) {
    return context.metadata && context.metadata.targetSdk !== undefined;
  },

  async run(context) {
    const results = [];
    const rule = getPolicyRule('ANDROID-TARGET-2026-001');
    const targetSdk = parseInt(context.metadata.targetSdk, 10);
    const platform = context.appProfile ? context.appProfile.platform : 'android-mobile';
    const releaseType = context.appProfile ? context.appProfile.releaseType : 'update';

    const platformScope = (rule.scopes && rule.scopes[platform]) ? rule.scopes[platform] : rule.scopes['android-mobile'];
    const requiredMin = (platformScope[releaseType] && platformScope[releaseType].minTargetSdk) || 36;
    const legacyGrace = (platformScope[releaseType] && platformScope[releaseType].legacyGraceMinSdk) || 35;

    if (targetSdk >= requiredMin) {
      results.push(buildEvidence({
        ruleId: rule.ruleId,
        category: rule.category,
        title: `Target SDK Compliance (Target: API ${targetSdk})`,
        severity: 'BLOCKER',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: `Application targets Android API ${targetSdk} (Android 16+ mandate fulfilled).`,
        where: 'AndroidManifest.xml (targetSdkVersion)',
        why: `Meets or exceeds required minimum API ${requiredMin} for ${platform} (${releaseType}).`,
        source: rule.source.url,
        requirement: `targetSdkVersion >= ${requiredMin} (Effective: ${rule.effectiveDate})`,
        evidence: {
          targetSdk,
          requiredMinSdk: requiredMin,
          platform,
          releaseType
        }
      }));
    } else if (targetSdk === legacyGrace) {
      results.push(buildEvidence({
        ruleId: rule.ruleId,
        category: rule.category,
        title: `Target SDK Legacy Window (Target: API ${targetSdk})`,
        severity: 'WARNING',
        status: 'WARNING',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: `Application targets API ${targetSdk} (Android 15). Legacy grace window active for existing app updates.`,
        where: 'AndroidManifest.xml (targetSdkVersion)',
        why: `Google Play requires Target SDK ${requiredMin} for new submissions; existing updates are granted temporary grace on SDK ${legacyGrace}.`,
        source: rule.source.url,
        requirement: `Upgrade to targetSdkVersion ${requiredMin} (Android 16) recommended before next cycle.`,
        remediation: 'Update android/app/build.gradle targetSdkVersion to 36 and recompile.',
        evidence: {
          targetSdk,
          requiredMinSdk: requiredMin,
          graceMinSdk: legacyGrace
        }
      }));
    } else {
      results.push(buildEvidence({
        ruleId: rule.ruleId,
        category: rule.category,
        title: `Target SDK Below Mandate (Target: API ${targetSdk})`,
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: `Target SDK ${targetSdk} is rejected by Google Play submission gate.`,
        where: 'AndroidManifest.xml (targetSdkVersion)',
        why: `Google Play enforces minimum targetSdkVersion ${requiredMin} for all releases as of ${rule.effectiveDate}.`,
        source: rule.source.url,
        requirement: `targetSdkVersion >= ${requiredMin}`,
        remediation: `Set targetSdkVersion to ${requiredMin} (or at least ${legacyGrace}) in build.gradle / build.gradle.kts and update any deprecated platform APIs.`,
        evidence: {
          targetSdk,
          requiredMinSdk: requiredMin,
          platform
        }
      }));
    }

    return { results };
  }
};

module.exports = TargetSdkScanner;
