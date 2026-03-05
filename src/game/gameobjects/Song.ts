import { Note, NoteSpec, Timing } from './Note';
import { Beat } from './Beat';
import { Scene } from 'phaser';
import BTree from 'sorted-btree';
import { Entity } from './NoteFieldRenderer';
import * as u from '../utils';
import * as c from '../config';

export type ScrollChange = {
	mult: number;
	total_distance: number;
}

export type BPMChange = {
	bpm: number,
	total_time: number
}

export type EntityMap = BTree<Beat, Entity>;
export type EntityMapEntry = [Beat, Entity]
export type ScrollEntry = [number, ScrollChange]
export type BPMEntry = [Beat, BPMChange];

export class Chart {
	constructor(
		public author: string = "",
		// Indexed by time
		public scroll_changes: BTree<number, ScrollChange> = new BTree(),
		public bpms: BTree<Beat, BPMChange> = new BTree(),
		public entities: EntityMap = new BTree(undefined, Beat.compare),
		// Offset is used solely to play audio
		// "Playback time" in other objects does not include offset
		public offset: number = 0,
		public initial_bpm: number = c.DEFAULT_BPM
	) {}

	static defaultScrollEntry: ScrollEntry = [0, { mult: 1, total_distance: 0 }];
	defaultBPMEntry(): BPMEntry {
		return [ Beat.ZERO_BEAT(), { bpm: this.initial_bpm, total_time: 0 }]
	}

	calculateBeatTiming(beat: Beat)
			: Timing {
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

	mostRecentBPMEntryFrom(beat: Beat): BPMEntry {
		return this.bpms.getPairOrNextLower(beat) ?? this.defaultBPMEntry()
	}

	// Assumes entry is the most recent change before time
	scrollPositionUsingScrollEntry(time: number, entry: ScrollEntry){
		return entry[1].total_distance + (time - entry[0]) * entry[1].mult;
	}
	// Ditto for this one
	hitTimeUsingBPMEntry(beat: Beat, entry: BPMEntry){
		return entry[1].total_time 
			+ Beat.beatsToSeconds(beat.toDecimal() - entry[0].toDecimal(), entry[1].bpm);
	}

	// Will overwrite a note if it exists at the given beat
	createNote(chars: u.t.Character[], beat: Beat, hold_beat: Beat | undefined, scene: Scene): Note {
		const new_note = new Note(scene, chars, this.calculateBeatTiming(beat), 
			hold_beat === undefined ? undefined : this.calculateBeatTiming(hold_beat));
		this.entities.set(beat, new_note);
		return new_note;
	}

	convertNoteToHold(note: Note, hold_beat: Beat): void {
		note.turnIntoHold(this.calculateBeatTiming(hold_beat));
	}

	notesArray(): Note[] {
		// Works for now, but will have to change when other entities are made
		return this.entities.valuesArray().flat();
	}

	toJSON(): Object {
		return {
			author: this.author,
			scroll_changes: this.scroll_changes.toArray(),
			bpms: this.bpms.toArray(),
			entities: this.entityMapToJSON(),
			offset: this.offset,
			initial_bpm: this.initial_bpm
		}
	}

	entityMapToJSON(): Object {
		return this.entities.valuesArray().flat().map( n => n.toSpec() )
	}

	static fromJSON(str: string, scene: Scene): Chart {
		const obj = JSON.parse(str, Chart.jsonReviver);

		const chart = new Chart(obj.author, obj.scroll_changes, obj.bpms, 
			new BTree(undefined, Beat.compare), obj.offset, obj.initial_bpm);
		
		obj.entities.map( (ns: NoteSpec) => chart.createNote(ns.chars, ns.beat, ns.hold_beat, scene));

		return chart;
	}

	static jsonReviver(k: string, v: any){
		if(k === "scroll_changes"){
			return new BTree(v);
		} else if (k === "bpms"){
			return new BTree(v.map( ([b, n]: [any, any]) => [Beat.fromJSON(b), n]));
		} else if (k === "entities"){
			// TODO: Input validation to make sure we got characters and not any string
			return v.map((n: any) => {
				return {
					chars: n.chars as u.t.Character[] ,
				 	beat: Beat.fromJSON(n.beat) ,
				  	hold_beat: n.hold_beat === undefined ? undefined : Beat.fromJSON(n.hold_beat)
				}
			});
		} else {
			return v;
		}
	}
}