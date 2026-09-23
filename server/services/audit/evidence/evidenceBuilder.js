/**
 * Standardized Evidence Builder
 * Creates immutable, canonical evidence records for all static, heuristic, dynamic, and policy checks.
 */

const { getPolicyVersion } = require('../policies/policyRegistry');

function buildEvidence({
  ruleId,
  category,
  title,
  severity = 'BLOCKER', // BLOCKER | HIGH | WARNING | INFO
  status = 'PASS',       // PASS | FAIL | WARNING | REVIEW_REQUIRED | NOT_APPLICABLE | NOT_VERIFIED | ERROR
  verification = 'DETERMINISTIC', // DETERMINISTIC | STATIC | DYNAMIC | HEURISTIC | HUMAN | NOT_VERIFIED
  verificationLevel = 'FULL',     // FULL | PARTIAL | HEURISTIC | UNVERIFIED
  confidence = 'HIGH',            // HIGH | MEDIUM | LOW
  what,
  where,
  why,
  source = 'Google Play Policy',
  requirement,
  remediation = null,
  evidence = {},
  scannerVersion = '2.0.0'
}) {
  return {
    ruleId,
    category,
    title: title || what,
    severity,
    status,
    verification,
    verificationLevel,
    confidence,
    what,
    where: where || 'AAB/APK Artifact',
    why,
    source,
    requirement,
    remediation,
    evidence,
    policyVersion: getPolicyVersion(),
    scannerVersion,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  buildEvidence
};
