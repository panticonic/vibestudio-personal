import {it,expect,vi} from "vitest";
const owned=vi.hoisted(()=>({path:"",events:new Map<string,Map<string,string>>(),blobs:new Map<string,string>(),reads:0}));
vi.mock("@workspace/runtime",()=>({contextId:"ctx",blobstore:{putText:async(text:string)=>{owned.blobs.set(text,text);return {digest:text}}},memory:{},vcs:{status:async()=>({mainEventId:"main",workingHead:{kind:"event",eventId:"main"}}),importSnapshot:async(input:any)=>{owned.path=input.repositories[0].repoPath;const id="event"+(owned.events.size+1);owned.events.set(id,new Map(input.repositories[0].files.map((f:any)=>[f.path,owned.blobs.get(f.contentHash)])));return {eventId:id,importedRepositoryIds:["repository"]}},readFile:async(input:any)=>{owned.reads++;const text=owned.events.get(input.state.eventId)?.get(input.file.path);return text===undefined?null:{repositoryId:"repository",repoPath:owned.path,path:input.file.path,contentHash:"hash",content:{kind:"text",text}}}}}));
import {prepareOpenPersonalHistory} from "../open-personal-history-runtime/managed.js";
it("reads a legitimately known owned milestone/path without first listing it and rejects foreign scope",async()=>{
 owned.events.clear();const bound=await prepareOpenPersonalHistory({contextId:"ctx",caseId:"case"},{id:"case",goal:"Read known terms.md in the supplied milestone",revisions:[{label:"Original",note:"Known file",files:[{path:"terms.md",text:"Exact original wording"}]}],expected:{findings:[],relation:"same",action:"none"}} as any);
 expect(await bound.services.archiveTimeline.read("event1","terms.md")).toMatchObject({text:"Exact original wording",eventId:"event1",path:"terms.md"});
 await expect(bound.services.archiveTimeline.read("foreign","terms.md")).rejects.toThrow("owned archive");
 await expect(bound.services.archiveTimeline.read("event1","../secret")).rejects.toThrow("repository-relative");expect(owned.reads).toBe(1);
});
