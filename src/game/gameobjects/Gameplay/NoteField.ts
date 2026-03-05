 import { Scene } from 'phaser';
import * as u from '../../utils'
import * as c from '../../config'
import { Note } from '../Note';
import { Chart } from "../Song"
import { Entity, NoteFieldRenderer } from '../NoteFieldRenderer';

export class GameplayNoteField {
	logic: GameplayLogic;
	renderer: GameplayRenderer;

	constructor(scene: Scene, chart: Chart, pt: u.t.Point) {
		const notes = chart.notesArray();

		this.logic = new GameplayLogic(notes);
		this.renderer = new GameplayRenderer(scene, chart, notes, pt);
		this.logic.emitter.addListeners(
			{ event: "NOTE_FINISH", fun: this.renderer.onNoteFinish, context: this.renderer },
			{ event: "NOTE_HIT", fun: this.renderer.onNoteHit, context: this.renderer }
		);
		scene.add.existing(this.renderer);
	}

	myUpdate(time: number) {
		this.logic.myUpdate(time);
		this.renderer.scrollToTime(time);
	}

	handleKeyDown(event: KeyboardEvent) { this.logic.handleKeyDown(event); }
	handleKeyUp(event: KeyboardEvent) { this.logic.handleKeyUp(event); }
}

// Handles hitting notes and underlying gameplay logic
class GameplayLogic {
	notes: Note[];

	held_note: Note | undefined = undefined;
	playback_time: number = 0;
	// Notes before this index can't be hit. Used to cut down on processing
	current_index: number = 0;
	emitter: u.t.MyEmitter = new u.t.MyEmitter();
	score: number = 0;

	constructor(notes: Note[]){
		this.notes = notes;
	}

	handleKeyDown(event: KeyboardEvent): void {
		const key = event.key;
		if(!u.isChar(key)) return;
		const result = this.hittableNotes().find(n => n.canHitChar(key));
		if(result !== undefined) this.hitNote(result, key);
	}

	handleKeyUp(event: KeyboardEvent): void {
		const key = event.key;
		if(!u.isChar(key) || this.held_note === undefined) return;
		if(this.held_note.chars.includes(key) && 
			(this.playback_time - this.held_note.end_time < c.HOLD_BUFFER) ){
			this.held_note = undefined;
			this.makeMissJudgment();
		}
	}

	isNoteHittable(note: Note, time: number){
		const tooLate = note.timing.time < time - c.HIT_BUFFER;
		const tooEarly = note.timing.time > time + c.HIT_BUFFER;
		return !tooLate && !tooEarly
	}

	hittableNotes(): Note[] {
		return u.takeWhile(this.notes_past_index, n => this.isNoteHittable(n, this.playback_time) );
	}

	get notes_past_index(): Note[] {
		return this.notes.slice(this.current_index);
	}

	myUpdate(time: number): void {
		this.missPassedNotes();
		this.updateCurrentIndex();
		this.finishPassedHolds();
		this.playback_time = time; 
	}

	updateCurrentIndex(): void {
		this.current_index = 
			u.marchIndexForward(this.notes, n => n.timing.time < this.playback_time - c.HIT_BUFFER );
	}

	missPassedNotes(): void {
		const to_miss = u.takeWhile(this.notes_past_index, n =>
			(n.timing.time < this.playback_time - c.HIT_BUFFER) && !n.isDone()
		);
		to_miss.forEach(_n => this.makeMissJudgment());
	}

	finishPassedHolds(): void {
		if(this.held_note !== undefined && this.held_note.end_time < this.playback_time + c.HOLD_BUFFER / 4){
			this.emitter.emit("NOTE_FINISH", [ this.held_note ]);
			this.held_note = undefined;
		}
	}

	hitNote(note: Note, char: u.t.Character): void {
		if(!note.canHitChar(char)){
			console.error("Tried to hit an invalid character on a note")
			return;
		}
		note.hit_chars.push(char);
		if(note.isDone()) this.emitter.emit("NOTE_HIT", [note]);
		if(note.isHold()) this.held_note = (note);
		if(note.isDone() && !note.isHold()) {
			this.emitter.emit("NOTE_FINISH", [note]);
			this.judgeHit(note, this.playback_time);
		}
	}

	judgeHit(note: Note, cur_time: number){
		const time_diff = Math.abs(cur_time - note.timing.time);
		const judgment = c.JUDGMENTS.find(j => time_diff < (j.window ?? -1) );
		u.shouldntBeUndefined(judgment, "While judging a hit, the hit was found to be a miss");
		this.emitter.emit("JUDGMENT_MADE", [judgment]);
		this.scoreJudgment(judgment);
	}

	scoreJudgment(judgment: u.t.Judgment){
		this.score += judgment.points;
		this.emitter.emit("SCORE_CHANGED", [this.score]);
	}

	makeMissJudgment(){
		this.score -= c.MISS_JUDGMENT.points;
		this.emitter.emit("JUDGMENT_MADE", [c.MISS_JUDGMENT] );
	}
}

// Gameplay uses a pre-sorted list to hold notes and keeps track of active notes with a simple range
class GameplayRenderer extends NoteFieldRenderer<Entity[], number> {
	constructor(scene: Scene, chart: Chart, notes: Note[], pt: u.t.Point){
		super(scene, chart, chart.entities.valuesArray(), pt);
		notes.map(n => {
			if(n.isHold()) n.drawHoldTail(this.base_scroll_speed);
		})
	}

	override initialActiveRange(): u.t.Range<number> {
		return { start: 0, end: 0 }
	}
	// Even if the chart has no notes to index, we only index with slice which returns []
	override get active_entities(): Entity[] {
		return this.entities.slice(this.active_range.start, this.active_range.end);
	}

	override entitiesToArray(entities: Entity[]): Entity[] { return entities; }

	override findEntitiesFromIndexWhile(index: number, dir: 'forward' | 'backward', 
			pred: (e: Entity) => boolean): [Entity[], number] {
		const ary = (dir === "forward") ? this.entities.slice(index) 
			: this.entities.slice(0, index).toReversed()
		const entities = u.takeWhile(ary, pred);
		return [entities, index + (dir === "backward" ? -1 : 1) * entities.length]
	}

	onNoteHit(_note: Note): void {
		this.scene.tweens.add({
			targets: this.track_container.receptor,
			alpha: { from: 1, to: 0.4 },
			duration: 100,
			ease: 'linear',
			yoyo: true
		})
	}

	onNoteFinish(note: Note): void {
		this.remove(note)
		this.scene.tweens.add({
			targets: note,
			x: 0,
			y: -this.y,
			duration: 200,
			ease: 'Linear',
			onComplete: () => note.destroy()
		});
	} 
}