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
	// When set to true, immediately starts exiting
	should_exit: boolean = false;

	constructor(scene: Scene, settings: GameplaySettings, chart: Chart, field_loc: Point){
		this.keyboard = new KeyboardManager(scene);
		this.note_field = new GameplayNoteField(scene, chart, settings, this.keyboard, field_loc);
		this.sound = new SoundManager(scene, settings.sound, chart.offset);
		this.scorer = new ScoreRenderer(scene);

		this.keyboard.onKeyHeld("Escape", 1, () => this.should_exit = true);

		this.note_field.logic.emitter.addListeners(
			{ event: "NOTE_HIT", fun: this.sound.playHitSound, context: this.sound }, 
			{ event: "SCORE_CHANGED", fun: this.scorer.onScoreChanged, context: this.scorer },
			{ event: "JUDGMENT_MADE", fun: this.scorer.onJudgmentMade, context: this.scorer }
       	);

       	this.sound.startPlayback();
	}

	myUpdate(): void { 
		const pb_time = this.sound.song_playback_time;
		if(pb_time === undefined) {
			console.error("Playback time undefined - probably couldn't load song audio")
			this.should_exit = true;
			return;
		}
		this.note_field.myUpdate(pb_time); 
	}

	isComplete(): boolean {
		return this.should_exit || (this.note_field.logic.isComplete() && this.sound.complete);
	}
}