import { GameObjects, Scene } from 'phaser';
import * as u from '../../utils'
import * as c from '../../config'
import * as g from '../../graphics'
import { Note } from '../Note';
import { Beat } from '../Beat';
import { EntityMap, Chart, EntityMapEntry } from "../Song"
import { Entity, NoteFieldRenderer } from '../NoteFieldRenderer';

type Cursor = { position: Beat, increment: c.ValidDivision }
const DEFAULT_CURSOR: Readonly<Cursor> = { position: Beat.ZERO_BEAT(), increment: 4 }

export class ChartingNoteField {
	logic: ChartingLogic;
	renderer: ChartingRenderer;
	chart: Chart;
	cursor: Cursor = DEFAULT_CURSOR;
	playback_time: number = 0;
	currently_playing: boolean = false;
	emitter: u.t.MyEmitter = new u.t.MyEmitter();
	held?: { beat: Beat, note: Note }

	// Can start from scratch with no chart, or continue editing an existing chart
	constructor(scene: Scene, pt: u.t.Point, initial_chart: Chart){
		this.chart = initial_chart;

		this.logic = new ChartingLogic(scene, this.chart, this.chart.entities);
		this.renderer = new ChartingRenderer(scene, this.chart, this.chart.entities, pt)

		this.logic.emitter.addListeners(
			{event: "NOTE_CREATED" ,fun: this.renderer.onNoteCreated, context: this.renderer},
			{event: "NOTE_DELETED" ,fun: this.renderer.onNoteDeleted, context: this.renderer},
			{event: "HOLD_CREATED" ,fun: this.renderer.onHoldCreated, context: this.renderer},
		);
	}

	myUpdate(delta_ms: number): void {
		if(this.currently_playing){
			this.playback_time += delta_ms / 1000;
			this.renderer.scrollToTime(this.playback_time);
		}
	}

	handleKeyDown(event: KeyboardEvent): void {
		if(event.ctrlKey) {
			this.handleCtrlCommand(event);
			return;
		}
		if(this.currently_playing && event.key !== " "){
			return;
		}
		if(u.isChar(event.key)){
			this.logic.placeOrRemoveChar(event.key);
		} else {
			const funTable: Record<string, () => void> = {
				ArrowLeft: () => this.moveCursorBy(this.cursor.increment, "backward"),
				ArrowRight: () => this.moveCursorBy(this.cursor.increment, "forward"),
				ArrowUp: () => this.changeCursorIncrement("increase"),
				ArrowDown: () => this.changeCursorIncrement("decrease"),
				Backspace: () => this.deleteNoteAt(this.cursor.position),
				" ": () => this.startOrStopPlayback(),

			}
			funTable[event.key]?.()
		}
	}

	handleCtrlCommand(event: KeyboardEvent): void {
		const funTable: Record<string, () => void> = {
			"s": () => {
				event.preventDefault();
				this.saveChart();
			},
			"ArrowLeft": () => this.changeScrollSpeed(-20),
			"ArrowRight": () => this.changeScrollSpeed(20),
		}
		funTable[event.key]?.()
	}

	saveChart(): void {
		this.chart.entities = this.logic.entities;
		console.log(JSON.stringify(this.chart));
	}

	changeScrollSpeed(delta: number): void {
		this.renderer.setBaseScrollSpeed(this.renderer.base_scroll_speed + delta);
	}

	handleKeyUp(event: KeyboardEvent): void {
		this.logic.handleKeyUp(event);
	}

	moveCursorTo(new_pos: Beat): void {
		this.playback_time = this.chart.calculateHitTime(new_pos);
		this.renderer.scrollToTime(this.playback_time);
		this.updateCursorPosition(new_pos);
	}

	moveCursorBy(increment: c.ValidDivision, dir: "forward" | "backward"): void {
		const new_pos = this.cursor.position.addOrSnapToDivision(increment, dir);
		if(new_pos.measure < 0) return;
		this.moveCursorTo(new_pos);
	}

	movedCursorIncrement(increment: c.ValidDivision, dir: "increase" | "decrease"): c.ValidDivision{
		const new_index = c.VALID_DIVISIONS.indexOf(increment) + (dir === "increase" ? 1 : -1);
		return u.clampedIndex(new_index, c.VALID_DIVISIONS);
	}

	changeCursorIncrement(dir: "increase" | "decrease"){
		const new_inc = this.movedCursorIncrement(this.cursor.increment, dir);
		this.cursor.increment = new_inc;
		this.logic.cursor.increment = new_inc;
		this.renderer.updateCursorIncrement(new_inc);
	}

	updateCursorPosition(new_pos: Beat): void {
		this.cursor.position = new_pos;
		this.logic.cursor.position = new_pos;
		this.renderer.updateCursorPosition(new_pos);
	}

	deleteNoteAt(beat: Beat): void {
		this.logic.deleteNoteAt(beat);
	}

	startOrStopPlayback(): void {
		if(!this.currently_playing){
			this.emitter.emit("PLAYBACK_START", [this.playback_time + this.chart.offset]);
		} else {
			this.emitter.emit("PLAYBACK_STOP", []);
			this.resetPlaybackTime();
		}
		this.currently_playing = !this.currently_playing;
	}

	// When stopping playback, move playback time back to the cursor
	resetPlaybackTime(): void {
		const new_time = this.chart.calculateHitTime(this.cursor.position);
		this.playback_time = new_time;
		this.renderer.scrollToTime(new_time);
	}
}

class ChartingLogic {
	cursor: Cursor = DEFAULT_CURSOR;
	held: { beat: Beat, note: Note } | undefined = undefined;
	emitter: u.t.MyEmitter = new u.t.MyEmitter();

	constructor(
		public scene: Scene, 
		public chart: Chart, 
		public entities: EntityMap){}

	placeOrRemoveChar(char: u.t.Character){
		const existing_note = this.entities.get(this.cursor.position);
		const new_chars = (existing_note === undefined) ? [char] 
			: u.toggleInclusion(existing_note.chars, char)

		if(new_chars.length === 0){
			this.entities.delete(this.cursor.position);
		} else {
			const new_note = this.chart.createNote(new_chars, this.cursor.position, undefined, this.scene);
			this.emitter.emit("NOTE_CREATED", [new_note, this.cursor.position]);
			this.held = { beat: this.cursor.position, note: new_note };
		}
		if(existing_note !== undefined) this.emitter.emit("NOTE_DELETED", [existing_note]);
	}

	deleteNoteAt(beat: Beat){
		const existing_note = this.entities.get(beat);
		if(existing_note !== undefined){
			this.entities.delete(beat);
			this.emitter.emit("NOTE_DELETED", [existing_note]);
		}
	}

	handleKeyUp(event: KeyboardEvent){
		const key = event.key;
		if(!u.isChar(key)
			|| this.held === undefined
			|| !this.held.note.chars.includes(key)){

			return;
		}

		if(this.held.beat < this.cursor.position){
			this.chart.convertNoteToHold(this.held.note, this.cursor.position);
			this.emitter.emit("HOLD_CREATED", [this.held.note]);
		}
		this.held = undefined;
	}
}

class InfoText extends GameObjects.Container {
	beat: GameObjects.Text;
	pb_time: GameObjects.Text;
	increment: GameObjects.Text;

	constructor(scene: Scene, initial_txt: { beat: any, pb_time: any, increment: any}) {
		super(scene, 0, g.INFO_TEXT_Y);

		this.beat = new GameObjects.Text(scene, 0, 0, initial_txt.beat.toString(), g.NOTE_STYLE);
		this.pb_time = new GameObjects.Text(scene, 400, 0, initial_txt.pb_time.toString(), g.NOTE_STYLE);
		this.increment = new GameObjects.Text(scene, 800, 0, initial_txt.increment.toString(), g.NOTE_STYLE);

		this.add( [ this.beat, this.pb_time, this.increment ] );
	}
}

class ChartingRenderer extends NoteFieldRenderer<EntityMap, Beat> {
	active_range: u.t.Range<Beat> = { start: Beat.ZERO_BEAT(), end: Beat.ZERO_BEAT()}
	cursor: Cursor = DEFAULT_CURSOR;
	info_text: InfoText;

	constructor(scene: Scene, chart: Chart, notes: EntityMap, pt: u.t.Point){
		super(scene, chart, notes, pt);
		this.info_text = new InfoText(scene, { beat: 0, pb_time: 0, increment: DEFAULT_CURSOR.increment });
		this.add(this.info_text);
	}

	// -----------------------------------------------
	// NOTEFIELDRENDERER IMPLEMENTATION
	// -----------------------------------------------

	override initialActiveRange(): u.t.Range<Beat> {
		return { start: Beat.ZERO_BEAT(), end: Beat.ZERO_BEAT() }
	}

	// maxKey on note map returns undefined if there are no keys. In this case, return the zero beat
	entitiesSafeMaxKey(): Beat {
		return this.entities.maxKey() ?? Beat.ZERO_BEAT();
	}

	override entitiesToArray(notes: EntityMap): Note[] {
		return notes.valuesArray().flat();
	}

	// Return note entries after a key while a predicate returns true
	takeEntriesFromKeyWhile(key: Beat, pred: (a: EntityMapEntry) => boolean, 
		dir: "forward" | "backward" = "forward")
			: [EntityMapEntry[], EntityMapEntry | undefined] {
		const itr = (dir === "backward") ? this.entities.entriesReversed(key) : this.entities.entries(key);
		return u.iterateWhile(itr, ([k, v]) => pred([k, v]))
	}

	override findEntitiesFromIndexWhile(index: Beat, dir: "forward" | "backward", pred: (n: Note) => boolean)
			: [Entity[], Beat] {
		const [entries, last_entry] = this.takeEntriesFromKeyWhile(index,
			([_k, v]) => {
				return pred(v)
			}, dir);
		const default_val = (dir === "forward") ? this.entitiesSafeMaxKey() : Beat.ZERO_BEAT();
		const entities = entries.map( ( [_k, v] ) => v);
		return [entities, (last_entry === undefined) ? default_val : last_entry[0]];
	}

	override get active_entities(): Note[] {
		const [active_entries, _last] = 
			this.takeEntriesFromKeyWhile(this.active_range.start, 
				([k, _v]) => Beat.compare(k, this.active_range.end) <= 0)
		return active_entries.map( ([_k, v]) => v)
	}

	// Expand the active range to ensure it covers the provided beat
	expandActiveRangeTo(beat: Beat): void {
		if(Beat.compare(beat, this.active_range.end) > 0) this.active_range.end = beat;
		if(Beat.compare(beat, this.active_range.start) < 0) this.active_range.start = beat;
	}

	// -----------------------------------------------
	// CHARTING FUNCTIONALITY
	// -----------------------------------------------

	updateCursorPosition(new_pos: Beat): void {
		this.cursor.position = new_pos;
		this.info_text.beat.setText( (new_pos.toDecimal() / 4).toFixed(3));
		this.info_text.pb_time.setText(this.chart.calculateHitTime(new_pos).toFixed(3));
	}

	updateCursorIncrement(new_inc: c.ValidDivision): void {
		this.cursor.increment = new_inc;
		this.info_text.increment.setText(new_inc.toString());
	}

	onNoteCreated(note: Note, beat: Beat): void {
		this.entity_container.add(note);
		note.activate();
		this.expandActiveRangeTo(beat);
	}

	onHoldCreated(note: Note): void {
		note.drawHoldTail(this.base_scroll_speed);
	}

	onNoteDeleted(note: Note): void {
		this.entity_container.remove(note);
		note.deactivate();
	}
}