const fs = require("fs");
const path = require("path");

const {
  parseWorkbookImportState,
  prepareWorkbookImportState,
  mergeWorkbookSourceState,
  auditWorkbookMergeAgainstSource,
  auditMergePreservation,
  auditPersistedMergeState
} = require("../server");

const workbookPath = path.resolve(
  process.argv[2] || "SQ02_UAT_Squad2_QuanLy_US_Date-new-26.7.xlsx"
);
const backupPath = path.resolve(
  process.argv[3]
  || "import/backups/production-state-pre-26-7-2026-07-26T14-24-03-048Z.json"
);
const expectedNewUserStories = ["PS0142025-10534", "PS0142025-10515"];
const expectedNewDefects = [
  "PS0142025-10631",
  "PS0142025-10569",
  "PS0142025-10559",
  "PS0142025-10556",
  "PS0142025-10376",
  "PS0142025-10370",
  "PS0142025-10285",
  "PS0142025-10283",
  "PS0142025-10282",
  "PS0142025-10279"
];

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function main() {
  assertFile(workbookPath);
  assertFile(backupPath);

  const backupDocument = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  const existingState = backupDocument.state || backupDocument;
  const workbookBuffer = fs.readFileSync(workbookPath);
  const importState = await parseWorkbookImportState(workbookBuffer);
  const importedAt = "2026-07-26T00:00:00.000Z";
  prepareWorkbookImportState(importState, importedAt);
  const merged = mergeWorkbookSourceState(existingState, importState, { importedAt });
  const goldenAudit = await auditWorkbookMergeAgainstSource(workbookBuffer, merged.state);
  const preservationAudit = auditMergePreservation(existingState, merged.state);
  const persistenceAudit = auditPersistedMergeState(
    merged.state,
    JSON.parse(JSON.stringify(merged.state))
  );

  assertEqual("userStories count", 86, merged.state.userStories.length);
  assertEqual("bugSources count", 74, merged.state.bugSources.length);
  assertEqual("defects count", 74, merged.state.defects.length);
  assertEqual("daily count", 43, merged.state.daily.length);
  assertEqual("defectSummary count", 77, merged.state.defectSummary.length);
  assertEqual("preserved manual daily", 6, merged.summary.daily.preservedManual);
  assertEqual(
    "workItems count",
    existingState.workItems.length,
    merged.state.workItems.length
  );
  assertEqual(
    "workCategories count",
    existingState.workCategories.length,
    merged.state.workCategories.length
  );
  assertTrue("golden workbook audit", goldenAudit.ok, goldenAudit.mismatches);
  assertTrue("preservation audit", preservationAudit.ok, preservationAudit.mismatches);
  assertTrue("persistence audit", persistenceAudit.ok, persistenceAudit.mismatches);

  assertExactAdditions(
    "DS_US",
    existingState.userStories,
    importState.userStories,
    "issueKey",
    expectedNewUserStories
  );
  assertExactAdditions(
    "DS.Loi",
    existingState.bugSources,
    importState.bugSources,
    "issueKey",
    expectedNewDefects
  );
  assertExactAdditions(
    "DEFECT_LOG",
    existingState.defects,
    importState.defects,
    "bugId",
    expectedNewDefects
  );

  const mergedBugSources = byKey(merged.state.bugSources, "issueKey");
  for (const existing of existingState.bugSources) {
    const next = mergedBugSources.get(normalizeKey(existing.issueKey));
    assertTrue(`bug source retained: ${existing.issueKey}`, Boolean(next));
    for (const field of ["created", "updated", "dueDate"]) {
      if (!existing[field]) continue;
      assertEqual(
        `bug source ${existing.issueKey}.${field}`,
        existing[field],
        next[field]
      );
    }
  }

  const mergedDefects = byKey(merged.state.defects, "bugId");
  const existingDefects = byKey(existingState.defects, "bugId");
  for (const bugId of expectedNewDefects) {
    const defect = mergedDefects.get(normalizeKey(bugId));
    assertTrue(`new defect exists: ${bugId}`, Boolean(defect));
    assertEqual(`new defect ${bugId}.foundDate`, "", defect.foundDate || "");
    assertEqual(`new defect ${bugId}.resolvedDate`, "", defect.resolvedDate || "");
    assertEqual(`new defect ${bugId}.note`, "", defect.note || "");
  }
  for (const [key, existing] of existingDefects.entries()) {
    const next = mergedDefects.get(key);
    assertTrue(`existing defect retained: ${existing.bugId}`, Boolean(next));
    for (const field of ["owner", "resolvedDate", "note"]) {
      assertEqual(
        `defect ${existing.bugId}.${field}`,
        existing[field] || "",
        next[field] || ""
      );
    }
  }

  console.log(JSON.stringify({
    ok: true,
    workbook: path.basename(workbookPath),
    baseline: path.basename(backupPath),
    counts: {
      userStories: merged.state.userStories.length,
      bugSources: merged.state.bugSources.length,
      defects: merged.state.defects.length,
      daily: merged.state.daily.length,
      defectSummary: merged.state.defectSummary.length,
      workItems: merged.state.workItems.length
    },
    additions: {
      userStories: expectedNewUserStories,
      defects: expectedNewDefects
    },
    carried: {
      bugSourceInvalidFields: merged.summary.bugSources.carriedInvalidFields,
      defectInvalidFields: merged.summary.defects.carriedInvalidFields,
      defectManualFields: merged.summary.defects.carriedDefectManualFields,
      dailyFields: merged.summary.daily.carriedFields,
      manualDailyRows: merged.summary.daily.preservedManual
    },
    goldenCheckedCells: goldenAudit.checkedCells
  }, null, 2));
}

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
}

function assertExactAdditions(label, beforeRows, afterRows, field, expected) {
  const before = new Set(beforeRows.map((row) => normalizeKey(row[field])).filter(Boolean));
  const additions = afterRows
    .map((row) => String(row[field] || "").trim())
    .filter((value) => value && !before.has(normalizeKey(value)))
    .sort();
  const expectedSorted = [...expected].sort();
  assertEqual(`${label} additions`, JSON.stringify(expectedSorted), JSON.stringify(additions));
}

function byKey(rows, field) {
  return new Map(rows
    .map((row) => [normalizeKey(row[field]), row])
    .filter(([key]) => key));
}

function normalizeKey(value) {
  return String(value || "").trim().toLocaleLowerCase("vi");
}

function assertEqual(label, expected, actual) {
  if (expected === actual) return;
  throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertTrue(label, value, details = []) {
  if (value) return;
  throw new Error(`${label} failed${details.length ? `: ${JSON.stringify(details)}` : ""}`);
}
