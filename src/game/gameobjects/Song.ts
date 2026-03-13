import { Timing } from './Entities/Entity';
import { Beat } from './Beat';
import BTree from 'sorted-btree';
import * as u from '../utils';
import * as c from '../config';
import { EntityGroup, entityGroupfromGroupSpec, EntityGroupSpec } from './Entities/EntityGroup';
import { ScrollZone } from './Entities/ScrollZone';

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
			obj.charts.map( (o: Object) => Chart.fromJSON(JSON.stringify(o))));
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

export type EntityMap = u.GroupTree<Beat, EntityGroup>;
export type EntityMapEntry = [Beat, Partial<EntityGroup>];
export type ScrollEntry = [number, ScrollChange]
export type BpmEntry = [Beat, BpmChange];

export type EntitySpecMap = u.GroupTree<Beat, EntityGroupSpec>

export class Chart {
	constructor(
		public author: string = "",
		// Indexed by time
		public scroll_changes: BTree<number, ScrollChange> = new BTree(),
		public bpms: BTree<Beat, BpmChange> = new BTree(undefined, Beat.compare),
		public entity_specs: EntitySpecMap = new u.GroupTree(Beat.compare),
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
		return this.scroll_changes.getPairOrNextLower(time) ?? Chart.defaultScrollEntry
	}

	mostRecentBPMEntryFrom(beat: Beat): BpmEntry {
		return this.bpms.getPairOrNextLower(beat) ?? this.defaultBPMEntry()
	}

	// Assumes entry is the most recent change before time
	scrollPositionUsingScrollEntry(time: number, entry: ScrollEntry){
		return entry[1].total_distance + (time - entry[0]) * entry[1].mult;
	}
	// Ditto for this one
	hitTimeUsingBPMEntry(beat: Beat, entry: BpmEntry){
		return entry[1].total_time 
			+ Beat.beatsToSeconds(beat.toDecimal() - entry[0].toDecimal(), entry[1].bpm);
	}

	// -----------------------------------------------
	// CHANGING TIMINGS
	// -----------------------------------------------

	addBpmChange(beat: Beat, bpm: number) {
		this.bpms.set(beat, { total_time: this.calculateHitTime(beat), bpm: bpm });
		this.recalculateBpmEntries(beat);
	}

	removeBpmChange(beat: Beat) {
		this.bpms.delete(beat);
		this.recalculateBpmEntries(beat);
	}

	addScrollZone(zone: ScrollZone) {
		const previous_entry = this.mostRecentScrollEntryFrom(zone.timing.time);
		this.scroll_changes.set(zone.timing.time, 
			{ mult: zone.mult, total_distance: this.calculateScrollPosition(zone.timing.time) }
		);
		this.scroll_changes.set(zone.end_time, 
			{ mult: previous_entry[1].mult, total_distance: this.calculateScrollPosition(zone.end_time) }
		);
		this.recalculateScrollEntries(zone.end_timing.beat);
	}

	// Used to recalc timings when BPM or scroll speed is changed at some point in the chart
	// from_beat is where the change happened. I should only be processing notes after from_beat to make
	// this faster, but I can figure it out later if I need to. (Same for the other recalculate functions)
	recalculateEntityTimings(entity_map: EntityMap, _from_beat: Beat): void {
		entity_map.forEachProp((v, b) => {
			v.timing = this.calculateBeatTiming(b);
			if(v.end_timing !== undefined) v.end_timing = this.calculateBeatTiming(v.end_timing.beat); 
		});
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
		return this.entity_specs.map( (es, beat) => this.reviveEntitySpec(es, beat));
	}

	reviveEntitySpec(gs: EntityGroupSpec, beat: Beat): EntityGroup {
		return entityGroupfromGroupSpec(gs, this, beat);
	}

	// -----------------------------------------------
	// JSON
	// -----------------------------------------------

	toJSON(): u.t.JSONfied<Chart> {
		return {
			author: this.author,
			scroll_changes: this.scroll_changes.toArray(),
			bpms: this.bpms.toArray(),
			entity_specs: this.entity_specs.toArray(),
			offset: this.offset,
			initial_bpm: this.initial_bpm
		}
	}

	static fromJSON(str: string): Chart {
		const obj = JSON.parse(str, Chart.jsonReviver);
		
		const chart = new Chart(obj.author, obj.scroll_changes, obj.bpms, obj.entity_specs,
			obj.offset, obj.initial_bpm);

		return chart;
	}

	static jsonReviver(k: string, v: any){
		if(k === "scroll_changes"){
			return new BTree(v);
		} else if (k === "bpms") {
			return new BTree(v.map( ([b, n]: [any, any]) => [Beat.fromJSON(b), n]), Beat.compare);
		} else if (k === "entity_specs"){
			return new u.GroupTree(Beat.compare, v.map( ([b, n]: [any, any]) => [Beat.fromJSON(b), n]));
		} else {
			return v;
		}
	}
}