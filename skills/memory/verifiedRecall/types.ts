export type DecisionRequest = {
  goal: string;
  query: string;
  eventId: string;
  field: string;
};
export type DecisionLead = {
  id: string;
  eventId: string;
  snippet: string;
};
export type DecisionFile = {
  eventId: string;
  path: string;
  contentHash: string;
  text: string;
};
export type DecisionCitation = {
  eventId: string;
  path: string;
  contentHash: string;
  line: number;
  quote: string;
};
export type DecisionReport = {
  status: "verified" | "no-lead" | "missing-source" | "missing-field";
  leadId: string | null;
  citation: DecisionCitation | null;
};
