import {archiveTimeline} from "natlang:services";
import chooseMilestones from "./reviewPersonalHistory/chooseMilestones.nl";
import inspectMilestone from "./reviewPersonalHistory/inspectMilestone.nl";
import reconcile from "./reviewPersonalHistory/reconcile.nl";
import type {Report,Finding} from "./types.js";
export default async function reviewPersonalHistory(goal:string):Promise<Report>{
 const selection=await chooseMilestones(goal,await archiveTimeline.discover());
 const findings:Finding[]=[];
 for(const milestone of selection.milestones)findings.push(await inspectMilestone(milestone,selection.field,goal));
 return reconcile(goal,findings);
}
