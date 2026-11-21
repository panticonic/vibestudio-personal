import { contextId, createDurableObjectServiceClient } from "@workspace/runtime";
import { missionControlRpcMethods } from "@workspace/mission-control/rpc-contract";

export async function openEditorialMissionStore(owner:string,title:string,description:string) {
  if(!contextId||owner!==contextId)throw new Error("Editorial records require their owned Personal context");
  const store=createDurableObjectServiceClient("mission-planning-fixture.v1",missionControlRpcMethods,
    `natlang-mission-planning-${owner}`);
  const project=await store.call("createProject",{name:"Local editorial candidates",repos:[]});
  const task=await store.call("createTask",{projectId:project.id,title,description,
    tags:["local-editorial-review"],checklist:[{id:"public",text:"Public release requires separate approval",done:false}]});
  const older=await store.call("createTask",{projectId:project.id,title:`${title} visual preview archive`,
    description:"Retained visual review only. No source or working-candidate authority.",status:"done"});
  const read=async()=>store.call("getTask",{id:task.id});
  return {read,list:async()=>[await read(),await store.call("getTask",{id:older.id})],
    update:async(description:string)=>{
      const live=await read();
      return store.call("updateTask",{id:task.id,expectedRevision:live.revision,changes:{description}});
    }};
}
