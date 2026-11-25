import {beforeEach,it,expect,vi} from "vitest";
const store=vi.hoisted(()=>({rows:new Map<string,any>()}));
vi.mock("@workspace/runtime",()=>({contextId:"owned-context",missions:{get:async(id:string)=>structuredClone(store.rows.get(id)),getDefault:async()=>structuredClone(store.rows.get("default")),listRuns:async()=>({items:[]}),transitionAtRevision:async(id:string,action:string)=>{const row=store.rows.get(id);row.state=action==="pause"?"paused":"active";return structuredClone(row);}}}));
import {prepareOpenPersonalAutomation} from "../open-personal-automation-runtime/managed.js";
beforeEach(()=>store.rows.clear());
async function fixture(required:boolean){
 const row={missionId:"owned",name:"Reminder [owned]",owner:"user",charter:{trigger:{kind:"manual"},summary:JSON.stringify({team:"Desk",needs:[],permitted:["pause"]})},authorityPlan:{},revisionDigest:"rev1",revision:1,state:"active",runCount:0};
 const protectedRow={...structuredClone(row),missionId:"default"};store.rows.set("owned",row);store.rows.set("default",protectedRow);
 return prepareOpenPersonalAutomation({contextId:"owned-context",caseId:"case"},{id:"case",goal:"Pause Reminder",requestedReturnRequired:required,monitors:[{key:"reminder",name:"Reminder",team:"Desk",initial:"active"}],expected:{findings:[{key:"reminder",status:"applied",state:"paused",attempt:"pause"}],disposition:"complete"}},{defaultMonitor:structuredClone(protectedRow),items:[{key:"reminder",record:structuredClone(row),suffix:" [owned]"}]});
}
it("binds current scheduling facts without imposing gold report labels or exact finding counts",async()=>{
 const bound=await fixture(true);expect((await bound.qualify()).passed).toBe(true);
 const queue=await bound.services.operatorQueue.observe(),row=queue.monitors[0]!;
 const finding={...row,status:"reconciled",evidence:queue.id};
 const proof=await bound.verify({findings:[finding,finding],disposition:"partial"});
 expect(proof.passed).toBe(true);expect(proof.semanticReviewRequired).toBe(true);
 expect(proof.semanticReviewInput.actual.requestedReturn).toEqual({findings:[finding,finding],disposition:"partial"});
 const forged=await bound.verify({findings:[{...finding,revision:"foreign"}],disposition:"complete"});
 expect(forged.passed).toBe(false);
});
it("keeps an optional incorrect report observable while native effects and meaning review remain authoritative",async()=>{
 const bound=await fixture(false);expect((await bound.qualify()).passed).toBe(true);
 const proof=await bound.verify({findings:[{id:"foreign"}],disposition:"held"});
 expect(proof.passed).toBe(true);expect(proof.outcomeDimensions.returnedValue.checks.matchedGoalReport).toBe(false);
 expect(proof.semanticReviewRequired).toBe(true);expect(proof.semanticReviewInput.actual.requestedReturn).toBeNull();
});
it("rejects absent requested findings and missing native effects",async()=>{
 const bound=await fixture(true);await bound.services.operatorQueue.observe();
 expect((await bound.verify(null)).passed).toBe(false);
});
