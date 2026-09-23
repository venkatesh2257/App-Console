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

    return { results };
  }
};

module.exports = PermissionScanner;
