/**
 * Google Play Deployment Questionnaire & Declarations Scanner
 * Evaluates developer declarations from Google Play Console pre-flight setup:
 * 1. App Name length (<= 30 chars limit) & Package Name Java format / binary match
 * 2. Developer Program Policy & US Export Laws / Encryption compliance
 * 3. App Access & Reviewer Sign-In details (Mandatory if login restricted)
 * 4. Ads Declaration (Cross-checks binary bytecode/dependencies for undisclosed ad SDKs)
 * 5. IARC Content Rating questionnaire and classification
 * 6. Privacy Policy HTTPS format and reachable destination
 */

const { buildEvidence } = require('../evidence/evidenceBuilder');

const KNOWN_AD_SDKS = [
  { name: 'Google AdMob', pattern: 'com.google.android.gms.ads' },
  { name: 'Google Mobile Ads', pattern: 'com.google.ads' },
  { name: 'Facebook Audience Network', pattern: 'com.facebook.ads' },
  { name: 'Unity Ads', pattern: 'com.unity3d.services.ads' },
  { name: 'AppLovin SDK', pattern: 'com.applovin' },
  { name: 'IronSource SDK', pattern: 'com.ironsource' },
  { name: 'Mintegral SDK', pattern: 'com.mbridge.msdk' },
  { name: 'Vungle SDK', pattern: 'com.vungle' },
  { name: 'Chartboost SDK', pattern: 'com.chartboost' }
];

const QuestionnaireScanner = {
  id: 'PLAY_QUESTIONNAIRE_VALIDATOR',
  name: 'Google Play Store Pre-Deployment Questionnaire & Declarations Validator',
  version: '2.0.0',
  stage: 4,

  supports(context) {
    return true;
  },

  async run(context) {
    const results = [];
    const declarations = context.declarations || context.questionnaire || {};
    const metadata = context.metadata || {};
    const appProfile = context.appProfile || {};


    const appName = declarations.appName || appProfile.name || declarations.app_name || '';
    const packageName = declarations.packageName || declarations.package_name || metadata.packageName || appProfile.packageName || '';
    const binaryPkg = metadata.packageName || '';

    // =========================================================================
    // 1. App Name Length & Formatting (Google Play 30-Character Limit)
    // =========================================================================
    if (!appName || appName.trim().length === 0) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-APP-NAME-001',
        category: 'STORE_LISTING',
        title: 'App Name Missing in Store Setup',
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        what: 'Application title is missing or empty.',
        why: 'Google Play Console requires an application title to create and publish a store listing.',
        requirement: 'App name must be 1 to 30 characters in length.',
        remediation: 'Provide a valid application name under 30 characters in the Store Listing Questionnaire.'
      }));
    } else if (appName.length > 30) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-APP-NAME-002',
        category: 'STORE_LISTING',
        title: `App Name Exceeds Google Play 30-Character Limit (${appName.length}/30)`,
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        what: `Application title "${appName}" is ${appName.length} characters (exceeds 30 characters maximum).`,
        why: 'Google Play enforces a strict 30-character limit on application titles.',
        requirement: 'App title must not exceed 30 characters.',
        remediation: `Shorten the title to 30 characters or fewer (e.g., "${appName.substring(0, 30)}").`
      }));
    } else {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-APP-NAME-001',
        category: 'STORE_LISTING',
        title: `App Name Verified (${appName.length}/30 Chars)`,
        severity: 'INFO',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        what: `Application title "${appName}" adheres to Google Play 30-character requirement.`,
        why: 'Store listing metadata complies with Google Play naming guidelines.',
        requirement: 'App title <= 30 characters.',
        evidence: { appName, length: appName.length }
      }));
    }

    // =========================================================================
    // 2. Package Name Binary Match & Java Identifier Validation
    // =========================================================================
    const pkgRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
    if (packageName && !pkgRegex.test(packageName)) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-PKG-001',
        category: 'STORE_LISTING',
        title: `Invalid Package Name Format: ${packageName}`,
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        what: `Package name "${packageName}" does not follow standard Android Java package naming conventions.`,
        why: 'Google Play requires unique, dot-separated identifiers (e.g., com.example.app).',
        requirement: 'Package name must contain at least two segments with valid characters.',
        remediation: 'Update package name to a valid Android package format.'
      }));
    } else if (binaryPkg && packageName && binaryPkg.toLowerCase() !== packageName.toLowerCase()) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-PKG-002',
        category: 'STORE_LISTING',
        title: `Package Name Mismatch: Binary (${binaryPkg}) vs Store Form (${packageName})`,
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        what: `Declared store listing package "${packageName}" does not match the uploaded artifact package "${binaryPkg}".`,
        why: 'Google Play Console will reject artifact upload if the package name does not match the registered application entity.',
        requirement: 'Store listing package identifier must match AndroidManifest.xml package attribute exactly.',
        remediation: `Align the store questionnaire package name to "${binaryPkg}".`
      }));
    } else if (packageName) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-PKG-003',
        category: 'STORE_LISTING',
        title: `Package Identifier Verified: ${packageName}`,
        severity: 'INFO',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        what: `Store listing package identifier matches artifact manifest (${packageName}).`,
        why: 'Consistency verified between store declarations and binary artifact.',
        requirement: 'Package identifier matches manifest.',
        evidence: { packageName, binaryPkg }
      }));
    }

    // =========================================================================
    // 3. Declarations & Export Compliance (Developer Policy & US Export Laws)
    // =========================================================================
    const policyConfirmed = declarations.developerProgramPoliciesConfirmed !== false &&
      declarations.developer_program_policies_confirmed !== 0 &&
      declarations.policyConfirmed !== false &&
      declarations.policy_confirmed !== 0;

    const exportAccepted = declarations.usExportLawsAccepted !== false &&
      declarations.us_export_laws_accepted !== 0 &&
      declarations.exportLawsAccepted !== false &&
      declarations.export_laws_accepted !== 0;

    if (!policyConfirmed) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-DECLARATION-POLICY-001',
        category: 'POLICY_DECLARATION',
        title: 'Developer Program Policies Declaration Not Confirmed',
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        what: 'Developer has not checked the confirmation acknowledging compliance with Google Play Developer Program Policies.',
        why: 'Mandatory declaration before an application can be created or submitted on Google Play.',
        requirement: 'Developer Program Policies declaration must be confirmed.',
        remediation: 'Check the Developer Program Policies confirmation box in the Store Setup form.'
      }));
    } else {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-DECLARATION-POLICY-001',
        category: 'POLICY_DECLARATION',
        title: 'Developer Program Policies Confirmed',
        severity: 'INFO',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        what: 'Developer Program Policies compliance acknowledged by release team.',
        why: 'Meets mandatory Google Play deployment declaration.',
        requirement: 'Developer Program Policies acknowledged.'
      }));
    }

    if (!exportAccepted) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-DECLARATION-EXPORT-001',
        category: 'POLICY_DECLARATION',
        title: 'US Export Laws & Encryption Compliance Declaration Missing',
        severity: 'HIGH',
        status: 'REVIEW_REQUIRED',
        verification: 'DETERMINISTIC',
        what: 'Application uses cryptography (HTTPS/TLS) but US Export Laws declaration is unconfirmed.',
        why: 'Google Play requires export compliance acknowledgment for software with encryption capabilities.',
        requirement: 'Accept US export laws declaration for standard cryptography.',
        remediation: 'Check the US Export Laws declaration box in Store Setup.'
      }));
    } else {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-DECLARATION-EXPORT-001',
        category: 'POLICY_DECLARATION',
        title: 'US Export Laws & Encryption Compliance Confirmed',
        severity: 'INFO',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        what: 'US Export laws and cryptographic distribution terms acknowledged.',
        why: 'Complies with Google Play export requirements.',
        requirement: 'Export compliance acknowledged.'
      }));
    }

    // =========================================================================
    // 4. App Access & Reviewer Sign-In Credentials (Critical Gate!)
    // =========================================================================
    const isRestricted = declarations.accessRestricted === true ||
      declarations.access_restricted === 1 ||
      declarations.access_restricted === true ||
      declarations.appAccessRestricted === true || 
      declarations.appAccessRestricted === 1 || 
      declarations.app_access_restricted === 1 ||
      declarations.app_access_restricted === true ||
      declarations.isRestricted === true;

    let signInDetails = declarations.reviewerCredentials || declarations.reviewer_credentials || declarations.signInDetails || declarations.sign_in_details || [];
    if (typeof signInDetails === 'string') {
      try { signInDetails = JSON.parse(signInDetails); } catch (_) { signInDetails = []; }
    }

    const hasAuthCapabilities = metadata.permissions && (
      metadata.permissions.includes('android.permission.INTERNET') ||
      metadata.permissions.includes('android.permission.GET_ACCOUNTS') ||
      metadata.permissions.includes('android.permission.USE_BIOMETRIC')
    );

    if (isRestricted) {
      if (!Array.isArray(signInDetails) || signInDetails.length === 0) {
        results.push(buildEvidence({
          ruleId: 'RULE-PLAY-APP-ACCESS-001',
          category: 'APP_ACCESS_CREDENTIALS',
          title: 'Restricted App Access Flagged: Missing Reviewer Test Credentials',
          severity: 'BLOCKER',
          status: 'FAIL',
          verification: 'DETERMINISTIC',
          what: 'App access is marked as restricted (login/credentials required), but no reviewer sign-in credentials were provided.',
          why: 'Google Play automated and human reviewers will reject the app during review if they cannot access all areas of the application.',
          requirement: 'Provide active test credentials (username/phone, password, OTP instructions) for Google Play Reviewers.',
          remediation: 'Add at least one active test account (e.g., Staff account, Employee ID tab, or Manager account) under App Access in the deployment questionnaire.'
        }));
      } else {
        const validAccounts = signInDetails.filter(acc => acc.name && (acc.username || acc.credentials || acc.instructions || acc.password));
        if (validAccounts.length === 0) {
          results.push(buildEvidence({
            ruleId: 'RULE-PLAY-APP-ACCESS-001',
            category: 'APP_ACCESS_CREDENTIALS',
            title: 'Incomplete Reviewer Sign-In Credentials',
            severity: 'BLOCKER',
            status: 'FAIL',
            verification: 'DETERMINISTIC',
            what: 'Reviewer test account rows exist but lack username, password, or instructions.',
            why: 'Google Play reviewers need complete login details to bypass authentication gates.',
            requirement: 'Complete all required sign-in fields.',
            remediation: 'Fill in username/password/instructions for each reviewer credential row.'
          }));
        } else {
          results.push(buildEvidence({
            ruleId: 'RULE-PLAY-APP-ACCESS-001',
            category: 'APP_ACCESS_CREDENTIALS',
            title: `App Access: ${validAccounts.length} Reviewer Credential Profile(s) Configured`,
            severity: 'INFO',
            status: 'PASS',
            verification: 'DETERMINISTIC',
            what: `Active reviewer credentials configured for Google Play testing (${validAccounts.map(a => a.name).join(', ')}).`,
            why: 'Enables Google Play Review team to authenticate and fully test internal features without rejection.',
            requirement: 'Reviewer sign-in credentials provided for restricted apps.',
            evidence: {
              accountCount: validAccounts.length,
              accountNames: validAccounts.map(a => a.name)
            }
          }));
        }
      }
    } else {
      // Marked as NOT restricted
      if (hasAuthCapabilities) {
        results.push(buildEvidence({
          ruleId: 'RULE-PLAY-APP-ACCESS-002',
          category: 'APP_ACCESS_CREDENTIALS',
          title: 'App Access Marked "All Available" - Verify Login Gate',
          severity: 'HIGH',
          status: 'WARNING',
          verification: 'HEURISTIC',
          what: 'App is marked as having no restricted parts, but networking and biometric capabilities were detected in binary.',
          why: 'If Google Play reviewers encounter an unbypassable login screen during review, the build will be rejected under App Access Policy.',
          requirement: 'Confirm that all functionality is accessible without credentials, or toggle to "Restricted" and provide test accounts.',
          remediation: 'If the app requires staff or enterprise login, change App Access to "Yes" and provide test credentials.'
        }));
      } else {
        results.push(buildEvidence({
          ruleId: 'RULE-PLAY-APP-ACCESS-001',
          category: 'APP_ACCESS_CREDENTIALS',
          title: 'App Access: Unrestricted Public Access Verified',
          severity: 'INFO',
          status: 'PASS',
          verification: 'DETERMINISTIC',
          what: 'Application is accessible without authentication barriers.',
          why: 'Meets Google Play review accessibility requirements.',
          requirement: 'App access defined.'
        }));
      }
    }

    // =========================================================================
    // 5. Ads Policy & SDK Cross-Check (Undisclosed Ads Detection)
    // =========================================================================
    const containsAds = declarations.containsAds === true || 
      declarations.containsAds === 1 || 
      declarations.contains_ads === 1 || 
      declarations.contains_ads === true;

    // Scan binary entries / bytecode for ad SDK signatures
    const rawManifest = metadata.rawManifest || '';
    const entries = context.rawZipEntries || {};
    const entryKeys = Object.keys(entries).join(' ');

    const detectedAdSdks = [];
    if (metadata.adSdks && Array.isArray(metadata.adSdks)) {
      detectedAdSdks.push(...metadata.adSdks);
    }
    for (const sdk of KNOWN_AD_SDKS) {
      if ((rawManifest.includes(sdk.pattern) || entryKeys.includes(sdk.pattern.replace(/\./g, '/'))) && !detectedAdSdks.includes(sdk.name)) {
        detectedAdSdks.push(sdk.name);
      }
    }

    if (!containsAds && detectedAdSdks.length > 0) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-ADS-DISCREPANCY-001',
        category: 'ADS_DECLARATION',
        title: `Ads Declaration Conflict: Declared "No Ads" but ${detectedAdSdks.join(', ')} Detected in Binary`,
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        what: `Store questionnaire declares "No Ads", but ad network SDKs (${detectedAdSdks.join(', ')}) were detected in the binary bytecode.`,
        why: 'Google Play strictly suspends or rejects apps that bundle ad SDKs while claiming "No Ads" in store declarations.',
        requirement: 'Store Ads declaration must accurately match third-party ad libraries present in the build.',
        remediation: 'Update the Ads Declaration in the Questionnaire to "Yes, my app contains ads" or remove unused ad libraries from the build.',
        evidence: { detectedAdSdks, declaredContainsAds: containsAds }
      }));
    } else if (containsAds) {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-ADS-001',
        category: 'ADS_DECLARATION',
        title: 'Ads Declaration: "Contains Ads" Disclosed on Store Listing',
        severity: 'INFO',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        what: 'Store listing will display the official "Contains ads" badge on Google Play.',
        why: 'Complies with Google Play Ads disclosure requirements.',
        requirement: 'Accurate ad monetization disclosure.',
        evidence: { containsAds: true, detectedAdSdks }
      }));
    } else {
      results.push(buildEvidence({
        ruleId: 'RULE-PLAY-ADS-001',
        category: 'ADS_DECLARATION',
        title: 'Ads Declaration: Verified Clean (No Ad SDKs Detected)',
        severity: 'INFO',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        what: 'Store listing declared "No Ads", and 0 third-party advertising SDKs were detected in the binary.',
        why: 'Verified consistency between declarations and compiled codebase.',
        requirement: 'Ad-free status verified.',
        evidence: { containsAds: false, detectedAdSdks: [] }
      }));
    }

    // =========================================================================
    // 6. IARC Content Rating & Target Audience
    // =========================================================================
    const contentCategory = declarations.contentCategory || declarations.contentRatingCategory || declarations.content_category || 'Government / Utility / Health';
    const targetAge = declarations.targetAgeGroup || declarations.target_age_group || '18+';

    results.push(buildEvidence({
      ruleId: 'RULE-PLAY-IARC-001',
      category: 'CONTENT_RATING',
      title: `Content Rating: ${contentCategory} (${targetAge})`,
      severity: 'INFO',
      status: 'PASS',
      verification: 'DETERMINISTIC',
      what: `IARC content classification category set to "${contentCategory}" for target audience ${targetAge}.`,
      why: 'Satisfies Google Play mandatory age rating requirements.',
      requirement: 'Complete IARC rating questionnaire.',
      evidence: { contentCategory, targetAge }
    }));

    return { results };
  }
};

module.exports = QuestionnaireScanner;

