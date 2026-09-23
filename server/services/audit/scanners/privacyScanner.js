/**
 * Privacy Policy & Disclosure Consistency Scanner (Stage 4)
 * Evaluates consistency between manifest capabilities and privacy policy disclosures using heuristic analysis.
 * Explicitly marks findings as HEURISTIC consistency checks rather than definitive legal/Play compliance proofs.
 */

const { buildEvidence } = require('../evidence/evidenceBuilder');
const { getPolicyRule } = require('../policies/policyRegistry');

const PrivacyScanner = {
  id: 'PRIVACY_CONSISTENCY_VALIDATOR',
  name: 'Privacy Policy & Data Safety Disclosure Consistency Engine',
  version: '2.0.0',
  stage: 4,

  supports(context) {
    return !!context.privacyPolicy;
  },

  async run(context) {
    const results = [];
    const rule = getPolicyRule('ANDROID-PRIVACY-001');
    const policy = context.privacyPolicy || {};
    const permissions = (context.metadata && context.metadata.permissions) || [];
    const packageName = (context.metadata && context.metadata.packageName) || '';
    const rawText = (policy.rawText || '').toLowerCase();
    const disclosures = policy.disclosures || {};

    // 1. Package Scope Heuristic Match
    const coveredApps = policy.coveredApps || [];
    const isPackageMentioned = coveredApps.some(p => p.toLowerCase().includes(packageName.toLowerCase())) ||
      rawText.includes(packageName.toLowerCase()) ||
      (context.appProfile && rawText.includes(context.appProfile.name.toLowerCase()));

    if (isPackageMentioned) {
      results.push(buildEvidence({
        ruleId: 'PRIVACY-PACKAGE-SCOPE-001',
        category: 'PRIVACY_CONSISTENCY',
        title: 'Privacy Policy: Application Scope Consistency Cleared',
        severity: 'HIGH',
        status: 'PASS',
        verification: 'HEURISTIC',
        verificationLevel: 'HEURISTIC',
        confidence: 'HIGH',
        what: `Privacy policy explicitly covers application package or service identity (${packageName}).`,
        where: policy.url || 'Privacy Policy Document',
        why: 'Google Play requires privacy policies to explicitly name the application or developer entity in scope.',
        source: rule.source.url,
        requirement: 'Privacy Policy must name the app / package identifier.',
        evidence: {
          packageName,
          policyUrl: policy.url,
          coveredPackages: coveredApps
        }
      }));
    } else {
      results.push(buildEvidence({
        ruleId: 'PRIVACY-PACKAGE-SCOPE-001',
        category: 'PRIVACY_CONSISTENCY',
        title: 'Privacy Policy: Application Identity Not Mentioned',
        severity: 'HIGH',
        status: 'WARNING',
        verification: 'HEURISTIC',
        verificationLevel: 'HEURISTIC',
        confidence: 'MEDIUM',
        what: `Application package (${packageName}) was not found in the parsed Privacy Policy document.`,
        where: policy.url || 'Privacy Policy Document',
        why: 'Play reviewers may reject submissions if the privacy policy appears generic and does not cover the specific mobile application.',
        source: rule.source.url,
        requirement: 'Privacy policy should explicitly reference the app name or package identifier.',
        remediation: `Add explicit mention of '${packageName}' (or app name) in the Privacy Policy under covered services.`,
        evidence: {
          packageName,
          policyUrl: policy.url
        }
      }));
    }

    // 2. Hardware Permission Consistency Check
    const checks = [
      {
        permKey: 'LOCATION',
        hasPerm: permissions.some(p => p.includes('ACCESS_FINE_LOCATION') || p.includes('ACCESS_COARSE_LOCATION')),
        hasDisclosure: disclosures.location === true || rawText.includes('location') || rawText.includes('gps'),
        name: 'GPS / Foreground Location'
      },
      {
        permKey: 'BG_LOCATION',
        hasPerm: permissions.some(p => p.includes('ACCESS_BACKGROUND_LOCATION')),
        hasDisclosure: disclosures.backgroundLocation === true || (rawText.includes('background') && rawText.includes('location')),
        name: 'Background 24/7 Location Tracking'
      },
      {
        permKey: 'CAMERA',
        hasPerm: permissions.some(p => p.includes('CAMERA')),
        hasDisclosure: disclosures.camera === true || rawText.includes('camera') || rawText.includes('photo'),
        name: 'Camera & Video Capture'
      },
      {
        permKey: 'AUDIO',
        hasPerm: permissions.some(p => p.includes('RECORD_AUDIO')),
        hasDisclosure: disclosures.audio === true || rawText.includes('audio') || rawText.includes('microphone') || rawText.includes('voice'),
        name: 'Microphone & Audio Recording'
      }
    ];

    checks.forEach(check => {
      if (check.hasPerm) {
        if (check.hasDisclosure) {
          results.push(buildEvidence({
            ruleId: `PRIVACY-DISCLOSURE-${check.permKey}`,
            category: 'PRIVACY_CONSISTENCY',
            title: `Privacy Consistency: ${check.name} Disclosed`,
            severity: 'HIGH',
            status: 'PASS',
            verification: 'HEURISTIC',
            verificationLevel: 'HEURISTIC',
            confidence: 'HIGH',
            what: `Manifest requests ${check.name} and matching data collection disclosures were identified in the Privacy Policy.`,
            where: 'AndroidManifest.xml vs Privacy Policy',
            why: 'Fulfills data safety disclosure consistency expectation.',
            source: rule.source.url,
            requirement: `Prominent privacy policy disclosure for ${check.name}.`,
            evidence: {
              permissionCategory: check.permKey,
              disclosedInPolicy: true
            }
          }));
        } else {
          results.push(buildEvidence({
            ruleId: `PRIVACY-DISCLOSURE-${check.permKey}`,
            category: 'PRIVACY_CONSISTENCY',
            title: `Privacy Consistency Discrepancy: ${check.name} Missing in Policy`,
            severity: 'BLOCKER',
            status: 'FAIL',
            verification: 'HEURISTIC',
            verificationLevel: 'HEURISTIC',
            confidence: 'HIGH',
            what: `Manifest requests ${check.name} permission, but no corresponding data collection clause was detected in the Privacy Policy.`,
            where: 'AndroidManifest.xml vs Privacy Policy Document',
            why: 'Google Play will issue policy strike / rejection for collecting sensitive hardware data without privacy policy disclosures.',
            source: rule.source.url,
            requirement: `Add explicit data collection, usage, and retention disclosure for ${check.name} in privacy policy.`,
            remediation: `Update privacy policy at ${policy.url || 'website'} to disclose why and how ${check.name} data is gathered.`,
            evidence: {
              permissionCategory: check.permKey,
              disclosedInPolicy: false
            }
          }));
        }
      }
    });

    return { results };
  }
};

module.exports = PrivacyScanner;
