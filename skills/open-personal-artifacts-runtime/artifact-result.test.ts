import {describe,it,expect} from "vitest";
import {checkArtifactResult} from "./artifact-result.js";
const library={id:"issued-library",availableFolders:["/Active","/Archive"],bookmarks:[{id:1,folder:"/Active",title:"Treatment guide",url:"https://example.test/current"},{id:2,folder:"/Archive",title:"Treatment guide",url:"https://example.test/historical"}],visits:[]};
const collection={id:"native-final-unobserved",rootId:"root",complete:true,nodes:[]};
const evidence={goal:"Remove Treatment guide only if both URLs match; otherwise preserve both",library,collection,libraryObservations:new Map([[library.id,library]]),collectionObservations:new Map(),libraryChanged:false,collectionChanged:false,libraryHeld:true,collectionHeld:true,selected:null};
const held={kind:"held",holds:[{kind:"different-urls",left:library.bookmarks[0],right:library.bookmarks[1]}]};
describe("native artifact application dispositions",()=>{
 it("accepts a grounded hold without observing untouched collection",()=>expect(checkArtifactResult(held,evidence)).toBe(true));
 it("rejects invented IDs, reasons and equal-URL hold",()=>{
  expect(checkArtifactResult({...held,holds:[{...held.holds[0],left:{...library.bookmarks[0],id:99}}]},evidence)).toBe(false);
  expect(checkArtifactResult({...held,holds:[{...held.holds[0],kind:"unavailable"}]},evidence)).toBe(false);
  expect(checkArtifactResult({...held,holds:[{...held.holds[0],left:{...library.bookmarks[0],url:"forged"}}]},evidence)).toBe(false);
 });
 it("cannot hide a required decision behind changed tag",()=>expect(checkArtifactResult({kind:"changed",holds:[],library:{state:library,held:true,bookmarkId:null}},evidence)).toBe(false));
 it("requires actual requested cross-domain changed results",()=>{
  const changed={...evidence,libraryHeld:false,collectionHeld:false,libraryChanged:true,collectionChanged:true,collectionObservations:new Map([[collection.id,collection]])};
  const result={kind:"changed",holds:[],library:{state:library,held:false,bookmarkId:null},collection:{state:collection,held:false}};
  expect(checkArtifactResult(result,changed)).toBe(true);
  expect(checkArtifactResult({...result,collection:undefined},changed)).toBe(false);
  expect(checkArtifactResult({...result,kind:"held"},changed)).toBe(false);
 });
 it("requires real latest ties while semantic reference wording is reviewed against the goal",()=>{
  const tied={...library,id:"tied",bookmarks:[],visits:[{url:"https://a",title:"Lease reference east",lastVisitTime:20},{url:"https://b",title:"Lease reference west",lastVisitTime:20}]};
  const source={...evidence,goal:"Recover latest Lease reference only if not tied",library:tied,libraryObservations:new Map([[tied.id,tied]])};
  const value={kind:"held",holds:[{kind:"tied-latest-visits",reference:"Lease",urls:["https://b","https://a"]}]};
  expect(checkArtifactResult(value,source)).toBe(true);
  expect(checkArtifactResult({...value,holds:[{...value.holds[0],reference:"The leases"}]},source)).toBe(true);
  expect(checkArtifactResult({...value,holds:[{...value.holds[0],urls:["https://a"]}]},source)).toBe(false);
 });
});

it("grounds different-source findings in native records without hidden title/goal substring equality",()=>{
 const renamed={...library,bookmarks:[{...library.bookmarks[0],title:"Current clinical guide"},{...library.bookmarks[1],title:"Historical clinical handbook"}]};
 const source={...evidence,goal:"Does the old clinical reference replace the current one?",library:renamed,libraryObservations:new Map([[renamed.id,renamed]])};
 expect(checkArtifactResult({kind:"held",holds:[{kind:"different-urls",left:renamed.bookmarks[0],right:renamed.bookmarks[1]}]},source)).toBe(true);
});
