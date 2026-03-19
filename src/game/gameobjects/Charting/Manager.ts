import { ChartingNoteField } from "./NoteField";
import { SoundManager } from "../Sound";
import * as u from '../../helpers/utils';
import * as c from '../../config';
import { Scene } from "phaser";
import { SCREEN_TYPES, ScreenManager } from "./Screens";
import { Song } from "../Song";
import { KeyboardManager } from "../KeyboardManager";
import { SettingsTab } from "../Settings";
import { Point } from "../../helpers/types";

export class ChartingManager {
	note_field: ChartingNoteField;
	screens: ScreenManager;
	sound: SoundManager;
	keyboard: KeyboardManager;
	settings_tab: SettingsTab;

	constructor(scene: Scene, field_loc: Point, initial_song?: Song){
		const song = initial_song ?? new Song();
		const initial_chart = song.charts[0];
		const settings = c.DEFAULT_SETTINGS;
		this.note_field = new ChartingNoteField(scene, field_loc, song, initial_chart, settings);
		this.sound = new SoundManager(scene, settings.sound);
		this.screens = new ScreenManager(scene, song, 0);
		this.settings_tab = new SettingsTab(scene);
		this.keyboard = new KeyboardManager(scene);

		this.note_field.emitter.addListeners(
			{event: "PLAYBACK_START", fun: this.sound.startPlayback, context: this.sound}, 
			{event: "PLAYBACK_STOP", fun: this.sound.stopPlayback, context: this.sound}
		);
		this.screens.emitter.addListeners(
			{event: "SONG_PATH_CHANGED", fun: this.sound.changeSongPath, context: this.sound},
			{event: "SWITCH_CHART", fun: this.note_field.changeChartIndex, context: this.note_field}
		);
		this.settings_tab.emitter.addListeners(
			{event: "SETTINGS_CHANGED", fun: this.note_field.updateSettings, context: this.note_field},
			{event: "SETTINGS_CHANGED", fun: this.sound.updateSettings, context: this.sound}
		)
	}

	processKeyUpEvent(event: KeyboardEvent){ 
		if(!this.screens.isActive()) this.note_field.processKeyUpEvent(event); 
	}

	processKeyDownEvent(event: KeyboardEvent){
		if(u.isNum(event.key) && event.ctrlKey) {
			const screen_type = SCREEN_TYPES[Number(event.key) - 1]
			if(screen_type !== undefined) this.screens.toggleScreen(screen_type);
		}
		else if (event.ctrlKey && event.key === "e") this.settings_tab.toggle();
		else if (!this.screens.isActive() && !this.settings_tab.active) 
			this.note_field.processKeyDownEvent(event); 
	}

	myUpdate(delta_ms: number){ 
		this.note_field.myUpdate(delta_ms); 
		this.keyboard.handleQueues(evt => this.processKeyDownEvent(evt), evt => this.processKeyUpEvent(evt))
	}
}