import { isDeepStrictEqual } from "node:util";
import type { ArtifactLibrary, ArtifactCollection, ArtifactHold, PersonalArtifactsReport } from "../open-personal-artifacts/types.js";

type Evidence = {
  goal: string;
  library: ArtifactLibrary;
  collection: ArtifactCollection;
  libraryObservations: Map<string, ArtifactLibrary>;
  collectionObservations: Map<string, ArtifactCollection>;
  libraryChanged: boolean;
  collectionChanged: boolean;
  libraryHeld: boolean;
  collectionHeld: boolean;
  selected: number | null;
};
const libraryPayload = ({id: _id,...payload}: ArtifactLibrary) => payload;
const collectionPayload = ({id: _id,...payload}: ArtifactCollection) => payload;
export function checkArtifactResult(value: unknown, evidence: Evidence): boolean {
  if (!value || typeof value !== "object") return false;
  const report = value as PersonalArtifactsReport;
  const library = (state: ArtifactLibrary | undefined) => Boolean(state &&
    isDeepStrictEqual(evidence.libraryObservations.get(state.id),state) &&
    isDeepStrictEqual(libraryPayload(state),libraryPayload(evidence.library)));
  const collection = (state: ArtifactCollection | undefined) => Boolean(state &&
    isDeepStrictEqual(evidence.collectionObservations.get(state.id),state) &&
    isDeepStrictEqual(collectionPayload(state),collectionPayload(evidence.collection)));
  const hold = (item: ArtifactHold): boolean => {
    if (!item || !library(item.basis) || !evidence.libraryHeld) return false;
    if (item.kind === "different-urls") {
      const left=item.basis.bookmarks.find(row=>row.id===item.leftId);
      const right=item.basis.bookmarks.find(row=>row.id===item.rightId);
      return Boolean(left && right && left.id!==right.id && left.url!==right.url &&
        left.title===right.title && evidence.goal.toLowerCase().includes(left.title.toLowerCase()));
    }
    if (item.kind === "tied-latest-visits") {
      if (typeof item.reference!=="string" || !item.reference.trim() ||
        !evidence.goal.toLowerCase().includes(item.reference.toLowerCase()) || !Array.isArray(item.urls)) return false;
      const visits=item.basis.visits.filter(row=>row.title.toLowerCase().includes(item.reference.toLowerCase()));
      const latest=Math.max(...visits.map(row=>row.lastVisitTime));
      const tied=[...new Set(visits.filter(row=>row.lastVisitTime===latest).map(row=>row.url))].sort();
      return tied.length>1 && isDeepStrictEqual(tied,[...item.urls].sort());
    }
    return false;
  };
  const changed=evidence.libraryChanged || evidence.collectionChanged;
  const holds="holds" in report ? report.holds : [];
  if (!Array.isArray(holds) || !holds.every(hold)) return false;
  // A disposition tag cannot erase an actual requested preservation decision.
  if ((evidence.libraryHeld || evidence.collectionHeld) && holds.length===0) return false;
  if (report.kind === "held") return !changed && holds.length>0;
  if (report.kind !== "changed" && report.kind !== "unchanged") return false;
  if ((report.kind === "changed") !== changed) return false;
  if (!report.library && !report.collection) return false;
  if (evidence.libraryChanged && !report.library || evidence.collectionChanged && !report.collection) return false;
  if (report.library && (!library(report.library.state) || report.library.held!==evidence.libraryHeld || report.library.bookmarkId!==evidence.selected)) return false;
  if (report.collection && (!collection(report.collection.state) || report.collection.held!==evidence.collectionHeld)) return false;
  return true;
}
