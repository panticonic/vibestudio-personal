import {it,expect,vi} from "vitest";
const store=vi.hoisted(()=>({record:null as any,calls:0}));
vi.mock("@workspace/runtime",()=>({contextId:"owned-context",missions:{get:async()=>structuredClone(store.record),transitionAtRevision:async()=>{store.calls++;store.record.state="paused";return structuredClone(store.record)}}}));
import {prepareOpenPersonalAutomation} from "../open-personal-automation-runtime/managed.js";
it("allows a readonly-refreshed basis and harmless already-state request while enforcing at most one actual transition",async()=>{
 store.record={missionId:"owned",name:"Reminder [owned]",owner:"user",charter:{trigger:{kind:"manual"},summary:JSON.stringify({team:"Desk",needs:[],permitted:["pause"]})},authorityPlan:{},revisionDigest:"rev1",revision:1,state:"active"};store.calls=0;
 const record=structuredClone(store.record);
 const world={id:"case",goal:"Pause Reminder once",monitors:[{key:"reminder",name:"Reminder",team:"Desk",initial:"active"}],expected:{findings:[],disposition:"reviewed"}};
 const bound=await prepareOpenPersonalAutomation({contextId:"owned-context",caseId:"case"},world as any,{defaultMonitor:record,items:[{key:"reminder",record,suffix:" [owned]"}]});
 const first=await bound.services.operatorQueue.observe();await bound.services.operatorQueue.observe();
 expect(await bound.services.operatorQueue.apply(first.id,"owned","pause")).toBe("applied");expect(store.calls).toBe(1);
 const fresh=await bound.services.operatorQueue.observe();expect(await bound.services.operatorQueue.apply(fresh.id,"owned","pause")).toBe("already");expect(store.calls).toBe(1);
 await expect(bound.services.operatorQueue.apply("foreign","owned","pause")).rejects.toThrow("observed owned");expect(store.calls).toBe(1);
});
