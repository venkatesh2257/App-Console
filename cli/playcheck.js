#!/usr/bin/env node

/**
 * Enterprise Google Play Release Gate CLI Platform (V2)
 * Usage:
 *   playcheck validate --bundle <file.aab|file.apk> [--app <appId>] [--source <dir>] [--policy <url>] [--ci] [--json]
 */

const fs = require('fs');
const path = require('path');
const ReleaseGateEngine = require('../server/services/audit/engine');
const { getAppProfile } = require('../server/services/audit/appRegistry/appRegistry');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║        GOOGLE PLAY RELEASE READINESS & PRE-SUBMISSION RELEASE GATE (V2)      ║
╚══════════════════════════════════════════════════════════════════════════════╝

Usage:
  node cli/playcheck.js validate --bundle <path-to-aab-or-apk> [options]
  node cli/playcheck.js validate <path-to-aab-or-apk> [options]

Options:
  --bundle <path>       Path to compiled Android App Bundle (.aab) or APK package
  --app <appId>         Registered organization app identifier (e.g. btgs, bh1962, ops108, citizen104)
  --source <path>       Path to source directory or zip for full R8/Gradle verification
  --policy <url|path>   Override privacy policy URL or local document path (defaults to App Registry)
  --ci                  Enable strict CI/CD gate mode
  --json                Output canonical machine-readable JSON release report
  --help                Show this help message

Exit Codes:
  0 = READY             All release gates cleared & human sign-offs satisfied
  1 = BLOCKED           Deterministic technical release blockers detected
  2 = REVIEW_REQUIRED   Policy review / core functionality justification needed
  3 = VALIDATION_ERROR  Binary parsing / artifact format validation failure
  4 = CONFIG_ERROR      Invalid arguments or missing file
`);
    process.exit(0);
  }

  if (command !== 'validate') {
    console.error(`❌ Unknown command "${command}". Use "validate" to inspect a build.`);
    process.exit(4);
  }

  let bundlePath = null;
  let appId = null;
  let sourcePath = null;
  let policyUrl = null;
  let isCi = false;
  let isJson = false;

  // Parse positional or flag-based arguments
  for (let i = 1; i < args.length; i++) {
    if ((args[i] === '--bundle' || args[i] === '-b') && args[i + 1]) {
      bundlePath = args[i + 1];
      i++;
    } else if ((args[i] === '--app' || args[i] === '-a') && args[i + 1]) {
      appId = args[i + 1];
      i++;
    } else if ((args[i] === '--source' || args[i] === '-s') && args[i + 1]) {
      sourcePath = args[i + 1];
      i++;
    } else if ((args[i] === '--policy' || args[i] === '-p') && args[i + 1]) {
      policyUrl = args[i + 1];
      i++;
    } else if (args[i] === '--ci') {
      isCi = true;
    } else if (args[i] === '--json') {
      isJson = true;
    } else if (!bundlePath && !args[i].startsWith('-')) {
      bundlePath = args[i];
    }
  }

  if (!bundlePath) {
    console.error('❌ Error: Missing required argument --bundle <path>');
    process.exit(4);
  }

  if (!fs.existsSync(bundlePath)) {
    console.error(`❌ Error: Bundle file not found at: "${bundlePath}"`);
    process.exit(4);
  }

  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(bundlePath);
  } catch (readErr) {
    console.error(`❌ Validation Error: Could not read file: ${readErr.message}`);
    process.exit(3);
  }

  const fileName = path.basename(bundlePath);

  // Execute Master 7-Stage Release Gate Engine
  let report;
  try {
    report = await ReleaseGateEngine.runMasterAudit({
      fileBuffer,
      filePath: bundlePath,
      fileName,
      appId,
      sourcePath,
      policyUrl
    });
  } catch (err) {
    console.error(`❌ Internal Pipeline Error: ${err.message}`);
    process.exit(3);
  }

  // Handle JSON Output Mode
  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.verdictCode !== undefined ? report.verdictCode : (report.verdict === 'READY' ? 0 : 1));
  }

  // Human-Readable Console Output
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║              GOOGLE PLAY RELEASE READINESS GATE REPORT (V2)                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
  console.log(`📦 Application:     ${report.application ? report.application.name : 'Unknown'} (${report.application ? report.application.packageName : 'N/A'})`);
  console.log(`🔖 Version:         v${report.application ? report.application.versionName : '1.0'} (Code: ${report.application ? report.application.versionCode : 1})`);
  console.log(`🎯 Target SDK:      API ${report.application ? report.application.targetSdk : 'N/A'} (Min: API ${report.application ? report.application.minSdk : 'N/A'})`);
  console.log(`🔑 SHA-256 Hash:    ${(report.application && report.application.artifactHash) ? report.application.artifactHash.substring(0, 32) : 'N/A'}...`);
  console.log(`📜 Policy Version:  ${report.policyVersion || '2026.09'}`);
  console.log(`────────────────────────────────────────────────────────────────────────────────`);

  let verdictBanner = '';
  if (report.verdict === 'READY') {
    verdictBanner = `\x1b[32m🟢 RELEASE READY (Score: ${report.complianceScore}%)\x1b[0m`;
  } else if (report.verdict === 'REVIEW_REQUIRED') {
    verdictBanner = `\x1b[33m🟠 REVIEW REQUIRED (Score: ${report.complianceScore}%)\x1b[0m`;
  } else {
    verdictBanner = `\x1b[31m🔴 RELEASE BLOCKED (Score: ${report.complianceScore}%)\x1b[0m`;
  }

  console.log(`\n🏆 RELEASE DECISION: ${verdictBanner}`);
  console.log(`   ${report.verdictMessage}\n`);

  console.log(`📊 Statistics:`);
  console.log(`   🔴 Hard Blockers:      ${report.statistics ? report.statistics.blockers : 0}`);
  console.log(`   🟠 Review Required:    ${report.statistics ? report.statistics.high : 0}`);
  console.log(`   🟡 Warnings:           ${report.statistics ? report.statistics.warnings : 0}`);
  console.log(`   🟢 Passed:             ${report.statistics ? report.statistics.passed : 0}`);
  console.log(`   ⚪ Partially Verified: ${report.statistics ? report.statistics.notVerified : 0}\n`);

  console.log(`────────────────────────────────────────────────────────────────────────────────`);
  console.log(`🔍 EVIDENCE LOG:`);

  (report.evidenceList || []).forEach((item, idx) => {
    let icon = '🟢';
    if (item.status === 'FAIL') icon = '🔴';
    else if (item.status === 'REVIEW_REQUIRED') icon = '🟠';
    else if (item.status === 'WARNING') icon = '🟡';
    else if (item.status === 'NOT_VERIFIED') icon = '⚪';
    else if (item.status === 'NOT_APPLICABLE') icon = '⚪';

    console.log(` ${icon} [${item.ruleId || 'CHECK'}] ${item.title || item.what}`);
    if (item.why && item.status !== 'PASS') {
      console.log(`    ↳ Reason: ${item.why}`);
    }
    if (item.remediation) {
      console.log(`    ↳ Fix:    ${item.remediation}`);
    }
  });

  if (report.delta && report.delta.hasBaseline) {
    console.log(`\n────────────────────────────────────────────────────────────────────────────────`);
    console.log(`📈 RELEASE-TO-RELEASE DELTA:`);
    report.delta.deltas.forEach(d => {
      console.log(`   • [${d.type}] ${d.title}: ${d.description}`);
    });
  }

  console.log(`\n════════════════════════════════════════════════════════════════════════════════\n`);

  // Exit with standardized gate code
  const exitCode = report.verdictCode !== undefined ? report.verdictCode : (report.verdict === 'READY' ? 0 : 1);
  process.exit(exitCode);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(3);
});
