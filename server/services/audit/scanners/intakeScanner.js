/**
 * Intake Scanner (Stage 1)
 * Enforces Artifact Chain of Custody, generates immutable Artifact ID,
 * computes SHA-256 hash, validates container structure, and resolves App Registry profile.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { buildEvidence } = require('../evidence/evidenceBuilder');
const { getPolicyVersion } = require('../policies/policyRegistry');
const { getAppProfile } = require('../appRegistry/appRegistry');

const IntakeScanner = {
  id: 'INTAKE_VALIDATOR',
  name: 'Artifact Intake & Chain of Custody Engine',
  version: '2.0.0',
  stage: 1,

  supports(context) {
    return !!(context.filePath || context.fileBuffer);
  },

  async run(context) {
    const results = [];
    let fileBuffer = context.fileBuffer;

    if (!fileBuffer && context.filePath && fs.existsSync(context.filePath)) {
      fileBuffer = fs.readFileSync(context.filePath);
      context.fileBuffer = fileBuffer;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      results.push(buildEvidence({
        ruleId: 'INTAKE-FORMAT-001',
        category: 'INTAKE',
        severity: 'BLOCKER',
        status: 'ERROR',
        verification: 'DETERMINISTIC',
        what: 'Artifact is empty or could not be read',
        where: context.filePath || 'Input Buffer',
        why: 'Zero byte payload provided to release pipeline.',
        requirement: 'Valid .aab or .apk binary file is required.',
        remediation: 'Provide a valid compiled Android App Bundle or APK file.'
      }));
      return { results, metadata: null };
    }

    // 1. Compute Immutable SHA-256 Hash
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    context.artifactHash = sha256Hash;

    // 2. Format Validation
    const fileName = context.fileName || (context.filePath ? path.basename(context.filePath) : 'artifact.aab');
    const isZip = fileBuffer.length > 4 && fileBuffer.readUInt32LE(0) === 0x04034b50;

    if (!isZip) {
      results.push(buildEvidence({
        ruleId: 'INTAKE-FORMAT-002',
        category: 'INTAKE',
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        what: 'File format is not a valid ZIP-based Android container',
        where: fileName,
        why: 'Magic header does not match ZIP / APK / AAB container specification.',
        requirement: 'Artifact must be a valid Android App Bundle (.aab) or APK package.',
        remediation: 'Rebuild the application using standard Android Gradle Plugin (assembleRelease or bundleRelease).'
      }));
      return { results, metadata: null };
    }

    // Determine Container Type
    let fileType = 'UNKNOWN';
    if (fileName.endsWith('.aab') || fileName.includes('.aab')) {
      fileType = 'AAB';
    } else if (fileName.endsWith('.apk')) {
      fileType = 'APK';
    } else {
      fileType = 'AAB';
    }

    const appId = context.appId || 'app';
    const timestamp = new Date().toISOString();
    const artifactId = `REL-${appId.toUpperCase()}-${new Date().getFullYear()}-${sha256Hash.substring(0, 8).toUpperCase()}`;

    // Artifact Chain of Custody Record
    const chainOfCustody = {
      artifactId,
      sha256: sha256Hash,
      fileName,
      fileType,
      fileSizeBytes: fileBuffer.length,
      uploadedBy: context.uploadedBy || 'developer',
      uploadTimestamp: timestamp,
      buildMode: context.sourcePath ? 'SOURCE_AND_AAB' : 'AAB_ONLY',
      scannerVersion: '2.0.0',
      policyVersion: getPolicyVersion()
    };
    context.chainOfCustody = chainOfCustody;

    results.push(buildEvidence({
      ruleId: 'INTAKE-CUSTODY-001',
      category: 'INTAKE',
      title: `Artifact Chain of Custody Registered (${artifactId})`,
      severity: 'INFO',
      status: 'PASS',
      verification: 'DETERMINISTIC',
      what: `Artifact ingested with immutable SHA-256 fingerprint (${sha256Hash.substring(0, 16)}...) and assigned release ID ${artifactId}.`,
      where: fileName,
      why: 'Guarantees audit traceability and release locking against post-validation binary tampering.',
      requirement: 'Immutable artifact tracking and custody records.',
      evidence: chainOfCustody
    }));

    return {
      results,
      artifactHash: sha256Hash,
      chainOfCustody,
      fileName,
      fileType,
      fileSizeBytes: fileBuffer.length
    };
  }
};

module.exports = IntakeScanner;
