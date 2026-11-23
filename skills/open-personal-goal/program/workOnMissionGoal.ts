import {missionGoalBoard} from "natlang:services";
import chooseMissionWork from "./workOnMissionGoal/chooseMissionWork.nl";
import executeMissionStep from "./workOnMissionGoal/executeMissionStep.nl";
import prepareMissionHandoff from "./workOnMissionGoal/prepareMissionHandoff.nl";
import type {MissionGoalReport} from "./types.js";
export default async function workOnMissionGoal(goal:string):Promise<MissionGoalReport>{
 let current=await missionGoalBoard.observe();
 const plan=await chooseMissionWork(goal,current),findings:MissionGoalReport["findings"]=[];
 for(const intent of plan.intents){
  const step=await executeMissionStep(intent,current);current=step.snapshot;findings.push(step.finding);
  if(step.finding.status==="unverified")break;
 }
 const handoff=plan.handoff.length&&!findings.some(f=>f.status==="unverified")?await prepareMissionHandoff(plan.handoff,current):null;
 return {findings,handoff};
}
