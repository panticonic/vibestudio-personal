export type TextProbeRequest = { goal: string; operationId: string };

export type TextProbeInput = {
  bytes: number;
  characters: number;
  digest: string;
  lineEnding: "lf" | "crlf" | "mixed" | "none";
  claim: "reports-bytes" | "reports-characters" | "normalizes-line-endings" | null;
  repeat: boolean;
};

export type TextProbePlan = {
  expectedBytes: number;
  expectedDigest: string;
  comparison: "round-trip" | "repeat-store";
  check: "utf8-size" | "line-endings" | "exact-content";
};

export type TextProbeReceipt = {
  blob: {
    digest: string;
    writtenBytes: number;
    exists: boolean;
    statBytes: number | null;
    readDigest: string | null;
    repeatDigest: string | null;
  };
  file: { digest: string; bytes: number; removed: boolean };
};

export type TextProbeAssessment = {
  classification: "ok" | "bug" | "doc-mismatch";
  issue: "content" | "byte-count" | "repeat" | "cleanup" | "claim" | null;
};

export type TextProbeReport = {
  input: TextProbeInput;
  plan: TextProbePlan;
  receipt: TextProbeReceipt;
  assessment: TextProbeAssessment;
  next: string;
};
