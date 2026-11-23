import {operatorQueue} from "natlang:services";
import chooseNext from "./coordinatePersonalAutomation/chooseNext.nl";
import operateMonitor from "./coordinatePersonalAutomation/operateMonitor.js";
import recordFinding from "./coordinatePersonalAutomation/recordFinding.nl";
import type {Report,Finding} from "./types.js";
export default async function coordinatePersonalAutomation(goal:string):Promise<Report>{
 let queue=await operatorQueue.observe();const findings:Finding[]=[];
 for(let remaining=48;remaining>0;remaining--){
  const plan=await chooseNext(goal,queue,findings);
  if(plan.kind==="finish")return {findings,disposition:plan.disposition};
  if(plan.kind==="record"){findings.push(await recordFinding(queue,plan.name,plan.id,plan.status));continue;}
  const monitor=queue.monitors.find(item=>item.id===plan.id);
  if(!monitor)throw new Error("The selected monitor is not in the current owned queue");
  const step=await operateMonitor(queue.id,monitor,plan.action);queue=step.queue;findings.push(step.finding);
 }
 throw new Error("The automation planning budget was exhausted before completion");
}
