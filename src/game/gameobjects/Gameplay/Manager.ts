import { GameplayNoteField } from "./NoteField";
import { ScoreRenderer } from "./ScoreRenderer";
import { SoundManager } from "../Sound";
import { KeyboardManager } from "../KeyboardManager"
import { Chart } from "../Song";
import { Scene } from "phaser";
import { GameplaySettings } from "../types";
import { Point } from "../../helpers/types";

export class GameplayManager {
	note_field: GameplayNoteField;
	sound: SoundManager;
	scorer: ScoreRenderer;
	keyboard: KeyboardManager;

	constructor(scene: Scene, settings: GameplaySettings, chart: Chart, field_loc: Point){
		this.keyboard = new KeyboardManager(scene);
		this.note_field = new GameplayNoteField(scene, chart, settings, this.keyboard, field_loc);
		this.sound = new SoundManager(scene, settings.sound);
		this.scorer = new ScoreRenderer(scene);

		this.note_field.logic.emitter.addListeners(
			{ event: "NOTE_HIT", fun: this.sound.playSoundFactory("hit"), context: this.sound }, 
			{ event: "SCORE_CHANGED", fun: this.scorer.onScoreChanged, context: this.scorer },
			{ event: "JUDGMENT_MADE", fun: this.scorer.onJudgmentMade, context: this.scorer }
       	);

       	this.sound.startPlayback(chart.offset);
	}

	myUpdate(){ this.note_field.myUpdate(this.sound.song_playback_time); }

	isComplete(): boolean {
		return this.note_field.logic.isComplete() //&& this.sound.complete;
	}
}