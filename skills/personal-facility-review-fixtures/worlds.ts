import type {
  BrowserFacilityEvidence,
  CollectionFacilityEvidence,
  ExplorerFacilityEvidence,
  FacilityRequest,
  FacilityReview,
  MissionFacilityEvidence,
  TourFacilityEvidence,
} from "../personal-facility-review/types.js";

export type PersonalFacilityWorld = {
  id: string;
  sourceGroup: string;
  request: FacilityRequest;
  expected: FacilityReview;
};
function world(
  id: string,
  group: string,
  request: FacilityRequest,
  status: FacilityReview["status"],
  code: string,
  ...evidenceIds: string[]
): PersonalFacilityWorld {
  return {
    id: `facility-${id}`,
    sourceGroup: `vibestudio:personal-facility:${group}`,
    request,
    expected: { status, findings: [{ code, evidenceIds }] },
  };
}

const browserTarget: BrowserFacilityEvidence["target"] = {
  id: "chosen-source",
  hostId: "desktop-A",
  sourceId: "selected-browser",
  selectionApproved: true,
  categories: ["bookmarks", "history"],
  operationId: "snapshot-one",
};
const importReceipt: NonNullable<
  Extract<BrowserFacilityEvidence["detail"], { kind: "snapshot" }>["receipt"]
> = {
  id: "import-outcome",
  hostId: "desktop-A",
  sourceId: "selected-browser",
  operationId: "snapshot-one",
  lane: "public",
  phase: "complete",
  committedCount: 11,
};
function browser(
  goal: string,
  detail: BrowserFacilityEvidence["detail"] = {
    kind: "snapshot",
    receipt: importReceipt,
  },
  target: BrowserFacilityEvidence["target"] = browserTarget,
): BrowserFacilityEvidence {
  return { kind: "browser", goal, target, detail };
}
const browserWorlds = [
  world(
    "browser-approved-host-only",
    "browser-attribution",
    browser(
      "Two desktops had imports for the same browser title. Verify whether this completed snapshot belongs to the approved host.",
      { kind: "snapshot", receipt: { ...importReceipt, hostId: "desktop-B" } },
    ),
    "blocked",
    "import-receipt-mismatch",
    "chosen-source",
    "import-outcome",
  ),
  world(
    "browser-keep-cancelled-batches",
    "browser-snapshot",
    browser(
      "The user cancelled after eleven records were committed. Did stopping remove the completed snapshot batches?",
      { kind: "snapshot", receipt: { ...importReceipt, phase: "cancelled" } },
    ),
    "attention",
    "cancelled-with-commits",
    "import-outcome",
  ),
  world(
    "browser-sealed-applying",
    "browser-protected-status",
    browser(
      "The selected sealed snapshot has aggregate counts and is still applying. Is the migration complete?",
      {
        kind: "snapshot",
        receipt: { ...importReceipt, lane: "sealed", phase: "applying" },
      },
      { ...browserTarget, categories: ["formFill"] },
    ),
    "waiting",
    "import-applying",
    "import-outcome",
  ),
  world(
    "browser-public-cannot-confirm-protected",
    "browser-protected-status",
    browser(
      "Check whether this public receipt establishes completion of a sealed snapshot. No protected payload should be examined.",
      { kind: "snapshot", receipt: importReceipt },
      { ...browserTarget, categories: ["cookies"] },
    ),
    "blocked",
    "import-lane-mismatch",
    "chosen-source",
    "import-outcome",
  ),
  world(
    "browser-user-migration-inspector",
    "browser-inspector",
    browser(
      "The user still works in the browser import inspector. Determine whether the panel is a temporary diagnostic window.",
      {
        kind: "inspector",
        selection: {
          id: "user-inspector",
          temporary: false,
          userMigrationActive: true,
          archived: false,
        },
      },
    ),
    "ready",
    "keep-user-inspector",
    "user-inspector",
  ),
  world(
    "browser-tabs-destination",
    "browser-inspector",
    browser(
      "The imported tabs retained their browser windows but appeared under the caller's panel. Was that destination authorized?",
      {
        kind: "tabs",
        receipt: {
          id: "tabs-readback",
          explicitCallerDestination: false,
          destination: "caller",
          sourceWindowGroupsRetained: true,
        },
      },
    ),
    "attention",
    "tab-destination-mismatch",
    "tabs-readback",
  ),
];

const root: CollectionFacilityEvidence["root"] = {
  id: "conductor-root",
  panelId: "root-panel",
  contextId: "collection-context",
};
const walk: CollectionFacilityEvidence["walk"] = {
  id: "walk-capture",
  rootPanelId: "root-panel",
  reachedLimit: false,
  refreshedAfterChange: true,
};
const panel: NonNullable<CollectionFacilityEvidence["target"]> = {
  id: "panel-receipt",
  panelId: "browser-panel",
  descendant: true,
  contextId: "collection-context",
  spawnedByRoot: false,
};
const structure: CollectionFacilityEvidence["detail"] = {
  kind: "structure",
  requestedParent: "passed-group",
  requestedAfter: "milestone-panel",
  readback: {
    id: "structure-capture",
    actualParent: "passed-group",
    actualAfter: "milestone-panel",
  },
};
const content: CollectionFacilityEvidence["detail"] = {
  kind: "content",
  grant: null,
  cdp: {
    id: "cdp-readback",
    leasedRuntime: "old-panel-run",
    observedRuntime: "current-panel-run",
  },
};
function collection(
  goal: string,
  patch: Partial<CollectionFacilityEvidence> = {},
): CollectionFacilityEvidence {
  return {
    kind: "collection",
    goal,
    root,
    walk,
    target: panel,
    detail: { kind: "tree" },
    ...patch,
  };
}
const collectionWorlds = [
  world(
    "collection-bounded-walk",
    "collection-scope",
    collection(
      "The audit hit the assigned walk limit before collecting the whole subtree. Can the user call this complete?",
      { walk: { ...walk, reachedLimit: true } },
    ),
    "waiting",
    "narrow-collection-scope",
    "walk-capture",
  ),
  world(
    "collection-outside-assigned-root",
    "collection-scope",
    collection(
      "A user pasted a neighboring panel ID into chat, but the assigned-root walk did not establish that panel as a descendant.",
      { target: { ...panel, descendant: false } },
    ),
    "blocked",
    "panel-outside-collection",
    "conductor-root",
    "panel-receipt",
  ),
  world(
    "collection-stale-order",
    "collection-structure",
    collection(
      "Verify project order after the move. The available walk predates that change.",
      { walk: { ...walk, refreshedAfterChange: false }, detail: structure },
    ),
    "waiting",
    "refresh-after-structure-change",
    "walk-capture",
  ),
  world(
    "collection-order-confirmed",
    "collection-structure",
    collection(
      "Confirm the moved panel is under the new group and follows the desired sibling in the fresh tree.",
      { detail: structure },
    ),
    "ready",
    "structure-confirmed",
    "structure-capture",
  ),
  world(
    "collection-moved-panel-keeps-scope",
    "collection-content",
    collection(
      "A panel moved into the collection kept a foreign context and unrelated provenance. Can the conductor use its content without an approval receipt?",
      {
        target: { ...panel, contextId: "original-other-context" },
        detail: content,
      },
    ),
    "waiting",
    "runtime-approval-required",
    "panel-receipt",
  ),
  world(
    "collection-rebuild-replaces-lease",
    "collection-content",
    collection(
      "A reachable panel rebuilt while its existing content inspection retained the previous runtime identity. Which evidence must change?",
      { detail: content },
    ),
    "attention",
    "replace-stale-cdp-lease",
    "cdp-readback",
  ),
];

const scene: TourFacilityEvidence["scene"] = {
  id: "tour-scene",
  label: "Vibestudio Tour",
  illustrative: false,
  claimsMeasured: false,
  claimsLiveGrant: false,
};
function tour(
  goal: string,
  demo: TourFacilityEvidence["demo"],
  scenePatch: Partial<TourFacilityEvidence["scene"]> = {},
): TourFacilityEvidence {
  return { kind: "tour", goal, scene: { ...scene, ...scenePatch }, demo };
}
const tourWorlds = [
  world(
    "tour-slider-not-measurement",
    "tour-copy",
    tour(
      "An adjustable continuum figure is being described as measured performance. Review the claim.",
      { kind: "copy" },
      { illustrative: true, claimsMeasured: true },
    ),
    "attention",
    "illustration-overclaims",
    "tour-scene",
  ),
  world(
    "tour-simulated-grant-not-receiver",
    "tour-protected-demo",
    tour(
      "The approval demo's UI says it granted access, but there is no declared receiver action. Did a real protected read occur?",
      {
        kind: "protected-read",
        receipt: {
          id: "local-approval-state",
          fromDeclaredReceiver: false,
          state: "granted",
        },
      },
    ),
    "blocked",
    "missing-declared-protected-read",
    "local-approval-state",
  ),
  world(
    "tour-child-preview-proof",
    "tour-preview",
    tour(
      "Verify that the rebuilt child reflects the locally committed preview without publishing to Main or editing bookmarks.",
      {
        kind: "app-preview",
        receipt: {
          id: "preview-readback",
          contextRefMatches: true,
          localCommit: true,
          mainUnchanged: true,
          bookmarkedDataUnchanged: true,
          childRebuilt: true,
        },
      },
    ),
    "ready",
    "local-preview-verified",
    "preview-readback",
  ),
  world(
    "tour-preview-crossed-main",
    "tour-preview",
    tour(
      "The polished child looks right, but Main changed during a preview-only tour. Is the demo delivery valid?",
      {
        kind: "app-preview",
        receipt: {
          id: "main-changed",
          contextRefMatches: true,
          localCommit: true,
          mainUnchanged: false,
          bookmarkedDataUnchanged: true,
          childRebuilt: true,
        },
      },
    ),
    "blocked",
    "preview-boundary-violated",
    "main-changed",
  ),
  world(
    "tour-manual-no-recurrence",
    "tour-automation",
    tour(
      "Project pulse returned an observed result. Check that running it once did not install any scheduled recurrence.",
      {
        kind: "manual-run",
        receipt: {
          id: "pulse-receipt",
          trigger: "manual",
          completed: true,
          nextRun: false,
        },
      },
    ),
    "ready",
    "manual-run-confirmed",
    "pulse-receipt",
  ),
  world(
    "tour-template-prefill",
    "tour-template",
    tour(
      "The writing-demo link reached prefilled source review. Confirm exactly what it accomplished.",
      {
        kind: "template-review",
        receipt: {
          id: "writing-review",
          sourcePrefilled: true,
          createdWithoutReview: false,
        },
      },
    ),
    "ready",
    "source-review-prefilled",
    "writing-review",
  ),
];

const task: MissionFacilityEvidence["card"] = {
  id: "current-card",
  taskId: "task-17",
  revision: 3,
  state: "active",
  projectArchived: false,
  dependencyAccepted: true,
  automationId: "aut-21",
};
const running: NonNullable<
  Extract<MissionFacilityEvidence["detail"], { kind: "execution" }>["receipt"]
> = {
  id: "missions-observation",
  automationId: "aut-21",
  phase: "running",
  cancellationJoined: false,
  recurrenceEnabled: true,
};
function mission(
  goal: string,
  detail: MissionFacilityEvidence["detail"] = { kind: "revision" },
  card: MissionFacilityEvidence["card"] = task,
  expectedRevision = 3,
): MissionFacilityEvidence {
  return {
    kind: "mission",
    goal,
    target: { id: "planned-task", taskId: "task-17", expectedRevision },
    card,
    detail,
  };
}
const missionWorlds = [
  world(
    "mission-stale-task-revision",
    "mission-planning",
    mission(
      "A board update was prepared at revision 2, but the task now has revision 3. What must happen before proceeding?",
      { kind: "revision" },
      task,
      2,
    ),
    "attention",
    "reread-task-revision",
    "planned-task",
    "current-card",
  ),
  world(
    "mission-move-keeps-identity",
    "mission-planning",
    mission(
      "The task moved to a different project. Verify that it retained the original task ID and run link.",
      {
        kind: "move",
        id: "move-readback",
        beforeTaskId: "task-17",
        afterTaskId: "task-17",
        executionLinkRetained: true,
      },
    ),
    "ready",
    "move-preserved-identity",
    "move-readback",
  ),
  world(
    "mission-recurring-dependency-gated",
    "mission-execution",
    mission(
      "The prior recurring occurrence was accepted. Can a new scheduled one start while the upstream task remains unaccepted?",
      {
        kind: "execution",
        intent: "start",
        automationKind: "recurring",
        receipt: running,
      },
      { ...task, state: "done", dependencyAccepted: false },
    ),
    "waiting",
    "dependencies-unaccepted",
    "current-card",
  ),
  world(
    "mission-manual-done-needs-ready",
    "mission-execution",
    mission(
      "This one-off task was already accepted as Done. Verify whether the current card can start another manual execution.",
      {
        kind: "execution",
        intent: "start",
        automationKind: "manual",
        receipt: running,
      },
      { ...task, state: "done" },
    ),
    "blocked",
    "manual-task-already-done",
    "current-card",
  ),
  world(
    "mission-cancellation-join-missing",
    "mission-cancellation",
    mission(
      "A cancellation was requested, but the canonical execution is still running. Does that justify marking the card cancelled?",
      {
        kind: "execution",
        intent: "cancel",
        automationKind: null,
        receipt: running,
      },
    ),
    "attention",
    "cancellation-not-joined",
    "missions-observation",
  ),
  world(
    "mission-archive-recurrence-live",
    "mission-archive",
    mission(
      "The current occurrence ended. Does that complete project archival when there is still enabled recurrence?",
      {
        kind: "execution",
        intent: "archive",
        automationKind: "recurring",
        receipt: { ...running, phase: "complete" },
      },
    ),
    "waiting",
    "execution-still-active",
    "missions-observation",
  ),
];

const exploreFocus: ExplorerFacilityEvidence["focus"] = {
  id: "focused-surface",
  contextId: "owned-explorer",
  surface: "documented workspace read",
};
const expectation: NonNullable<ExplorerFacilityEvidence["expectation"]> = {
  id: "prior-expectation",
  surface: "documented workspace read",
  documented: true,
  recordedBeforeCall: true,
};
const observation: NonNullable<ExplorerFacilityEvidence["observation"]> = {
  id: "observed-probe",
  contextId: "owned-explorer",
  surface: "documented workspace read",
  ownedDisposableState: true,
  admitted: true,
  comparison: "matched",
};
function explorer(
  goal: string,
  patch: Partial<ExplorerFacilityEvidence> = {},
): ExplorerFacilityEvidence {
  return {
    kind: "explorer",
    goal,
    focus: exploreFocus,
    expectation,
    observation,
    previous: null,
    ...patch,
  };
}
const explorerWorlds = [
  world(
    "explorer-expectation-after-call",
    "explorer-proof",
    explorer(
      "An expectation was reconstructed after seeing the result. Can this observation count as a documented contract test?",
      { expectation: { ...expectation, recordedBeforeCall: false } },
    ),
    "attention",
    "expectation-not-prior",
    "prior-expectation",
  ),
  world(
    "explorer-mismatched-owned-context",
    "explorer-proof",
    explorer(
      "A result with the expected shape came from the wrong workspace context. May this count as a scoped Explorer observation?",
      {
        observation: {
          ...observation,
          contextId: "unrelated-project",
          ownedDisposableState: false,
        },
      },
    ),
    "blocked",
    "probe-outside-scope",
    "focused-surface",
    "observed-probe",
  ),
  world(
    "explorer-coverage-without-finding",
    "explorer-classification",
    explorer(
      "The documented read matched the prior expectation. Does it belong in the findings log or coverage only?",
    ),
    "ready",
    "coverage-only",
    "observed-probe",
  ),
  world(
    "explorer-doc-mismatch",
    "explorer-classification",
    explorer(
      "The scoped read obeyed its underlying invariant, but the docs example lists the wrong return field. Classify the mismatch.",
      { observation: { ...observation, comparison: "documentation-only" } },
    ),
    "attention",
    "doc-mismatch",
    "prior-expectation",
    "observed-probe",
  ),
  world(
    "explorer-contract-regression",
    "explorer-classification",
    explorer(
      "A scoped app state read returned a different revision from its previously verified readback. Classify the recorded contract violation.",
      { observation: { ...observation, comparison: "violated-invariant" } },
    ),
    "attention",
    "contract-violation",
    "prior-expectation",
    "observed-probe",
  ),
  world(
    "explorer-resolved-not-duplicate",
    "explorer-history",
    explorer(
      "Recheck the earlier finding against a fresh attributable result. Does the new matched observation support a resolution?",
      {
        previous: {
          id: "old-finding",
          matchingFinding: true,
          historicallyFailed: true,
        },
      },
    ),
    "ready",
    "previous-finding-resolved",
    "old-finding",
    "observed-probe",
  ),
];

export const personalFacilityWorlds: PersonalFacilityWorld[] = [
  ...browserWorlds,
  ...collectionWorlds,
  ...tourWorlds,
  ...missionWorlds,
  ...explorerWorlds,
];
