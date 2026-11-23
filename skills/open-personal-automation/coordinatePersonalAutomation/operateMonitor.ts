import {operatorQueue} from "natlang:services";
import interpretReadback from "./operateMonitor/interpretReadback.nl";
import type {Monitor,Action,Step} from "../types.js";
export default async function operateMonitor(basis:string,monitor:Monitor,action:Action):Promise<Step>{
 const receipt=await operatorQueue.apply(basis,monitor.id,action);
 const queue=await operatorQueue.observe();
 return {queue,finding:await interpretReadback(monitor,action,receipt,queue)};
}
