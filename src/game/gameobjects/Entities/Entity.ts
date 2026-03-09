import * as u from '../../utils'
import { Beat } from '../Beat';
import { GameObjects, Scene } from 'phaser';

export type Timing = {
	beat: Beat,
	time: number,
	scroll_pos: number
}

type PhaserGraphic = GameObjects.GameObject & 
	{ setVisible(a0: boolean): PhaserGraphic, x: number, y: number };

// Subclasses should override end_timing's type according to whether or not they have it 
export abstract class Entity {
	timing: Timing;
	end_timing?: Timing;
	graphic: PhaserGraphic;

	constructor(timing: Timing, end_timing?: Timing) {
		this.timing = timing;
		this.end_timing = end_timing;
	}

	abstract createGraphic(scene: Scene, settings: u.t.GameplaySettings): PhaserGraphic;

	redraw(scene: Scene, settings: u.t.GameplaySettings): void {
		this.graphic = this.createGraphic(scene, settings);
	}

	get end_time() {
		return this.end_timing?.time ?? this.timing.time;
	}

	get end_pos() {
		return this.end_timing?.scroll_pos ?? this.timing.scroll_pos;
	}

	activate(): PhaserGraphic {
		return this.graphic.setActive(true).setVisible(true)
	}

	deactivate(): PhaserGraphic {
		return this.graphic.setActive(false).setVisible(false)
	}

	prepToJSON(): {} {
		return this;
	}

	toJSON() {
		const to_omit = ["graphic", "timing"]
			.concat( (this.end_timing === undefined) ? [] : "end_timing");
		return u.objectWithout(this.prepToJSON(), to_omit);
	}

	finalizePostJSON(): void {}
}