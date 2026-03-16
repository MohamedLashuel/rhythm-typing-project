import { Beat } from "./gameobjects/Beat"
import { Entity } from "./gameobjects/Entities/Entity"
import { Note } from "./gameobjects/Entities/Note"

export type Character = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" |
"n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" | 
"A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" |
"N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"

export type Point = {
	x: number,
	y: number
}

export type Range<T> = {
	start: T,
	end: T
}

export type Comparator<T> = (a: T, b: T) => number;
export type ComparatorIfNecessary<T> = T extends string | number ? Comparator<T> | undefined : Comparator<T>

// Specifically excludes class properties which are functions, only includes real methods
type ClassMethod = (...args: any[]) => any;

export type ClassProperties<C> = keyof {
    [K in keyof C as C[K] extends ClassMethod ? never : K]: any
}

export type JSONfied<C> = Record<ClassProperties<C>, any>

export type RemapLeaves<Base, To> = {
	[Property in keyof Base]: Base[Property] extends Record<string, unknown> 
		? RemapLeaves<Base[Property], To> 
		: To
};

export type RecursiveContainer<T> = {
	[index: string]:  T | RecursiveContainer<T>
}

// An undefined window means one you can't hit normally
export type Judgment = {window: number | undefined, name: string, points: number}

export type EventTable = {
	// Gameplay
	NOTE_HIT: [Note],
	NOTE_FINISH: [Note],
	SCORE_CHANGED: [number],
	JUDGMENT_MADE: [Judgment],
	// Charting
	ENTITY_CREATED: [Entity, Beat],
	ENTITY_DELETED: [Entity],
	HOLD_CREATED: [Note],
	PLAYBACK_START: [number],
	PLAYBACK_STOP: [],
	SONG_PATH_CHANGED: [string],
	SWITCH_CHART: [number],
	TIMINGS_RECALCULATED: [Beat]
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
		music_rate: number
	}
}