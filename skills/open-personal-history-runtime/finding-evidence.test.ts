import { expect, it } from "vitest";
import { joinHistoryEvidence } from "./finding-evidence.js";
import type { Citation, Finding } from "../open-personal-history/types.js";
const first: Citation = {eventId:"first",path:"terms.md",line:1,quote:"Original",contentHash:"hash-1"};
const second: Citation = {...first,eventId:"second",quote:"Revised",contentHash:"hash-2"};
const extra: Citation = {...second,line:2,quote:"Supporting evidence"};
const expected: Finding[] = [
  {label:"original",status:"verified",citations:[first]},
  {label:"revision",status:"conflicting",citations:[second]},
];
const grounded = (row: Citation) => [first,second,extra].some(source => JSON.stringify(source)===JSON.stringify(row));
it("accepts reordered milestones and additional grounded supporting citations",()=>{
  expect(joinHistoryEvidence(expected,[{...expected[1]!,citations:[extra,second]},expected[0]!],grounded)).toBe(true);
});
it("rejects missing joins, duplicate milestone labels and fabricated quotations",()=>{
  expect(joinHistoryEvidence(expected,[expected[0]!,{...expected[1]!,citations:[extra]}],grounded)).toBe(false);
  expect(joinHistoryEvidence(expected,[expected[0]!,expected[0]!],grounded)).toBe(false);
  expect(joinHistoryEvidence(expected,[expected[0]!,{...expected[1]!,citations:[second,{...extra,quote:"Invented"}]}],grounded)).toBe(false);
});
