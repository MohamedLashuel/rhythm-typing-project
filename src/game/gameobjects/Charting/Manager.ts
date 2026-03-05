import { ChartingNoteField } from "./NoteField";
import { SoundManager } from "../Sound";
import * as u from '../../utils';
import { Scene } from "phaser";
import { ScreenManager } from "./Screens";
import { Chart } from "../Song";

export class ChartingManager {
	note_field: ChartingNoteField;
	screens: ScreenManager;
	sound: SoundManager;

	constructor(scene: Scene, field_loc: u.t.Point, song_key: string, initial_chart?: Chart){
		const chart = initial_chart ?? new Chart();
		this.note_field = new ChartingNoteField(scene, field_loc, chart);
		this.sound = new SoundManager(scene, song_key);
		this.screens = new ScreenManager(scene, chart)

		this.note_field.emitter.addListeners({
            event: "PLAYBACK_START",
            fun: this.sound.startPlayback,
            context: this.sound
        }, {
        	event: "PLAYBACK_STOP",
        	fun: this.sound.stopPlayback,
        	context: this.sound
        })
	}

	handleKeyDown(event: KeyboardEvent){ 
		if(event.key === "1" && event.ctrlKey) {
			this.screens.toggleScreen("chart_props")
		}
		else if (!this.screens.isActive()) this.note_field.handleKeyDown(event); 
	}
	handleKeyUp(event: KeyboardEvent){ 
		if(!this.screens.isActive()) this.note_field.handleKeyUp(event); 
	}

	myUpdate(delta_ms: number){ this.note_field.myUpdate(delta_ms); }
}