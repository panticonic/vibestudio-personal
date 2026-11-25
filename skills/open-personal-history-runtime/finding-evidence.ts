import type { Citation, Finding, Milestone } from "../open-personal-history/types.js";

/** Findings identify actual assigned milestones; their meaning is reviewed against the user goal. */
export function matchHistoryFindings(milestones: readonly Milestone[], actual: readonly Finding[]) {
  return actual.every(row => row && milestones.some(milestone=>milestone.label===row.label) &&
    ["verified","conflicting","missing","withdrawn"].includes(row.status) && Array.isArray(row.citations));
}

/** Every supplied citation must join actual inspected bytes, irrespective of a private preferred quotation. */
export function joinHistoryEvidence(actual: readonly Finding[], grounded: (citation: Citation) => boolean) {
  return actual.every(row => row && Array.isArray(row.citations) &&
    row.citations.every(citation => citation && grounded(citation)));
}
