type EventTable = Record<string, unknown[]>;

// Emits Phaser events with automatic type checking
// T should be a record with keys as event codes, and values as an array of types to pass as args
export class MyEmitter<T extends EventTable> {
	private readonly event_emitter: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();

	emit<E extends keyof T & string>(code: E, args: T[E]): void {
		this.event_emitter.emit(code, ...args);
	}

	addListeners(...listeners: Listener<T>[]): void {
		listeners.forEach( (l) => this.event_emitter.on(l.event, l.fun, l.context));
	}
}

// EVIL HACK ALERT
// This is required in order to automatically confirm the function signature is the correct one for the event,
// without having to use a generic type and manually specify the event itself
type ListenerGeneric<T extends EventTable, E> = E extends keyof T & string ? {
	event: E,
	fun: (...args: T[E]) => void,
	context: any
} : never;

type Listener<T extends EventTable> = ListenerGeneric<T, keyof T>;