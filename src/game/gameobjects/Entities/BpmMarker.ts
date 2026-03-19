import { Scene, GameObjects } from 'phaser'
import * as g from '../../graphics'
import { Entity, PhaserGraphic, Timing } from './Entity';
import { GameplaySettings } from '../types';

export class BpmMarker extends Entity {
	bpm: number;
	declare end_timing: undefined;
	declare graphic: GameObjects.Container;

	constructor(timing: Timing, bpm: number){
		super(timing);
		this.bpm = bpm;
	}

	override initialGraphic(scene: Scene, _settings: GameplaySettings['render']): PhaserGraphic {
		return new GameObjects.Container(scene);
	}

	override clearGraphic(): void {
		this.graphic.removeAll(true);
	}

	override drawGraphic(scene: Scene, _settings: GameplaySettings['render']): void {
		const line = new GameObjects.Graphics(scene)
			.lineStyle(4, 0xff0000)
			.lineBetween(0, -g.TRACK_HEIGHT / 2, 0, g.TRACK_HEIGHT / 2);
		const txt = new GameObjects.Text(scene, 0, g.TRACK_HEIGHT / 2, this.bpm.toString(), g.BPM_MARKER_STYLE)
			.setOrigin(0.5, 0);
		this.graphic.add([line, txt]);
	}
}