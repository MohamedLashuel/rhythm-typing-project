import { GameObjects, Scene } from 'phaser';
import * as u from '../../utils'
import * as du from '../../domutils'
import * as c from '../../config'
import * as g from '../../graphics'
import { Entity } from '../Entities/Entity';
import { Beat } from '../Beat';
import { EntityMap, Chart, EntityMapEntry, Song } from "../Song"
import { NoteFieldRenderer } from '../NoteFieldRenderer';
import { Note } from '../Entities/Note';
import { BpmMarker } from '../Entities/BpmMarker';
import InputText from 'phaser3-rex-plugins/plugins/inputtext';
import { ScrollZone } from '../Entities/ScrollZone';

type Cursor = { position: Beat, increment: c.ValidDivision }
const DEFAULT_CURSOR: Readonly<Cursor> = { position: Beat.ZERO_BEAT(), increment: 4 }

export class ChartingNoteField {
	logic: ChartingLogic;
	renderer: ChartingRenderer;
	song: Song;
	current_chart: Chart;
	cursor: Cursor = DEFAULT_CURSOR;
	playback_time: number = 0;
	currently_playing: boolean = false;
	emitter: u.MyEmitter = new u.MyEmitter();
	held?: { beat: Beat, note: Note }

	constructor(scene: Scene, pt: u.t.Point, song: Song, initial_chart: Chart, 
			settings: u.t.GameplaySettings){
		this.song = song;
		this.current_chart = initial_chart;

		const entities = initial_chart.createEntityMap();
		this.logic = new ChartingLogic(initial_chart, entities);
		this.renderer = new ChartingRenderer(scene, settings.render, 
			this.current_chart, entities, pt);

		this.logic.emitter.addListeners(
			{event: "ENTITY_CREATED", fun: this.renderer.onEntityCreated, context: this.renderer},
			{event: "ENTITY_DELETED", fun: this.renderer.onEntityDeleted, context: this.renderer},
			{event: "HOLD_CREATED", fun: this.renderer.onHoldCreated, context: this.renderer},
			{event: "TIMINGS_RECALCULATED", fun: this.renderer.onTimingsRecalculated, context: this.renderer}
		);
	}

	myUpdate(delta_ms: number): void {
		if(this.currently_playing){
			this.playback_time += delta_ms / 1000;
			this.renderer.scrollToTime(this.playback_time);
		}
	}

	// -----------------------------------------------
	// KEYBOARD PROCESSING
	// -----------------------------------------------

	processKeyDownEvent(event: KeyboardEvent): void {
		if(this.currently_playing && event.key !== " "){
			return;
		}
		if(event.ctrlKey) {
			this.processCtrlCommand(event);
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
				Backspace: () => this.logic.deleteNoteAt(this.cursor.position),
				" ": () => this.startOrStopPlayback(),

			}
			funTable[event.key]?.()
		}
	}

	processCtrlCommand(event: KeyboardEvent): void {
		const funTable: Record<string, () => void> = {
			"b": () => this.logic.placeOrRemoveBpmChange(
				(callback, def) => this.renderer.requestNumber(callback, def)
			),
			"z": () => this.logic.placeScrollZonePoint(this.cursor.position,
				(callback, def) => this.renderer.requestNumber(callback, def)
			),
			"s": () => this.downloadSong(),
			"ArrowLeft": () => this.changeScrollSpeed(-20),
			"ArrowRight": () => this.changeScrollSpeed(20),
		}
		funTable[event.key]?.()
	}

	processKeyUpEvent(event: KeyboardEvent): void {
		this.logic.handleKeyUp(event);
	}

	// -----------------------------------------------
	// ACTIONS
	// -----------------------------------------------

	downloadSong(): void {
		this.saveCurrentChart();
		const json_string = JSON.stringify(this.song);
		du.downloadText(json_string, "song.json");
		// For debugging
		console.log(json_string);
	}

	changeScrollSpeed(delta: number): void {
		this.renderer.setBaseScrollSpeed(this.renderer.settings.base_scroll_speed + delta);
	}

	moveCursorBy(increment: c.ValidDivision, dir: "forward" | "backward"): void {
		const new_pos = this.cursor.position.addOrSnapToDivision(increment, dir);
		if(new_pos.measure < 0) return;
		this.moveCursorTo(new_pos);
	}

	movedCursorIncrement(increment: c.ValidDivision, dir: "increase" | "decrease"): c.ValidDivision {
		const new_index = c.VALID_DIVISIONS.indexOf(increment) + (dir === "increase" ? 1 : -1);
		return u.clampedIndex(new_index, c.VALID_DIVISIONS);
	}

	changeCursorIncrement(dir: "increase" | "decrease"){
		const new_inc = this.movedCursorIncrement(this.cursor.increment, dir);
		this.cursor.increment = new_inc;
		this.logic.cursor.increment = new_inc;
		this.renderer.updateCursorIncrement(new_inc);
	}

	startOrStopPlayback(): void {
		if(!this.currently_playing){
			this.emitter.emit("PLAYBACK_START", [this.playback_time + this.current_chart.offset]);
		} else {
			this.emitter.emit("PLAYBACK_STOP", []);
			this.resetPlaybackTime();
		}
		this.currently_playing = !this.currently_playing;
	}

	changeChartIndex(new_ind: number): void {
		this.saveCurrentChart();
		const new_chart = this.song.charts[new_ind] ?? this.song.charts[0];
		const entities = new_chart.createEntityMap();
		
		this.current_chart = new_chart;

		this.renderer.loadChart(new_chart, entities);
		this.renderer.scrollToTime(this.playback_time);

		this.logic.chart = new_chart;
		this.logic.entities = entities;
	}

	// -----------------------------------------------
	// HELPERS
	// -----------------------------------------------

	updateCursorPosition(new_pos: Beat): void {
		this.cursor.position = new_pos;
		this.logic.cursor.position = new_pos;
		this.renderer.updateCursorPosition(new_pos);
	}

	moveCursorTo(new_pos: Beat): void {
		this.playback_time = this.logic.chart.calculateHitTime(new_pos);
		this.renderer.scrollToTime(this.playback_time);
		this.updateCursorPosition(new_pos);
	}

	// When stopping playback, move playback time back to the cursor
	resetPlaybackTime(): void {
		const new_time = this.current_chart.calculateHitTime(this.cursor.position);
		this.playback_time = new_time;
		this.renderer.scrollToTime(new_time);
	}

	saveCurrentChart(): void {
		this.current_chart.entity_specs = this.logic.entities.mapProps(e => e.toJSON());
	}
}

class ChartingLogic {
	cursor: Cursor = DEFAULT_CURSOR;
	held: { beat: Beat, note: Note } | undefined = undefined;
	emitter: u.MyEmitter = new u.MyEmitter();
	zone_point: Beat | undefined = undefined;

	constructor(
		public chart: Chart,
		public entities: EntityMap){}

	placeOrRemoveChar(char: u.t.Character){
		const existing_note = this.entities.getProp(this.cursor.position, "note");
		const new_chars = (existing_note === undefined) ? [char] 
			: u.toggleInclusion(existing_note.chars, char)

		if(new_chars.length === 0){
			this.entities.deleteProp(this.cursor.position, "note");
		} else {
			const new_note = new Note(new_chars, this.chart.calculateBeatTiming(this.cursor.position));
			this.entities.setProp(this.cursor.position, "note", new_note);
			this.emitter.emit("ENTITY_CREATED", [new_note, this.cursor.position]);
			this.held = { beat: this.cursor.position, note: new_note };
		}
		if(existing_note !== undefined) this.emitter.emit("ENTITY_DELETED", [existing_note]);
	}

	deleteNoteAt(beat: Beat){
		const existing_note = this.entities.getProp(beat, "note");
		if(existing_note !== undefined){
			this.entities.deleteProp(beat, "note");
			this.emitter.emit("ENTITY_DELETED", [existing_note]);
		}
	}

	placeOrRemoveBpmChange(requester: (fun: (x: number) => void, def: number) => void) {
		const existing_change = this.entities.getProp(this.cursor.position, "bpm_marker")
		if(existing_change !== undefined){
			// Delete case
			this.entities.deleteProp(this.cursor.position, "bpm_marker");
			this.emitter.emit("ENTITY_DELETED", [existing_change]);
			this.chart.removeBpmChange(this.cursor.position);
		} else {
			// Create case
			requester(new_bpm => {
				if(new_bpm <= 0) return;
				const marker = new BpmMarker(this.chart.calculateBeatTiming(this.cursor.position), new_bpm);
				this.entities.setProp(this.cursor.position, "bpm_marker", marker);
				this.emitter.emit("ENTITY_CREATED", [marker, this.cursor.position]);
				this.chart.addBpmChange(this.cursor.position, new_bpm);
			}, c.DEFAULT_BPM);
		}
		this.chart.recalculateEntityTimings(this.entities, this.cursor.position);
		this.emitter.emit("TIMINGS_RECALCULATED", [this.cursor.position]);
	}

	placeScrollZonePoint(beat: Beat, requester: (fun: (x: number) => void, def: number) => void){
		if(this.zone_point === undefined){
			// Setting first point
			this.zone_point = beat;
			return;
		} else {
			// Setting second point and creating zone
			const smaller = Beat.compare(this.zone_point, beat) > 0 ? beat : this.zone_point;
			const larger = Beat.compare(this.zone_point, beat) > 0 ? this.zone_point : beat;
			requester(mult => {
				const zone = new ScrollZone(this.chart.calculateBeatTiming(smaller),
					this.chart.calculateBeatTiming(larger), mult);
				this.entities.setProp(smaller, "scroll_zone", zone);
				this.emitter.emit("ENTITY_CREATED", [zone, beat]);
				this.chart.addScrollZone(zone);
				this.chart.recalculateEntityTimings(this.entities, beat);
				this.emitter.emit("TIMINGS_RECALCULATED", [beat]);
			}, 1)
			this.zone_point = undefined;
		}
	}

	handleKeyUp(event: KeyboardEvent){
		const key = event.key;
		if(!u.isChar(key)
			|| this.held === undefined
			|| !this.held.note.chars.includes(key)){

			return;
		}

		if(Beat.compare(this.cursor.position, this.held.beat)) {
			this.held.note.turnIntoHold(this.chart.calculateBeatTiming(this.cursor.position));
			this.emitter.emit("HOLD_CREATED", [this.held.note]);
		}
		this.held = undefined;
	}
}

class ChartingRenderer extends NoteFieldRenderer<EntityMap, Beat> {
	active_range: u.t.Range<Beat> = { start: Beat.ZERO_BEAT(), end: Beat.ZERO_BEAT()}
	cursor: Cursor = DEFAULT_CURSOR;
	info_text: InfoText;

	constructor(scene: Scene, settings: u.t.GameplaySettings["render"], chart: Chart, entities: EntityMap, 
			pt: u.t.Point){
		super(scene, settings, chart, entities, pt);
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

	override entitiesToArray(entities: EntityMap): Entity[] {
		return u.flatProperties(entities.valuesArray());
	}

	// Return note entries after a key while a predicate returns true
	takeEntriesFromKeyWhile(key: Beat, pred: (a: EntityMapEntry) => boolean, 
		dir: "forward" | "backward" = "forward")
			: [EntityMapEntry[], EntityMapEntry | undefined] {
		const itr = (dir === "backward") ? this.entities.entriesReversed(key) : this.entities.entries(key);
		return u.iterateWhile(itr, ([k, v]) => pred([k, v]))
	}

	override findEntitiesFromIndexWhile(index: Beat, dir: "forward" | "backward", 
			pred: (e: Entity) => boolean): [Entity[], Beat] {
		const [entries, last_entry] = this.takeEntriesFromKeyWhile(index,
			([_k, v]) => {
				const entity_maybe = Object.values(v)[0];
				if(entity_maybe === undefined) console.error("Iterated through empty entity group")
				return entity_maybe === undefined ? true : pred(entity_maybe);
			}, dir);
		const default_val = (dir === "forward") ? this.entitiesSafeMaxKey() : Beat.ZERO_BEAT();
		const entities = entries.map( ( [_k, v] ) => v).map(g => Object.values(g)).flat();
		return [entities, (last_entry === undefined) ? default_val : last_entry[0]];
	}

	override get active_entities(): Entity[] {
		const [active_entries, _last] = 
			this.takeEntriesFromKeyWhile(this.active_range.start, 
				([k, _v]) => Beat.compare(k, this.active_range.end) <= 0)
		return u.flatProperties(active_entries.map( ([_k, v]) => v))
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

	onEntityCreated(ent: Entity, beat: Beat): void {
		this.addEntity(ent);
		this.expandActiveRangeTo(beat);
		// Because active range now includes beat, ent is definitely within the active range
		// and should be visible
		ent.activate();
		// E.g. notes will already be at the right spot, but e.g. scroll zones might not be
		this.moveEntity(ent);
	}

	onEntityDeleted(ent: Entity): void {
		this.entity_container.remove(ent.graphic);
		ent.deactivate();
	}

	onHoldCreated(note: Note): void {
		this.redraw(note);
	}

	// If any active notes had timings recalculated, just reset all active notes 
	onTimingsRecalculated(at: Beat): void {
		if(Beat.compare(this.active_range.end, at) > 0) this.resetWhichEntitiesActive(this.cursor.position);
		this.entities.forEachProp(e => {
			if(e.end_timing !== undefined) e.draw(this.scene, this.settings);
		})
		// Change scroll position and move entities accordingly
		this.scrollToTime(this.playback_time);
	}

	// -----------------------------------------------
	// NUMBER INPUT
	// -----------------------------------------------

	requestNumber(callback: (x: number) => void, def: number): void {
		const input = new InputText(this.scene, g.WIDTH / 2, g.HEIGHT / 2, 400, 100, {
			text: def.toString()
		}).setOrigin(0.5);
		this.scene.add.existing(input);

		input.setFocus()
		.once('blur', (txt: InputText) => {
			callback(Number(txt.text));
			txt.destroy();
		})
		.on('keydown', (txt: InputText, evt: KeyboardEvent) => {
			if(evt.key !== "Backspace" && evt.key !== "." && !u.isNum(evt.key)) evt.preventDefault();
			if(evt.key === "Enter") txt.setBlur();
		});
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