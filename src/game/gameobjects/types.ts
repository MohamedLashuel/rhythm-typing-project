import { Beat } from "./Beat"
import { Cursor } from "./Charting/NoteField"
import { UsedEntity } from "./Entities/EntityGroup"
import { Note } from "./Entities/Note"

// An undefined window means one you can't hit normally
export type Judgment = {window: number | undefined, name: string, points: number}

export type GameplayEvents = {
	NOTE_HIT: [Note],
	NOTE_FINISH: [Note],
	SCORE_CHANGED: [number],
	JUDGMENT_MADE: [Judgment]	
}

export type ChartingEvents = {
	ENTITY_CREATED: [UsedEntity],
	ENTITY_DELETED: [UsedEntity],
	HOLD_CREATED: [Note],
	PLAY_HIT_SOUND: [],
	TIMINGS_RECALCULATED: [Beat],
	CURSOR_CHANGED: [Cursor]
}

export type PlaybackEvents = {
	PLAYBACK_START: [number],
	PLAYBACK_STOP: [],
}

export type ScreensEvents = {
	SONG_PATH_CHANGED: [string],
	OFFSET_CHANGED: [number],
	SWITCH_CHART: [number],
}

export type SettingsEvents = {
	SETTINGS_CHANGED: [GameplaySettings]
}

export type SoundInstance = Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound 
	| Phaser.Sound.HTML5AudioSound

export type GameplaySettings = {
	render: {
		base_scroll_speed: number
	},
	sound: {
		music_rate: number,
		music_volume: number,
		hitsound_volume: number
	}
}