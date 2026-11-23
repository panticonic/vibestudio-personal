import {beforeEach,describe,it,expect,vi} from "vitest";
const native=vi.hoisted(()=>({rows:[{id:1,folder_path:"/Inbox",title:"Original",url:"https://example.test/a"}],notes:{} as Record<string,string>,node:{slotId:"child",parentSlotId:"root",title:"Child",source:"panel",contextId:"ctx"},reads:0,writes:0}));
vi.mock("@workspace/runtime",()=>({browserData:{getBookmarks:async()=>{native.reads++;return structuredClone(native.rows)},getHistory:async()=>[],updateBookmark:async(id:number,changes:any)=>{native.writes++;Object.assign(native.rows.find(row=>row.id===id)!,changes)}},panelTree:{get:(id:string)=>({stateArgs:{get:async()=>({notes:structuredClone(native.notes)}),patch:async(value:any)=>{native.writes++;native.notes={...native.notes,...value.notes}}}}),path:async()=>{native.reads++;return {revision:1,entries:[{node:{slotId:"root",parentSlotId:null,title:"Root",source:"about/collection",contextId:"ctx"}}]}},walk:async function*(){yield {node:structuredClone(native.node)}}},createPanelSlot:vi.fn()}));
import {bindBrowserLibrary} from "../browser-library-runtime/index.js";
import {bindCollection} from "../collection-conductor-runtime/index.js";
import {bindMissionPlanning} from "../mission-planning-runtime/index.js";
beforeEach(()=>{native.rows=[{id:1,folder_path:"/Inbox",title:"Original",url:"https://example.test/a"}];native.notes={};native.reads=0;native.writes=0});
describe("issued native basis survives harmless readonly refresh",()=>{
 it("browser library reuses issued basis, coalesces readonly and rejects actual stale payload",async()=>{
  const api=bindBrowserLibrary({folders:["/Inbox"],origins:["https://example.test"]});
  const [a,b]=await Promise.all([api.browserLibraryState.observe(),api.browserLibraryState.observe()]);
  expect(a.id).toBe(b.id);expect(a).not.toBe(b);expect(native.reads).toBe(1);
  await api.browserLibraryState.observe();
  await api.browserLibraryChange.apply(a.id,{kind:"rename",id:1,title:"Renamed"});expect(native.writes).toBe(1);
  await expect(api.browserLibraryChange.apply(a.id,{kind:"rename",id:1,title:"stale"})).rejects.toThrow("changed");
  await expect(api.browserLibraryChange.apply("foreign",{kind:"rename",id:1,title:"forged"})).rejects.toThrow("unavailable");expect(native.writes).toBe(1);
 });
 it("collection accepts issued complete basis but preserves current payload and ownership guards",async()=>{
  const api=bindCollection("root","ctx");const [a,b]=await Promise.all([api.collectionState.observe(),api.collectionState.observe()]);
  expect(a.id).toBe(b.id);expect(native.reads).toBe(2);await api.collectionState.observe();
  await api.collectionChange.apply(a.id,{kind:"note",panelId:"child",text:"Confirmed"});expect(native.writes).toBe(1);
  await expect(api.collectionChange.apply(a.id,{kind:"note",panelId:"child",text:"stale"})).rejects.toThrow();
  const fresh=await api.collectionState.observe();await expect(api.collectionChange.apply(fresh.id,{kind:"note",panelId:"foreign",text:"no"})).rejects.toThrow();expect(native.writes).toBe(1);
 });
 it("mission snapshot accepts earlier unchanged evidence and retains native card revision",async()=>{
  let card={id:"card",projectId:"project",title:"Task",revision:1,dependencies:[],status:"inbox",automationId:null,updatedAt:1};let reads=0,writes=0;
  const port={projects:async()=>{reads++;return [{id:"project",name:"Project",archived:false}]},cards:async()=>({tasks:[structuredClone(card)],cursor:null}),update:async(input:any)=>{expect(input.expectedRevision).toBe(card.revision);writes++;card={...card,...input.changes,revision:card.revision+1};return structuredClone(card)}};
  const api=bindMissionPlanning(port as any,["project"]);const [a,b]=await Promise.all([api.missionPlanningState.observe(),api.missionPlanningState.observe()]);expect(a.id).toBe(b.id);expect(reads).toBe(1);await api.missionPlanningState.observe();
  await api.missionPlanningChange.apply(a.id,{kind:"ready",cardId:"card",revision:1});expect(writes).toBe(1);
  await expect(api.missionPlanningChange.apply(a.id,{kind:"ready",cardId:"card",revision:1})).rejects.toThrow("changed");
  await expect(api.missionPlanningChange.apply("foreign",{kind:"ready",cardId:"card",revision:2})).rejects.toThrow("unavailable");expect(writes).toBe(1);
 });
});
