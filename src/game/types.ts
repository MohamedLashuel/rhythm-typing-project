import { Beat } from "./gameobjects/Beat"
import { Note } from "./gameobjects/Note"

export type Character = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" |
"n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" | 
"A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" |
"N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"

// An undefined window means one you can't hit normally
export type Judgment = {window: number | undefined, name: string, points: number}

export type EventTable = {
	// Gameplay
	NOTE_HIT: [Note],
	NOTE_FINISH: [Note],
	SCORE_CHANGED: [number],
	JUDGMENT_MADE: [Judgment],
	// Charting
	NOTE_CREATED: [Note, Beat],
	HOLD_CREATED: [Note],
	NOTE_DELETED: [Note],
	PLAYBACK_START: [number],
	PLAYBACK_STOP: []
}

export type Point = {
	x: number,
	y: number
}

export type Range<T> = {
	start: T,
	end: T
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

// Emits Phaser events with automatic type checking
export class MyEmitter {
	private event_emitter: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();

	emit<E extends Event>(code: E, args: EventTable[E]): void {
		this.event_emitter.emit(code, ...args);
	}

	addListeners(...listeners: Listener[]): void {
		listeners.forEach( (l) => this.event_emitter.on(l.event, l.fun, l.context));
	}
}

export type SoundInstance = Phaser.Sound.NoAudioSound | Phaser.Sound.WebAudioSound 
	| Phaser.Sound.HTML5AudioSound