import { Scene, GameObjects } from 'phaser'
import * as u from '../utils'
import * as g from '../graphics'
import { Beat } from './Beat';

export type Timing = {
	beat: Beat,
	time: number,
	scroll_pos: number
}

// Normal notes use text, holds use containers of the text and the hold graphic
// Jump notes are implemented as a single note with multiple characters
export class Note extends GameObjects.Container {
	hit_chars: u.t.Character[] = [];
	text_objs: GameObjects.Text[] = [];
	hold_tails: GameObjects.Graphics[] = [];

	constructor(
		public scene: Scene,
		public chars: u.t.Character[], 
		public timing: Timing,
		public hold_timing?: Timing
	){
		super(scene);
		this.setInitialChildren(chars, hold_timing);
		this.deactivate();
	}

	setInitialChildren(chars: u.t.Character[], hold_timing: Timing | undefined): void {
		const y_offsets = this.getYOffsets();
		const stroke_color = g.NORMAL_NOTE_PALETTE[this.timing.beat.simplified_division];

		this.text_objs = u.map2(chars, y_offsets, (ch, y) => this.makeTextObject(ch, y, stroke_color));

		this.hold_tails = hold_timing === undefined ? [] 
			: y_offsets.map(y => this.makeHoldTail(y));

		this.add(this.text_objs);
		this.add(this.hold_tails);
	}

	makeTextObject(char: u.t.Character, y: number, stroke_color: string): GameObjects.Text {
		return new GameObjects.Text(this.scene, 0, y, char, g.NOTE_STYLE)
			.setOrigin(0.5, 0.5)
			.setStyle( { stroke: stroke_color });
	}

	makeHoldTail(y: number): GameObjects.Graphics {
		return new GameObjects.Graphics(this.scene, { x: 0, y: y})
			.fillStyle(0x00ff00, 0.5);
	}

	drawHoldTail(base_scroll_speed: number): void {
		if(!this.isHold()) {
			console.error("Tried to draw the hold tail of a note that doesn't have one");
			return
		}
		const len = (this.hold_timing.scroll_pos - this.timing.scroll_pos) * base_scroll_speed;
		this.hold_tails.map(g => g.fillRect(0, -16, len, 32));
	}

	// Calculate y offset for object i out of len
	// E.g. 1 out of 1 would be 0 (middle), 1 / 2 would be negative (above middle) and 2 / 2 positive
	YOffset(i: number, len: number): number {
		return ( (i + 1) / (len + 1) - (1 / 2) ) * g.ROW_HEIGHT;
	}

	getYOffsets(): number[] {
		return this.chars.map( (_ch, i) => this.YOffset(i, this.chars.length))
	}

	turnIntoHold(hold_timing: Timing): void {
		if(this.isHold()){
			console.error("Tried to turn a note into a hold when it already was");
			return;
		}
		this.hold_timing = hold_timing;
		const tails = this.getYOffsets().map(y => this.makeHoldTail(y));
		this.hold_tails = tails;
		this.add(tails);
	}

	isHold(): this is { hold_timing: Timing } {
		return this.hold_timing !== undefined;
	}

	get end_time() {
		return this.hold_timing?.time ?? this.timing.time;
	}

	get end_pos() {
		return this.hold_timing?.scroll_pos ?? this.timing.scroll_pos;
	}

	activate() {
		this.setActive(true).setVisible(true);
	}

	deactivate() {
		this.setActive(false).setVisible(false);
	}

	canHitChar(char: u.t.Character): boolean {
		if(!this.chars.includes(char)) return false;
		if(this.hit_chars.includes(char)) return false;
		return true;
	}

	isDone(): boolean {
		return u.arraysHaveSameValues(this.chars, this.hit_chars);
	}

	toSpec() {
		return {
			chars: this.chars,
			beat: this.timing.beat.toJSON(),
			hold_beat: this.hold_timing?.beat.toJSON()
		};
	}
}

export type NoteSpec = {
	chars: string[],
	beat: string,
	hold_beat: string
}