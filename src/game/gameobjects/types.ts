import { Beat } from "./Beat"
import { UsedEntity } from "./Entities/EntityGroup"
import { Note } from "./Entities/Note"

// An undefined window means one you can't hit normally
export type Judgment = {window: number | undefined, name: string, points: number}

export type EventTable = {
	// Gameplay
	NOTE_HIT: [Note],
	NOTE_FINISH: [Note],
	SCORE_CHANGED: [number],
	JUDGMENT_MADE: [Judgment],
	// Charting
	ENTITY_CREATED: [UsedEntity],
	ENTITY_DELETED: [UsedEntity],
	HOLD_CREATED: [Note],
	PLAYBACK_START: [number],
	PLAYBACK_STOP: [],
	PLAY_HIT_SOUND: [],
	SONG_PATH_CHANGED: [string],
	OFFSET_CHANGED: [number],
	SWITCH_CHART: [number],
	TIMINGS_RECALCULATED: [Beat]
	// Both
	SETTINGS_CHANGED: [GameplaySettings]
}

export type Event = keyof EventTable

// EVIL HACK ALERT
// This is required in order to automatically confirm the function signature is the correct one for the event,
// without having to use a generic type and manually specify the event itself
type ListenerGeneric<E> = E extends Event ? {
	event: E,
	fun: (...args: EventTable[E]) => void,
	context: any
} : never;

export type Listener = ListenerGeneric<Event>;

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