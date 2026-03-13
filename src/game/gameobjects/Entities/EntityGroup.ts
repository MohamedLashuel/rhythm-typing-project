import * as u from '../../utils';
import { Entity, Timing } from "./Entity";
import { Note } from "./Note";
import { Chart } from "../Song";
import { Beat } from "../Beat";
import { BpmMarker } from './BpmMarker';
import { ScrollZone } from './ScrollZone';

// These structures should be updated whenever making a new Entity subclass
export type EntityGroup = { note: Note, bpm_marker: BpmMarker, scroll_zone: ScrollZone }
const PROTO_TABLE: Record<EntityKey, new (...args: any[]) => Entity> = {
	"note": Note,
	"bpm_marker": BpmMarker,
	"scroll_zone": ScrollZone
};

type EntityKey = keyof EntityGroup;
export type EntityGroupSpec = Partial<Record<EntityKey, any>>;

// Chart needs to be passed in to calculate end timing for each entity
export function entityGroupfromGroupSpec(gs: EntityGroupSpec, chart: Chart, beat: Beat)
: EntityGroup {
	const timing = chart.calculateBeatTiming(beat);
	const new_gs = u.objectWithout(gs, ["beat"]);
	return u.mapObject(new_gs, (v, k) => entityFromJSONObj(v, k, timing, chart)) as EntityGroup;
}

function entityFromJSONObj<Key extends EntityKey>(obj: any, name: Key, timing: Timing, 
	chart: Chart): EntityGroup[Key] {
	const proto = PROTO_TABLE[name].prototype;
	Object.setPrototypeOf(obj, proto);
	obj.timing = timing;
	if(Object.hasOwn(obj, "end_timing")) 
		obj.end_timing = chart.calculateBeatTiming(Beat.fromJSON(obj.end_timing.beat));
	obj.finalizePostJSON();
	return obj;
}