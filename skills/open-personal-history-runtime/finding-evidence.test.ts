import { expect, it } from "vitest";
import { joinHistoryEvidence, matchHistoryFindings } from "./finding-evidence.js";
import type { Citation, Finding } from "../open-personal-history/types.js";
const first: Citation = {eventId:"first",path:"terms.md",line:1,quote:"Original",contentHash:"hash-1"};
const second: Citation = {...first,eventId:"second",quote:"Revised",contentHash:"hash-2"};
const extra: Citation = {...second,line:2,quote:"Supporting evidence"};
const findings: Finding[] = [{label:"original",status:"verified",citations:[first]},{label:"revision",status:"conflicting",citations:[second]}];
const grounded = (row: Citation) => [first,second,extra].some(source => JSON.stringify(source)===JSON.stringify(row));
it("accepts any actually grounded supporting quotation without preferred-line or count requirements",()=>{
  expect(joinHistoryEvidence([{...findings[1]!,citations:[extra]}],grounded)).toBe(true);
  expect(joinHistoryEvidence([...findings,findings[0]!],grounded)).toBe(true);
});
it("rejects fabricated quotations and unassigned milestones while leaving semantic status to goal review",()=>{
  expect(joinHistoryEvidence([{...findings[0]!,citations:[{...first,quote:"Invented"}]}],grounded)).toBe(false);
  const milestones=[{eventId:"first",label:"original"},{eventId:"second",label:"revision"}];
  expect(matchHistoryFindings(milestones,[{...findings[0]!,status:"withdrawn"}])).toBe(true);
  expect(matchHistoryFindings(milestones,[{...findings[0]!,label:"unassigned"}])).toBe(false);
});
