import { Scene } from "phaser";

type WatchedHolds = Record<string, { time: number, fun: () => void, timeout?: NodeJS.Timeout }>;

// Stores all key events in queues to process with functions
// Also can trigger functions when a key is held for some time
export class KeyboardManager {
	down_queue: KeyboardEventQueue = new KeyboardEventQueue();
	up_queue: KeyboardEventQueue = new KeyboardEventQueue();
	watching_holds: WatchedHolds = {};

	constructor(scene: Scene){
		scene.input.keyboard?.on("keydown", this.handleKeyDown, this);
        scene.input.keyboard?.on("keyup", this.handleKeyUp, this);
	}

	handleKeyDown(event: KeyboardEvent): void {
		if(event.ctrlKey) event.preventDefault();
		this.down_queue.push(event);
		this.checkWatchedHoldKeysPressed(event);
	}

	handleKeyUp(event: KeyboardEvent): void {
		if(event.ctrlKey) event.preventDefault();
		this.up_queue.push(event)
		this.checkWatchedHoldKeysReleased(event);
	}

	handleQueues(down_fun?: (k: KeyboardEvent) => void, up_fun?: (k: KeyboardEvent) => void): void {
		if(down_fun !== undefined) this.down_queue.handleQueue(down_fun);
		if(up_fun !== undefined) this.up_queue.handleQueue(up_fun);
	}

	// -----------------------------------------------
	// HOLDING KEYS
	// -----------------------------------------------

	onKeyHeld(key: string, time_seconds: number, fun: () => void): void {
		this.watching_holds[key] = { time: time_seconds * 1000, fun: fun };
	}

	checkWatchedHoldKeysPressed(event: KeyboardEvent): void {
		const hold_data = this.watching_holds[event.key];
		if(hold_data !== undefined && !event.repeat){
			hold_data.timeout = setTimeout(hold_data.fun, hold_data.time);
		}
	}

	checkWatchedHoldKeysReleased(event: KeyboardEvent): void {
		const hold_data = this.watching_holds[event.key];
		if(hold_data !== undefined) clearTimeout(hold_data.timeout);
	}
}

class KeyboardEventQueue {
	data: KeyboardEvent[] = [];

	push(event: KeyboardEvent): void {
		this.data.push(event);
	}

	retrieveAllAndClear(): KeyboardEvent[] {
		return this.data.splice(0);
	}

	handleQueue(fun: (k: KeyboardEvent) => void): void {
		this.retrieveAllAndClear().forEach(fun);
	}
}