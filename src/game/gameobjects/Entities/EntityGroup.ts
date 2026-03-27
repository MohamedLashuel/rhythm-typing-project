import * as u from '../../helpers/utils';
import { Entity, Timing } from "./Entity";
import { Note } from "./Note";
import { Chart } from "../Song";
import { Beat } from "../Beat";
import { BpmMarker } from './BpmMarker';
import { ScrollZone } from './ScrollZone';

// These structures should be updated whenever making a new Entity subclass
export type UsedEntity = Note | BpmMarker | ScrollZone
export type EntityGroup = {
	[X in UsedEntity as X["key"]]: X
}
const PROTO_TABLE: Record<EntityKey, new (...args: any[]) => Entity> = {
	"note": Note,
	"bpm_marker": BpmMarker,
	"scroll_zone": ScrollZone
};

export type EntityKey = keyof EntityGroup;
export type EntityGroupSpec = Partial<Record<EntityKey, any>>;

// Chart needs to be passed in to calculate end timing for each entity
export function entityGroupfromGroupSpec(gs: EntityGroupSpec, timing: Timing, chart: Chart): EntityGroup {
	return u.mapObject(gs, (v, k) => entityFromJSONObj(v, k, timing, chart)) as EntityGroup;
}

function entityFromJSONObj<Key extends EntityKey>(obj: any, name: Key, timing: Timing, chart: Chart)
		: EntityGroup[Key] {
	const proto = PROTO_TABLE[name].prototype;
	Object.setPrototypeOf(obj, proto);
	obj.timing = timing;
	if(Object.hasOwn(obj, "end_timing")) 
		obj.end_timing = chart.calculateBeatTiming(Beat.fromJSON(obj.end_timing.beat));
	obj.finalizePostJSON();
	return obj;
}