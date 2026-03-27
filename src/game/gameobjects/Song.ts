import { Timing } from './Entities/Entity';
import { Beat } from './Beat';
import * as u from '../helpers/utils';
import * as c from '../config';
import { EntityGroup, entityGroupfromGroupSpec, EntityGroupSpec } from './Entities/EntityGroup';
import { ScrollZone } from './Entities/ScrollZone';
import { GroupTree, groupTreeFromJSON, RBTree, RBTreeFromJSON } from '../helpers/RBTree';

export class Song {
	constructor(
		public song_name: string = "",
		public audio_path: string = "",
		public audio_credit: string = "",
		// Song objects are always guaranteed to have at least one chart
		public charts: [Chart, ...Chart[]] = [new Chart()]
	) {}

	static fromJSON(str: string): Song {
		const obj = JSON.parse(str);

		return new Song(obj.song_name, obj.audio_path, obj.audio_credit, 
			obj.charts.map( (o: object) => Chart.fromJSON(JSON.stringify(o))));
	}
}

export type ScrollChange = {
	mult: number;
	total_distance: number;
}

export type BpmChange = {
	bpm: number,
	total_time: number
}

export type EntityMap = GroupTree<Beat, EntityGroup>;
export type ScrollEntry = [number, ScrollChange]
export type BpmEntry = [Beat, BpmChange];

// Required doesn't affect the type at all (since GroupTree runs Partial again on it) and fixes some TS errors
export type EntitySpecMap = GroupTree<Beat, Required<EntityGroupSpec>>;

export class Chart {
	constructor(
		public author: string = "",
		public difficulty: number = 0,
		// Indexed by time
		public scroll_changes: RBTree<number, ScrollChange> = new RBTree(undefined),
		public bpms: RBTree<Beat, BpmChange> = new RBTree(Beat.compare),
		public entity_specs: EntitySpecMap = new GroupTree(Beat.compare),
		// Offset is used solely to play audio
		// "Playback time" in other objects does not include offset
		public offset: number = 0,
		public initial_bpm: number = c.DEFAULT_BPM
	) {}

	// -----------------------------------------------
	// CALCULATING BEAT TIMING
	// -----------------------------------------------

	static defaultScrollEntry: ScrollEntry = [0, { mult: 1, total_distance: 0 }];
	defaultBPMEntry(): BpmEntry {
		return [ Beat.ZERO_BEAT(), { bpm: this.initial_bpm, total_time: 0 }]
	}

	calculateBeatTiming(beat: Beat): Timing {
		const hit_time = this.calculateHitTime(beat);
		const scroll_position = this.calculateScrollPosition(hit_time);

		return { beat: beat, time: hit_time, scroll_pos: scroll_position };
	}

	calculateHitTime(beat: Beat): number {
		return this.hitTimeUsingBPMEntry(beat, this.mostRecentBPMEntryFrom(beat));
	}

	calculateScrollPosition(hit_time: number): number {
		return this.scrollPositionUsingScrollEntry(hit_time, this.mostRecentScrollEntryFrom(hit_time))
	}

	mostRecentScrollEntryFrom(time: number): ScrollEntry {
		return this.scroll_changes.floor(time) ?? Chart.defaultScrollEntry
	}

	mostRecentBPMEntryFrom(beat: Beat): BpmEntry {
		return this.bpms.floor(beat) ?? this.defaultBPMEntry()
	}

	// Assumes entry is the most recent change before time
	scrollPositionUsingScrollEntry(time: number, entry: ScrollEntry): number {
		return entry[1].total_distance + (time - entry[0]) * entry[1].mult;
	}
	// Ditto for this one
	hitTimeUsingBPMEntry(beat: Beat, entry: BpmEntry): number {
		return entry[1].total_time 
			+ Beat.beatsToSeconds(beat.toDecimal() - entry[0].toDecimal(), entry[1].bpm);
	}

	// -----------------------------------------------
	// CHANGING TIMINGS
	// -----------------------------------------------

	addBpmChange(beat: Beat, bpm: number): void {
		this.bpms.set(beat, { total_time: this.calculateHitTime(beat), bpm: bpm });
		this.recalculateBpmEntries(beat);
	}

	removeBpmChange(beat: Beat): void {
		this.bpms.delete(beat);
		this.recalculateBpmEntries(beat);
	}

	addScrollZone(zone: ScrollZone): void {
		const previous_entry = this.mostRecentScrollEntryFrom(zone.timing.time);
		this.scroll_changes.set(zone.timing.time, 
			{ mult: zone.mult, total_distance: this.calculateScrollPosition(zone.timing.time) }
		);
		this.scroll_changes.set(zone.end_timing.time, 
			{ mult: previous_entry[1].mult, 
				total_distance: this.calculateScrollPosition(zone.end_timing.time) }
		);
		this.recalculateScrollEntries(zone.end_timing.beat);
	}

	// Used to recalc timings when BPM or scroll speed is changed at some point in the chart
	// from_beat is where the change happened. I should only be processing notes after from_beat to make
	// this faster, but I can figure it out later if I need to. (Same for the other recalculate functions)
	recalculateEntityTimings(entity_map: EntityMap, _from_beat: Beat): void {
		entity_map.forEachProp(ent => {
			if(ent.end_timing !== undefined) ent.end_timing = this.calculateBeatTiming(ent.end_timing.beat); 
		})
		entity_map.forEach( ([beat, group]) => {
			const new_timing = this.calculateBeatTiming(beat);
			u.objectForEach(group, v => {
				if(v !== undefined) v.timing = new_timing;
			})
		})
	}

	recalculateBpmEntries(_beat: Beat): void {
		this.bpms.mapValues((v, b) => v.total_time = this.calculateHitTime(b));
	}

	recalculateScrollEntries(_beat: Beat): void {
		this.scroll_changes.mapValues((v, b) => v.total_distance = this.calculateScrollPosition(b));
	}

	// -----------------------------------------------
	// CREATING ENTITY MAP
	// -----------------------------------------------

	createEntityMap(): EntityMap {
		return this.entity_specs.mapGroups( (es, beat) => this.reviveEntitySpec(es, beat));
	}

	reviveEntitySpec(gs: EntityGroupSpec, beat: Beat): EntityGroup {
		const timing = this.calculateBeatTiming(beat);
		return entityGroupfromGroupSpec(gs, timing, this);
	}

	// -----------------------------------------------
	// JSON
	// -----------------------------------------------
	static fromJSON(str: string): Chart {
		const obj = JSON.parse(str, Chart.jsonReviver);
		
		const chart = new Chart(
			obj.author, 
			obj.difficulty, 
			obj.scroll_changes, 
			obj.bpms, 
			obj.entity_specs,
			obj.offset, 
			obj.initial_bpm);

		return chart;
	}

	static jsonReviver(k: string, v: any): any {
		if(k === "scroll_changes"){
			return RBTreeFromJSON<number, ScrollChange>(undefined, v)
		} else if (k === "bpms") {
			return RBTreeFromJSON(Beat.compare, v, { key: (b) => Beat.fromJSON(b) } )
		} else if (k === "entity_specs"){
			return groupTreeFromJSON(Beat.compare, v, { key: (b) => Beat.fromJSON(b) });
		} else {
			return v;
		}
	}
}