import { GameObjects, Scene } from "phaser";
import { GameplaySettings } from "../../types";
import { Entity, PhaserGraphic, Timing } from "./Entity";
import * as g from '../../graphics';

export class ScrollZone extends Entity {
	mult: number;
	declare end_timing: Timing;
	declare graphic: GameObjects.Graphics;

	constructor(timing: Timing, end_timing: Timing, mult: number) {
		super(timing, end_timing);
		this.mult = mult;
	}

	override initialGraphic(scene: Scene, _settings: GameplaySettings["render"]): PhaserGraphic {
		return new GameObjects.Graphics(scene)
	}

	override clearGraphic(): void {
		this.graphic.clear();
	}

	override drawGraphic(_scene: Scene, settings: GameplaySettings["render"]): void {
		const color = this.mult > 1 ? g.SPEED_ZONE_COLOR : g.SLOW_ZONE_COLOR;
		const len = settings.base_scroll_speed * (this.end_pos - this.timing.scroll_pos);
		this.graphic
			.fillStyle(color, 0.5)
			.fillRect(0, - g.TRACK_HEIGHT / 2, len, g.TRACK_HEIGHT)
	}
}