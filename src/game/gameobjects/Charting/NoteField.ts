import { GameObjects, Scene } from 'phaser';
import * as u from '../../helpers/utils'
import * as c from '../../config'
import * as g from '../../graphics'
import * as actions from './Actions'
import { Entity } from '../Entities/Entity';
import { Beat } from '../Beat';
import { EntityMap, Chart, Song } from "../Song"
import { NoteFieldRenderer } from '../NoteFieldRenderer';
import { Note } from '../Entities/Note';
import { BpmMarker } from '../Entities/BpmMarker';
import InputText from 'phaser3-rex-plugins/plugins/inputtext';
import { ScrollZone } from '../Entities/ScrollZone';
import { EntityGroup, EntityKey, UsedEntity } from '../Entities/EntityGroup';
import { ChartingEvents, GameplaySettings, PlaybackEvents } from '../types';
import { Character, Point } from '../../helpers/types';
import { MyEmitter } from '../../phaser-wrappers/MyEmitter';

export type Cursor = { position: Beat, increment: c.ValidDivision }
const DEFAULT_CURSOR: Readonly<Cursor> = { position: Beat.ZERO_BEAT(), increment: 4 }

type NumberRequester = (fun: (x: number) => void, def: number) => void;

export class ChartingNoteField {
	logic: ChartingLogic;
	renderer: ChartingRenderer;
	song: Song;
	current_chart: Chart;
	currently_playing: boolean = false;
	emitter: MyEmitter<PlaybackEvents> = new MyEmitter();
	action_queue: actions.ChartingActionWithData<unknown>[] = [];

	constructor(scene: Scene, pt: Point, song: Song, initial_chart: Chart, settings: GameplaySettings){
		this.song = song;
		this.current_chart = initial_chart;

		const entities = initial_chart.createEntityMap();
		this.logic = new ChartingLogic(initial_chart, entities);
		this.renderer = new ChartingRenderer(scene, settings.render, this.current_chart, entities, pt);

		this.logic.emitter.addListeners(
			{event: "ENTITY_CREATED", fun: this.renderer.onEntityCreated, context: this.renderer},
			{event: "ENTITY_DELETED", fun: this.renderer.onEntityDeleted, context: this.renderer},
			{event: "HOLD_CREATED", fun: this.renderer.onHoldCreated, context: this.renderer},
			{event: "TIMINGS_RECALCULATED", fun: this.renderer.onTimingsRecalculated, context: this.renderer},
			{event: "CURSOR_CHANGED", fun: this.renderer.onCursorChanged, context: this.renderer}
		);
	}

	// pb_time is undefined if not currently playing or audio is not loaded correctly
	myUpdate(pb_time: number | undefined): void {
		if(this.currently_playing && pb_time !== undefined) this.renderer.scrollToTime(pb_time);
	}

	updateSettings(settings: GameplaySettings): void {
		this.renderer.settings = settings.render;
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
			this.performAction(actions.placeOrRemoveChar, { beat: this.logic.cursor.position, char: event.key});
		} else {
			const funTable: Record<string, () => void> = {
				ArrowLeft: () => this.logic.moveCursorBy(this.logic.cursor.increment, "backward"),
				ArrowRight: () => this.logic.moveCursorBy(this.logic.cursor.increment, "forward"),
				ArrowUp: () => this.logic.changeCursorIncrement("increase"),
				ArrowDown: () => this.logic.changeCursorIncrement("decrease"),
				Backspace: () => this.logic.deleteNoteAt(this.logic.cursor.position),
				" ": () => this.startOrStopPlayback(),

			}
			funTable[event.key]?.()
		}
	}

	processCtrlCommand(event: KeyboardEvent): void {
		const funTable: Record<string, () => void> = {
			"b": () => this.placeOrRemoveBpmChange(this.logic.cursor.position),
			"u": () => this.undoLastAction(),
			"z": () => this.logic.placeScrollZonePoint(this.logic.cursor.position,
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

	performAction<E, U>(action: actions.ChartingAction<E, U>, data: E): void {
		const undo_data = action.execute(this, data);
		this.action_queue.push( { action: action, undo_data: undo_data, redo_data: data });
	}

	undoLastAction(): void {
		const result = this.action_queue.pop();
		if(result === undefined) return;
		result.action.undo(this, result.undo_data);
	}

	downloadSong(): void {
		this.saveCurrentChart();
		const json_string = JSON.stringify(this.song);
		u.downloadText(json_string, "song.json");
		// For debugging
		console.log(json_string);
	}

	changeScrollSpeed(delta: number): void {
		this.renderer.setBaseScrollSpeed(this.renderer.settings.base_scroll_speed + delta);
	}

	startOrStopPlayback(): void {
		if(!this.currently_playing){
			this.emitter.emit("PLAYBACK_START", [this.logic.playback_time]);
		} else {
			this.emitter.emit("PLAYBACK_STOP", []);
			this.resetPlaybackTime();
		}
		this.currently_playing = !this.currently_playing;
		this.renderer.currently_playing = !this.renderer.currently_playing;
	}

	changeChartIndex(new_ind: number): void {
		this.saveCurrentChart();
		const new_chart = this.song.charts[new_ind] ?? this.song.charts[0];
		const entities = new_chart.createEntityMap();
		
		this.current_chart = new_chart;

		this.renderer.loadChart(new_chart, entities);
		this.renderer.scrollToTime(0);

		this.logic.cursor = DEFAULT_CURSOR
		this.logic.chart = new_chart;
		this.logic.entities = entities;
	}

	placeOrRemoveBpmChange(beat: Beat): void {
		const existing_marker = this.logic.entities.getProp(beat, "bpm_marker");
		if(existing_marker === undefined){
			this.renderer.requestNumber(x => {
				this.performAction(actions.placeBpmChange, { beat: beat, bpm: x});
			}, c.DEFAULT_BPM);
		} else {
			this.performAction(actions.removeBpmChange, { beat: beat, marker: existing_marker })
		}
	}

	// -----------------------------------------------
	// HELPERS
	// -----------------------------------------------

	// When stopping playback, move playback time back to the cursor
	resetPlaybackTime(): void {
		const new_time = this.current_chart.calculateHitTime(this.logic.cursor.position);
		this.renderer.scrollToTime(new_time);
	}

	saveCurrentChart(): void {
		this.current_chart.entity_specs = this.logic.entities.mapProps(e => e.toJSON());
	}
}

class ChartingLogic {
	cursor: Cursor = DEFAULT_CURSOR;
	held: { beat: Beat, note: Note } | undefined = undefined;
	emitter: MyEmitter<ChartingEvents> = new MyEmitter();
	zone_point: Beat | undefined = undefined;

	constructor(
		public chart: Chart,
		public entities: EntityMap
	){}

	// If a note is being held and was released, turn it into a hold note
	handleKeyUp(event: KeyboardEvent): void {
		const key = event.key;
		if(!u.isChar(key) || this.held === undefined || !this.held.note.chars.includes(key)) return;

		if(Beat.compare(this.cursor.position, this.held.beat) > 0) {
			this.held.note.turnIntoHold(this.chart.calculateBeatTiming(this.cursor.position));
			this.emitter.emit("HOLD_CREATED", [this.held.note]);
		}
		this.held = undefined;
	}

	get playback_time(): number {
		return this.chart.calculateHitTime(this.cursor.position);
	}

	// -----------------------------------------------
	// ACTIONS
	// -----------------------------------------------

	moveCursorBy(increment: c.ValidDivision, dir: "forward" | "backward"): void {
		const new_pos = this.cursor.position.addOrSnapToDivision(increment, dir);
		if(new_pos.measure < 0) return;
		this.cursor.position = new_pos;
		this.emitter.emit("CURSOR_CHANGED", [this.cursor]);
	}

	changeCursorIncrement(dir: "increase" | "decrease"): void {
		const new_inc = this.movedCursorIncrement(this.cursor.increment, dir);
		this.cursor.increment = new_inc;
		this.emitter.emit("CURSOR_CHANGED", [this.cursor]);
	}

	placeOrRemoveChar(beat: Beat, char: Character): void {
		const existing_note = this.entities.getProp(beat, "note");
		const new_chars = (existing_note === undefined) ? [char] 
			: u.toggleInclusion(existing_note.chars, char);

		if(existing_note !== undefined) this.deleteEntity(beat, "note", existing_note);

		if(new_chars.length > 0) {
			const new_note = new Note(new_chars, this.chart.calculateBeatTiming(beat));
			this.createEntity(beat, "note", new_note);
			this.held = { beat: beat, note: new_note };
		}
	}

	deleteNoteAt(beat: Beat): void {
		const existing_note = this.entities.getProp(beat, "note");
		if(existing_note !== undefined) this.deleteEntity(beat, "note", existing_note);
	}

	placeBpmChange(beat: Beat, bpm: number): BpmMarker {
		const marker = new BpmMarker(this.chart.calculateBeatTiming(beat), bpm);
		this.createEntity(beat, "bpm_marker", marker);
		this.chart.addBpmChange(beat, bpm);
		this.recalculateTimings(beat);
		return marker;
	}

	// Returns BPM of the deleted change
	removeBpmChange(beat: Beat, marker: BpmMarker): number {
		this.deleteEntity(beat, "bpm_marker", marker);
		this.chart.removeBpmChange(beat);
		this.recalculateTimings(beat);
		return marker.bpm;
	}

	placeScrollZonePoint(beat: Beat, requester: NumberRequester): void {
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
				this.createEntity(smaller, "scroll_zone", zone);
				this.chart.addScrollZone(zone);
				this.recalculateTimings(beat);
			}, 1)
			this.zone_point = undefined;
		}

	}

	// -----------------------------------------------
	// HELPERS
	// -----------------------------------------------

	createEntity<P extends EntityKey>(beat: Beat, prop: P, ent: EntityGroup[P]): void {
		this.entities.setProp(beat, prop, ent);
		this.emitter.emit("ENTITY_CREATED", [ent]);
	}

	deleteEntity<P extends EntityKey>(beat: Beat, prop: P, ent: EntityGroup[P]): void {
		this.entities.deleteProp(beat, prop);
		this.emitter.emit("ENTITY_DELETED", [ent]);
	}

	recalculateTimings(beat: Beat): void {
		this.chart.recalculateEntityTimings(this.entities, beat);
		this.emitter.emit("TIMINGS_RECALCULATED", [beat]);
	}

	movedCursorIncrement(increment: c.ValidDivision, dir: "increase" | "decrease"): c.ValidDivision {
		const new_index = c.VALID_DIVISIONS.indexOf(increment) + (dir === "increase" ? 1 : -1);
		return u.clampedIndex(new_index, c.VALID_DIVISIONS);
	}
}

class ChartingRenderer extends NoteFieldRenderer {
	info_text: InfoText; 
	currently_playing: boolean = false;
	emitter: MyEmitter<ChartingEvents> = new MyEmitter();

	constructor(scene: Scene, settings: GameplaySettings["render"], chart: Chart, entities: EntityMap, 
			pt: Point){
		super(scene, settings, chart, entities, pt);
		this.info_text = new InfoText(scene, { beat: 0, pb_time: 0, increment: DEFAULT_CURSOR.increment });
		this.add(this.info_text);
	}

	// During playback, play a hit sound when a note occurs
	override moveEntity(e: Entity): void {
		const old_x = e.graphic.x;
		super.moveEntity(e);
		if(!(e instanceof Note)) return;
		const crossed = old_x >= 0 && e.graphic.x < 0;
		if(this.currently_playing && crossed) this.emitter.emit("PLAY_HIT_SOUND", []);
	}

	// -----------------------------------------------
	// CHARTING FUNCTIONALITY
	// -----------------------------------------------

	onCursorChanged(cursor: Cursor): void {
		this.updateCursorPosition(cursor.position);
		this.updateCursorIncrement(cursor.increment);
	}

	onEntityCreated(ent: UsedEntity): void {
		this.addEntity(ent);
		// E.g. notes will already be at the right spot, but e.g. scroll zones might not be
		this.moveEntity(ent);
	}

	onEntityDeleted(ent: UsedEntity): void {
		this.deleteEntity(ent);
		this.entity_container.remove(ent.graphic);
		ent.deactivate();
	}

	onHoldCreated(note: Note): void {
		this.redraw(note);
	}

	// If any active notes had timings recalculated, just reset all active notes 
	onTimingsRecalculated(at: Beat): void {
		const pos = this.chart.calculateBeatTiming(at).scroll_pos;
		if(this.active_range === undefined || pos > this.active_range.left.key) 
			this.resetWhichEntitiesActive(pos);
		
		this.entities.forEachProp(e => {
			if(e.end_timing !== undefined) e.draw(this.scene, this.settings);
		})
		// Change scroll position and move entities accordingly
		this.scrollToTime(this.playback_time);
	}

	// -----------------------------------------------
	// HELPERS
	// -----------------------------------------------

	updateCursorPosition(new_pos: Beat): void {
		this.info_text.beat.setText( (new_pos.toDecimal() / 4).toFixed(3));
		this.info_text.pb_time.setText(this.chart.calculateHitTime(new_pos).toFixed(3));
		this.scrollToTime(this.chart.calculateHitTime(new_pos));
	}

	updateCursorIncrement(new_inc: c.ValidDivision): void {
		this.info_text.increment.setText(new_inc.toString());
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

	constructor(scene: Scene, initial_txt: { beat: number, pb_time: number, increment: number }) {
		super(scene, 0, g.INFO_TEXT_Y);

		this.beat = new GameObjects.Text(scene, 0, 0, initial_txt.beat.toString(), g.NOTE_STYLE);
		this.pb_time = new GameObjects.Text(scene, 400, 0, initial_txt.pb_time.toString(), g.NOTE_STYLE);
		this.increment = new GameObjects.Text(scene, 800, 0, initial_txt.increment.toString(), g.NOTE_STYLE);

		this.add( [ this.beat, this.pb_time, this.increment ] );
	}
}