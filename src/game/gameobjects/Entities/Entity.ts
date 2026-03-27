import * as u from '../../helpers/utils'
import { Beat } from '../Beat';
import { GameObjects, Scene } from 'phaser';
import { GameplaySettings } from '../types';

export type Timing = {
	beat: Beat,
	time: number,
	scroll_pos: number
}

export type PhaserGraphic = GameObjects.GameObject & 
	{ setVisible(a0: boolean): PhaserGraphic, x: number, y: number };

// Subclasses should override end_timing's type according to whether or not they have it 
export abstract class Entity {
	timing: Timing;
	end_timing?: Timing;
	abstract key: string;

	// Technically the graphic is undefined until the entity is added to the NoteFieldRenderer
	// That's the most reasonable overall design I thought of, but it might lead to problems later
	graphic: PhaserGraphic;

	constructor(timing: Timing, end_timing?: Timing) {
		this.timing = timing;
		this.end_timing = end_timing;
	}

	// When changing the graphic object, reassigning would clear all properties like position.
	// Instead, we must use methods to mutate it without reassigning
	abstract initialGraphic(scene: Scene, settings: GameplaySettings["render"]): PhaserGraphic;
	abstract clearGraphic(): void;
	abstract drawGraphic(scene: Scene, settings: GameplaySettings["render"]): void;

	draw(scene: Scene, settings: GameplaySettings ["render"]): this {
		if(this.graphic === undefined) { // eslint-disable-line
			this.graphic = this.initialGraphic(scene, settings);
		} else {
			this.clearGraphic();
		}
		this.drawGraphic(scene, settings);

		return this;
	}

	get end_pos(): number {
		return this.end_timing?.scroll_pos ?? this.timing.scroll_pos;
	}

	activate(): PhaserGraphic {
		return this.graphic.setActive(true).setVisible(true)
	}

	deactivate(): PhaserGraphic {
		return this.graphic.setActive(false).setVisible(false)
	}

	prepToJSON(): object {
		return this;
	}

	toJSON(): object {
		const to_omit = ["timing", "graphic"]
			.concat( (this.end_timing === undefined) ? "end_timing" : []);
		return u.objectWithout(this.prepToJSON(), to_omit);
	}

	finalizePostJSON(): void {}
}