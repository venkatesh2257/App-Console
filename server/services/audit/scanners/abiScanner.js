/**
 * 64-Bit Architecture Scanner (Stage 2)
 * Evaluates whether 64-bit ABIs are present when native libraries are bundled.
 */

const { buildEvidence } = require('../evidence/evidenceBuilder');
const { getPolicyRule } = require('../policies/policyRegistry');

const AbiScanner = {
  id: 'ABI_64BIT_VALIDATOR',
  name: '64-Bit Architecture Native Code Scanner',
  version: '2.0.0',
  stage: 2,

  supports(context) {
    return context.metadata && context.metadata.abis !== undefined;
  },

  async run(context) {
    const results = [];
    const rule = getPolicyRule('ANDROID-64BIT-001');
    const abis = context.metadata.abis || [];
    const has32Bit = abis.some(abi => abi === 'armeabi-v7a' || abi === 'x86');
    const has64Bit = abis.some(abi => abi === 'arm64-v8a' || abi === 'x86_64');

    if (abis.length === 0) {
      results.push(buildEvidence({
        ruleId: rule.ruleId,
        category: rule.category,
        title: '64-Bit Requirement: No Native Code',
        severity: 'INFO',
        status: 'NOT_APPLICABLE',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: 'Application does not contain native C/C++ libraries.',
        where: 'lib/ directory',
        why: '64-bit requirement applies strictly to applications bundling native binaries.',
        source: rule.source.url,
        requirement: '64-bit ABIs required only when native libraries are bundled.',
        evidence: {
          hasNativeCode: false,
          abis: []
        }
      }));
      return { results };
    }

    if (has64Bit) {
      results.push(buildEvidence({
        ruleId: rule.ruleId,
        category: rule.category,
        title: `64-Bit Support Cleared (ABIs: ${abis.join(', ')})`,
        severity: 'BLOCKER',
        status: 'PASS',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: `Application bundles 64-bit architecture binaries (${abis.filter(a => a.includes('64')).join(', ')}).`,
        where: 'lib/arm64-v8a, lib/x86_64',
        why: 'Fulfills Google Play mandatory 64-bit requirement for all native-code apps.',
        source: rule.source.url,
        requirement: 'Must include 64-bit variant (arm64-v8a/x86_64) for any 32-bit native code.',
        evidence: {
          detectedAbis: abis,
          has64Bit: true,
          has32Bit
        }
      }));
    } else {
      results.push(buildEvidence({
        ruleId: rule.ruleId,
        category: rule.category,
        title: '64-Bit Architecture Missing (32-bit Only Detected)',
        severity: 'BLOCKER',
        status: 'FAIL',
        verification: 'DETERMINISTIC',
        verificationLevel: 'FULL',
        what: 'Application bundles only 32-bit native code with no 64-bit (arm64-v8a/x86_64) equivalents.',
        where: `lib/ (${abis.join(', ')})`,
        why: 'Google Play blocks releases that bundle 32-bit native code without 64-bit support.',
        source: rule.source.url,
        requirement: 'Every 32-bit native library must have a corresponding 64-bit build.',
        remediation: 'Configure ndk.abiFilters "armeabi-v7a", "arm64-v8a", "x86_64" in app/build.gradle.',
        evidence: {
          detectedAbis: abis,
          has64Bit: false,
          has32Bit: true
        }
      }));
    }

    return { results };
  }
};

module.exports = AbiScanner;
