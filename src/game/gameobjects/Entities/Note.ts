import { Scene, GameObjects } from 'phaser'
import * as u from '../../utils'
import * as g from '../../graphics'
import { GameplaySettings } from '../../types';
import { Entity, Timing } from './Entity';


// Normal notes use text, holds use containers of the text and the hold graphic
// Jump notes are implemented as a single note with multiple characters
export class Note extends Entity {
	chars: u.t.Character[];
	hit_chars: u.t.Character[] = [];
	declare graphic: NoteContainer;

	constructor(chars: u.t.Character[], timing: Timing, end_timing?: Timing
	){
		super(timing, end_timing);
		this.chars = chars;
	}

	override createGraphic(scene: Scene, settings: u.t.GameplaySettings["render"]): NoteContainer {
		return new NoteContainer(scene, settings, this.chars, this.timing, this.end_timing);
	}

	isHold(): this is { hold_timing: Timing } {
		return this.end_timing !== undefined;
	}

	turnIntoHold(end_timing: Timing): void {
		if(this.isHold()){
			console.error("Tried to turn a note into a hold when it already was");
			return;
		}
		this.end_timing = end_timing;
	}

	canHitChar(char: u.t.Character): boolean {
		if(!this.chars.includes(char)) return false;
		if(this.hit_chars.includes(char)) return false;
		return true;
	}

	isDone(): boolean {
		return u.arraysHaveSameValues(this.chars, this.hit_chars);
	}

	prepToJSON(): {} {
		return u.objectWithout(this, ["hit_chars"] );
	}

	finalizePostJSON(): void {
		this.hit_chars = [];
	}
}

class NoteContainer extends GameObjects.Container {
	num_chars: number;
	constructor(scene: Scene, settings: u.t.GameplaySettings["render"], chars: u.t.Character[], 
			timing: Timing, end_timing?: Timing) {
		super(scene);
		this.num_chars = chars.length;
		
		const y_offsets = this.getYOffsets();
		const stroke_color = g.NORMAL_NOTE_PALETTE[timing.beat.simplified_division];

		const text_objs = u.map2(chars, y_offsets, (ch, y) => this.makeTextObject(ch, y, stroke_color));
		if(end_timing !== undefined) this.addHoldTails(settings, timing, end_timing);

		this.add(text_objs);
	}

	makeTextObject(char: u.t.Character, y: number, stroke_color: string): GameObjects.Text {
		return new GameObjects.Text(this.scene, 0, y, char, g.NOTE_STYLE)
			.setOrigin(0.5, 0.5)
			.setStyle( { stroke: stroke_color });
	}

	addHoldTails(settings: GameplaySettings["render"], timing: Timing, end_timing: Timing): void {
		const tails = this.getYOffsets()
			.map(y => this.makeHoldTail(y, settings.base_scroll_speed, timing, end_timing))
		this.add(tails);
	}

	makeHoldTail(y: number, base_scroll: number, timing: Timing, end_timing: Timing): GameObjects.Graphics {
		const len = (end_timing.scroll_pos - timing.scroll_pos) * base_scroll;
		const height = g.NOTE_STYLE.fontSize;
		return new GameObjects.Graphics(this.scene, { x: 0, y: y})
			.fillStyle(0x00ff00, 0.5)
			.fillRect(0, - height / 2, len, height);
	}

	// Calculate y offset for object i out of len
	// E.g. 1 out of 1 would be 0 (middle), 1 / 2 would be negative (above middle) and 2 / 2 positive
	YOffset(i: number, len: number): number {
		return ( (i + 1) / (len + 1) - (1 / 2) ) * g.ROW_HEIGHT;
	}

	getYOffsets(): number[] {
		return u.range(this.num_chars).map(i => this.YOffset(i, this.num_chars));
	}
}