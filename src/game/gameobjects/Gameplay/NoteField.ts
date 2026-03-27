import { Scene } from 'phaser';
import * as u from '../../helpers/utils'
import * as c from '../../config'
import { Timing } from '../Entities/Entity';
import { Chart, EntityMap } from "../Song"
import { NoteFieldRenderer } from '../NoteFieldRenderer';
import { KeyboardManager } from '../../phaser-wrappers/KeyboardManager';
import { Note } from '../Entities/Note';
import { Character, Point } from '../../helpers/types';
import { GameplayEvents, GameplaySettings, Judgment } from '../types';
import { MyEmitter } from '../../phaser-wrappers/MyEmitter';

export class GameplayNoteField {
	logic: GameplayLogic;
	renderer: GameplayRenderer;
	keyboard: KeyboardManager;

	constructor(scene: Scene, chart: Chart, settings: GameplaySettings, 
			keyboard: KeyboardManager, pt: Point) {
		const entities = chart.createEntityMap();
		this.logic = new GameplayLogic(entities);
		this.renderer = new GameplayRenderer(scene, settings.render, chart, entities, pt);
		this.logic.emitter.addListeners(
			{ event: "NOTE_FINISH", fun: this.renderer.onNoteFinish, context: this.renderer },
			{ event: "NOTE_HIT", fun: this.renderer.onNoteHit, context: this.renderer }
		);
		scene.add.existing(this.renderer);

		this.keyboard = keyboard;
	}

	myUpdate(time: number): void {
		this.renderer.scrollToTime(time);
		this.logic.myUpdate(time);
		this.keyboard.handleQueues(evt => this.logic.processKeyDownEvent(evt),
			evt => this.logic.processKeyUpEvent(evt));
	}
}

// Handles hitting notes and underlying gameplay logic
class GameplayLogic {
	notes: Note[];

	held_note: (Note & { end_timing: Timing }) | undefined = undefined;
	playback_time: number = 0;
	// Notes before this index can't be hit. Used to cut down on processing
	current_index: number = 0;
	emitter: MyEmitter<GameplayEvents> = new MyEmitter();
	score: number = 0;
	judgments: Judgment[] = [];

	constructor(entities: EntityMap){
		this.notes = entities
			.valuesArray()
			.map(group => group.note)
			.filter(n => n !== undefined);
	}

	// -----------------------------------------------
	// KEYBOARD PROCESSING
	// -----------------------------------------------

	processKeyDownEvent(event: KeyboardEvent): void {
		const key = event.key;
		if(!u.isChar(key)) return;
		const result = this.hittableNotes().find(n => n.canHitChar(key));
		if(result !== undefined) this.hitNote(result, key);
	}

	processKeyUpEvent(event: KeyboardEvent): void {
		const key = event.key;
		if(!u.isChar(key) || this.held_note === undefined) return;
		if(this.held_note.chars.includes(key) && 
			(this.playback_time - this.held_note.end_timing.time < c.HOLD_BUFFER) ){
			this.held_note = undefined;
			this.makeMissJudgment();
		}
	}

	hittableNotes(): Note[] {
		return u.takeFromWhile(this.notes_past_index, 
			n => n.timing.time > this.playback_time - c.HIT_BUFFER,
			n => n.timing.time < this.playback_time + c.HIT_BUFFER
		);
	}

	get notes_past_index(): Note[] {
		return this.notes.slice(this.current_index);
	}

	hitNote(n: Note, char: Character): void {
		if(!n.canHitChar(char)){
			console.error("Tried to hit an invalid character on a note")
			return;
		}
		n.hit_chars.push(char);
		if(n.isDone()) this.emitter.emit("NOTE_HIT", [n]);
		if(n.isHold()) this.held_note = n;
		if(n.isDone() && !n.isHold()) {
			this.emitter.emit("NOTE_FINISH", [n]);
			this.judgeHit(n.timing.time, this.playback_time);
		}
	}

	// -----------------------------------------------
	// UPDATING
	// -----------------------------------------------

	myUpdate(time: number): void {
		this.missPassedNotes();
		this.updateCurrentIndex();
		this.finishPassedHolds();
		this.playback_time = time; 
	}

	missPassedNotes(): void {
		const to_miss = u.takeWhile(this.notes_past_index, n =>
			(n.timing.time < this.playback_time - c.HIT_BUFFER) && !n.isDone()
		);
		to_miss.forEach(_n => this.makeMissJudgment());
	}

	updateCurrentIndex(): void {
		this.current_index = 
			u.marchIndexForward(this.notes, n => n.timing.time < this.playback_time - c.HIT_BUFFER );
	}

	finishPassedHolds(): void {
		if(this.held_note !== undefined 
				&& this.held_note.end_timing.time < this.playback_time + c.HOLD_BUFFER){
			this.emitter.emit("NOTE_FINISH", [ this.held_note ]);
			this.held_note = undefined;
		}
	}

	isComplete(): boolean {
		return this.current_index >= this.notes.length;
	}

	// -----------------------------------------------
	// SCORING
	// -----------------------------------------------

	judgeHit(time: number, cur_time: number): void {
		const time_diff = Math.abs(cur_time - time);
		const judgment = c.JUDGMENTS.find(j => time_diff < (j.window ?? -1) );
		u.shouldntBeUndefined(judgment, "While judging a hit, the hit was found to be a miss");
		this.judgments.push(judgment);
		this.emitter.emit("JUDGMENT_MADE", [judgment]);
		this.scoreJudgment(judgment);
	}

	scoreJudgment(judgment: Judgment): void {
		this.score += judgment.points;
		this.emitter.emit("SCORE_CHANGED", [this.score]);
	}

	makeMissJudgment(): void {
		this.score -= c.MISS_JUDGMENT.points;
		this.emitter.emit("JUDGMENT_MADE", [c.MISS_JUDGMENT] );
	}
}

// Gameplay uses a pre-sorted list to hold notes and keeps track of active notes with a simple range
class GameplayRenderer extends NoteFieldRenderer {
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
		this.scene.tweens.add({
			targets: note.graphic,
			x: 0,
			y: -this.y,
			duration: 200,
			ease: 'Linear',
			onComplete: () => note.graphic.destroy()
		});
		this.remove(note.graphic);
	} 
}