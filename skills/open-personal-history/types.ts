export type Milestone = { label: string; eventId: string };
export type Lead = { eventId: string; snippet: string };
export type Scope = { milestones: Milestone[]; leads: Lead[] };
export type Selection = { milestones: Milestone[]; field: string };
export type Source = {
  eventId: string;
  path: string;
  contentHash: string;
  text: string;
};
export type Citation = {
  eventId: string;
  path: string;
  contentHash: string;
  line: number;
  quote: string;
};
export type Finding = {
  label: string;
  status: "verified" | "conflicting" | "missing" | "withdrawn";
  citations: Citation[];
};
export type Report = {
  findings: Finding[];
  relation: "single" | "same" | "changed" | "unresolved";
  action: "clear" | "hold";
};
