import { ChartingNoteField } from "./NoteField";
import { SoundManager } from "../Sound";
import * as u from '../../utils';
import { Scene } from "phaser";
import { ScreenManager } from "./Screens";
import { Song } from "../Song";
import { KeyboardManager } from "../KeyboardManager";

export class ChartingManager {
	note_field: ChartingNoteField;
	screens: ScreenManager;
	sound: SoundManager;
	keyboard: KeyboardManager;

	constructor(scene: Scene, field_loc: u.t.Point, initial_song?: Song){
		const song = initial_song ?? new Song();
		const initial_chart = song.charts[0];
		this.note_field = new ChartingNoteField(scene, field_loc, song, initial_chart);
		this.sound = new SoundManager(scene);
		this.screens = new ScreenManager(scene, song, initial_chart);
		this.keyboard = new KeyboardManager();

		this.note_field.emitter.addListeners(
			{event: "PLAYBACK_START", fun: this.sound.startPlayback, context: this.sound}, 
			{event: "PLAYBACK_STOP", fun: this.sound.stopPlayback, context: this.sound}
		)
	}

	processKeyUpEvent(event: KeyboardEvent){ 
		if(!this.screens.isActive()) this.note_field.processKeyUpEvent(event); 
	}

	processKeyDownEvent(event: KeyboardEvent){
		if(event.key === "1" && event.ctrlKey) {
			this.screens.toggleScreen("chart_props")
		}
		else if (!this.screens.isActive()) this.note_field.processKeyDownEvent(event); 
	}

	myUpdate(delta_ms: number){ 
		this.note_field.myUpdate(delta_ms); 
		this.keyboard.handleQueues(evt => this.processKeyDownEvent(evt), evt => this.processKeyUpEvent(evt))
	}
}