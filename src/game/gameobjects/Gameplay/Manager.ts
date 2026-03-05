import { GameplayNoteField } from "./NoteField";
import { ScoreRenderer } from "./ScoreRenderer";
import { SoundManager } from "../Sound";
import * as u from '../../utils';
import { Chart } from "../Song";
import { Scene } from "phaser";

export class GameplayManager {
	note_field: GameplayNoteField;
	sound: SoundManager;
	scorer: ScoreRenderer;

	constructor(scene: Scene, chart: Chart, field_loc: u.t.Point, song_key: string){
		this.note_field = new GameplayNoteField(scene, chart, field_loc);
		this.sound = new SoundManager(scene, song_key);
		this.scorer = new ScoreRenderer(scene);

		this.note_field.logic.emitter.addListeners(
			{ event: "NOTE_HIT", fun: this.sound.playSoundFactory("hit"), context: this.sound }, 
			{ event: "SCORE_CHANGED", fun: this.scorer.onScoreChanged, context: this.scorer },
			{ event: "JUDGMENT_MADE", fun: this.scorer.onJudgmentMade, context: this.scorer }
       	);

       	this.sound.startPlayback(chart.offset);
	}

	handleKeyDown(event: KeyboardEvent){ this.note_field.handleKeyDown(event); }
	handleKeyUp(event: KeyboardEvent){ this.note_field.handleKeyUp(event); }

	myUpdate(){ this.note_field.myUpdate(this.sound.song_playback_time); }
}