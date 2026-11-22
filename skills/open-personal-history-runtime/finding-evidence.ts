import { isDeepStrictEqual } from "node:util";
import type { Citation, Finding } from "../open-personal-history/types.js";

/** Milestone labels identify findings; presentation order is not evidence. */
export function matchHistoryFindings(expected: readonly Finding[], actual: readonly Finding[]) {
  return actual.length === expected.length &&
    new Set(actual.map(row => row?.label)).size === actual.length &&
    expected.every(required => actual.some(row =>
      row?.label === required.label && row.status === required.status));
}

/** Extra citations are useful when grounded, while required source joins remain mandatory. */
export function joinHistoryEvidence(expected: readonly Finding[], actual: readonly Finding[],
  grounded: (citation: Citation) => boolean) {
  return matchHistoryFindings(expected, actual) && expected.every(required => {
    const citations = actual.find(row => row.label === required.label)?.citations;
    return Array.isArray(citations) && citations.every(citation => citation && grounded(citation)) &&
      required.citations.every(citation => citations.some(found => isDeepStrictEqual(found, citation)));
  });
}
