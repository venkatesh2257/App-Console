/**
 * Release Gate Verdict Engine (Stage 6)
 * The sole authoritative arbiter for release readiness decisions.
 * Evaluates all accumulated evidence, enforces precedence (BLOCKED > REVIEW_REQUIRED > READY),
 * tracks human confirmations, and generates compliance statistics.
 */

const VerdictEngine = {
  evaluate({ evidenceList = [], delta = null, humanSignoffs = {} }) {
    let blockersCount = 0;
    let highCount = 0;
    let warningsCount = 0;
    let passedCount = 0;
    let notApplicableCount = 0;
    let notVerifiedCount = 0;
    let errorCount = 0;

    const blockingItems = [];
    const reviewRequiredItems = [];

    // Analyze every evidence item
    evidenceList.forEach(item => {
      if (item.status === 'FAIL') {
        if (item.severity === 'BLOCKER') {
          blockersCount++;
          blockingItems.push(item);
        } else if (item.severity === 'HIGH') {
          highCount++;
          reviewRequiredItems.push(item);
        } else {
          warningsCount++;
        }
      } else if (item.status === 'ERROR' || item.status === 'ENGINE_ERROR') {
        errorCount++;
        if (item.severity === 'BLOCKER') {
          blockersCount++;
          blockingItems.push(item);
        } else {
          highCount++;
          reviewRequiredItems.push(item);
        }
      } else if (item.status === 'REVIEW_REQUIRED') {
        // Check if human signoff already approved this specific item
        const isApproved = humanSignoffs && humanSignoffs[item.ruleId] && humanSignoffs[item.ruleId].approved === true;
        if (!isApproved) {
          highCount++;
          reviewRequiredItems.push(item);
        } else {
          passedCount++;
        }
      } else if (item.status === 'WARNING') {
        warningsCount++;
      } else if (item.status === 'PASS') {
        passedCount++;
      } else if (item.status === 'NOT_APPLICABLE') {
        notApplicableCount++;
      } else if (item.status === 'NOT_VERIFIED') {
        notVerifiedCount++;
      }
    });

    // Delta blocking items
    if (delta && delta.deltas) {
      delta.deltas.forEach(d => {
        if (d.severity === 'BLOCKER') {
          blockersCount++;
          blockingItems.push({
            ruleId: `DELTA-${d.type}`,
            title: d.title,
            why: d.description,
            remediation: d.remediation,
            severity: 'BLOCKER',
            status: 'FAIL'
          });
        } else if (d.severity === 'HIGH' && d.requiresJustification) {
          const isJustified = humanSignoffs && humanSignoffs[`DELTA-${d.type}`] && humanSignoffs[`DELTA-${d.type}`].approved === true;
          if (!isJustified) {
            highCount++;
            reviewRequiredItems.push({
              ruleId: `DELTA-${d.type}`,
              title: d.title,
              why: d.description,
              severity: 'HIGH',
              status: 'REVIEW_REQUIRED'
            });
          }
        }
      });
    }

    // Determine Authoritative Verdict
    let verdict = 'READY';
    let verdictCode = 0; // 0 = READY, 1 = BLOCKED, 2 = REVIEW_REQUIRED, 3 = INVALID
    let verdictMessage = '';

    if (errorCount > 0 && blockersCount > 0 && passedCount === 0) {
      verdict = 'INVALID';
      verdictCode = 3;
      verdictMessage = 'Artifact or scan input configuration is invalid.';
    } else if (blockersCount > 0) {
      verdict = 'BLOCKED';
      verdictCode = 1;
      verdictMessage = `${blockersCount} Hard Technical Release Blockers detected. Immediate Google Play rejection risk.`;
    } else if (reviewRequiredItems.length > 0) {
      verdict = 'REVIEW_REQUIRED';
      verdictCode = 2;
      verdictMessage = `${reviewRequiredItems.length} items require human policy review, core functionality justification, or manual sign-off before release.`;
    } else {
      verdict = 'READY';
      verdictCode = 0;
      verdictMessage = 'All automated release gates cleared and required policy confirmations satisfied. Eligible for Play Console submission.';
    }

    // Calculate normalized compliance score
    const totalScorable = passedCount + blockersCount + highCount + warningsCount;
    const score = totalScorable > 0 
      ? Math.max(0, Math.round(((passedCount + (warningsCount * 0.5)) / totalScorable) * 100))
      : 100;

    return {
      verdict,
      verdictCode,
      verdictMessage,
      score,
      statistics: {
        blockers: blockersCount,
        high: highCount,
        warnings: warningsCount,
        passed: passedCount,
        notApplicable: notApplicableCount,
        notVerified: notVerifiedCount,
        totalEvaluated: evidenceList.length
      },
      blockingItems,
      reviewRequiredItems,
      humanSignoffsCompleted: reviewRequiredItems.length === 0
    };
  }
};

module.exports = VerdictEngine;
