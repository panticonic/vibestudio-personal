import {beforeEach,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({results:[] as any[],sentences:[] as string[],support:[] as boolean[],seen:[] as unknown[]}));
vi.mock("natlang:services",()=>({memory:{recall:async()=>({results:state.results})}}));
vi.mock("./recallSummary/relevant.nl",()=>({default:async()=>true}));
vi.mock("./recallSummary/factFrom.nl",()=>({default:async(_query:string,snippet:{id:string})=>state.sentences[Number(snippet.id.slice(1))-1]}));
vi.mock("./recallSummary/supported.nl",()=>({default:async(sentence:string,snippet:string)=>{state.seen.push([sentence,snippet]);await Promise.resolve();return state.support[Number(state.results.findIndex(row=>row.snippet===snippet))];}}));
vi.mock("./recallSummary/relate.nl",()=>({default:async()=>"unrelated"}));
import recallSummary from "./recallSummary/recall.js";
beforeEach(()=>{state.results=[];state.sentences=[];state.support=[];state.seen=[];});
it("uses asynchronous semantic support rather than shared-word coincidence while preserving exact cited records",async()=>{
 state.results=[{kind:"commit",where:"event-a",appendedAt:null,snippet:"Data was deleted."},{kind:"file",where:"policy.txt",appendedAt:null,snippet:"Records were deleted."}];
 state.sentences=["Records were erased.","Records were never deleted."];state.support=[true,false];
 const actual=await recallSummary("What was deleted?",Date.parse("2026-11-25T00:00:00Z"));
 expect(state.seen).toEqual([[state.sentences[0],state.results[0].snippet],[state.sentences[1],state.results[1].snippet]]);
 expect(actual.facts.map(row=>({text:row.text,evidence:row.evidence}))).toEqual([{text:state.sentences[0],evidence:["e1"]}]);
 expect(actual.evidence).toEqual([{id:"e1",kind:"commit",where:"event-a",at:null,text:state.results[0].snippet}]);
 expect(actual.note).toContain("does not prove");expect(actual.nothingFound).toBe(false);
});
it("keeps semantically accepted equivalent quantities and drops every asynchronously rejected sentence",async()=>{
 state.results=[{kind:"file",where:"retry.txt",appendedAt:null,snippet:"Wait 1000 ms."}];state.sentences=["Wait one second."];state.support=[true];
 expect((await recallSummary("How long?",0)).facts[0]!.text).toBe(state.sentences[0]);
 state.support=[false];const rejected=await recallSummary("How long?",0);expect(rejected.facts).toEqual([]);expect(rejected.evidence).toEqual([]);expect(rejected.nothingFound).toBe(true);
});
