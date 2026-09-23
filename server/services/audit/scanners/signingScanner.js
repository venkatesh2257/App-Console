/**
 * Signing Certificate & Keystore Scanner (Stage 2)
 * Validates cryptographic signatures, rejects debug keystores, and compares
 * extracted SHA-1/SHA-256 fingerprints against official Organization App Registry baselines.
 */

const { buildEvidence } = require('../evidence/evidenceBuilder');
const { getPolicyRule } = require('../policies/policyRegistry');

const SigningScanner = {
  id: 'SIGNING_CERTIFICATE_VALIDATOR',
  name: 'Release Signing Certificate & Keystore Security Scanner',
  version: '2.0.0',
  stage: 2,

  supports(context) {
    return !!context.signingCertificate;
  },

  async run(context) {
    const results = [];
    const rule = getPolicyRule('ANDROID-SIGNING-001');
    const cert = context.signingCertificate;

    // 1. Check for Debug Keystore
    if (cert.isProductionKey === false || (cert.subject && cert.subject.toLowerCase().includes('android debug'))) {
      results.push(buildEvidence({
        ruleId: rule.ruleId,
        category: rule.category,
        title: 'Debug Keystore Signature Detected',
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: 'Artifact is signed with a default Android Debug Keystore.',
        where: 'META-INF/*.RSA / *.DSA / *.EC',
        why: 'Google Play strictly forbids releasing debug-signed packages to public production or testing tracks.',
        source: rule.source.url,
        requirement: 'Release builds must be signed with official production cryptographic keystores.',
        remediation: 'Configure production signingConfigs { release { storeFile ... } } in build.gradle before compiling release bundle.',
        evidence: {
          subject: cert.subject,
          sha1: cert.sha1,
          sha256: cert.sha256,
          isProduction: false
        }
      }));
      return { results };
    }

    // 2. Compare against App Registry
    if (context.appProfile && context.appProfile.signing) {
      const registeredSha256 = (context.appProfile.signing.sha256 || []).map(s => s.replace(/:/g, '').toUpperCase());
      const currentSha256Clean = (cert.sha256 || '').replace(/:/g, '').toUpperCase();

      if (registeredSha256.length > 0) {
        const isMatch = registeredSha256.some(reg => reg === currentSha256Clean);

        if (isMatch) {
          results.push(buildEvidence({
            ruleId: rule.ruleId,
            category: rule.category,
            title: 'Signing Certificate Matches App Registry Baseline',
            severity: 'BLOCKER',
            status: 'PASS',
            verification: 'DETERMINISTIC',
            verificationLevel: 'FULL',
            what: `Signing SHA-256 fingerprint matches registered official keystore for ${context.appProfile.name}.`,
            where: 'App Registry Profile (signing.sha256)',
            why: 'Guarantees the artifact originates from the authorized organization release pipeline.',
            source: rule.source.url,
            requirement: 'SHA-256 fingerprint must match registered organization certificate.',
            evidence: {
              appId: context.appProfile.appId,
              matchedSha256: cert.sha256,
              subject: cert.subject
            }
          }));
        } else {
          results.push(buildEvidence({
            ruleId: rule.ruleId,
            category: rule.category,
            title: 'Signing Certificate Fingerprint Mismatch',
            severity: 'BLOCKER',
            status: 'FAIL',
            verification: 'DETERMINISTIC',
            verificationLevel: 'FULL',
            what: `Extracted SHA-256 fingerprint does NOT match the registered certificate for ${context.appProfile.name}.`,
            where: 'META-INF signature vs App Registry',
            why: 'Submitting a build signed with a mismatched keystore will fail Google Play App Signing or brick app updates for existing users.',
            source: rule.source.url,
            requirement: 'Cryptographic signature fingerprint must strictly match production release keystore.',
            remediation: `Verify your local key.properties / signingConfig. Expected: ${context.appProfile.signing.sha256[0]}, Observed: ${cert.sha256}`,
            evidence: {
              appId: context.appProfile.appId,
              expectedSha256: context.appProfile.signing.sha256,
              observedSha256: cert.sha256,
              observedSha1: cert.sha1
            }
          }));
        }
      }
    } else {
      // Unregistered app profile
      results.push(buildEvidence({
        ruleId: rule.ruleId,
        category: rule.category,
        title: 'Production Keystore Verified (Unregistered Profile)',
        severity: 'HIGH',
        status: 'REVIEW_REQUIRED',
        verification: 'STATIC',
        verificationLevel: 'PARTIAL',
        what: 'Artifact is signed with a valid non-debug keystore, but package is not registered in App Registry.',
        where: 'META-INF signature',
        why: 'Cannot cross-verify against an authorized organization SHA-256 baseline.',
        source: rule.source.url,
        requirement: 'Register application profile and expected SHA-256 in App Registry for automated release gating.',
        remediation: 'Add this package and its official release keystore SHA-256 to server/services/audit/appRegistry/appRegistry.js',
        evidence: {
          sha1: cert.sha1,
          sha256: cert.sha256,
          subject: cert.subject
        }
      }));
    }

    return { results };
  }
};

module.exports = SigningScanner;
