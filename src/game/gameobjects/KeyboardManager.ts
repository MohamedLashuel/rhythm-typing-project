import { Scene } from "phaser";

export class KeyboardManager {
	down_queue: KeyboardEventQueue = new KeyboardEventQueue();
	up_queue: KeyboardEventQueue = new KeyboardEventQueue();

	constructor(scene: Scene){
		scene.input.keyboard?.on("keydown", this.handleKeyDown, this);
        scene.input.keyboard?.on("keyup", this.handleKeyUp, this);
	}

	handleKeyDown(event: KeyboardEvent){
		if(event.ctrlKey) event.preventDefault();
		this.down_queue.push(event);
	}

	handleKeyUp(event: KeyboardEvent){
		if(event.ctrlKey) event.preventDefault();
		this.up_queue.push(event)
	}

	handleQueues(down_fun?: (k: KeyboardEvent) => void, up_fun?: (k: KeyboardEvent) => void): void {
		if(down_fun !== undefined) this.down_queue.handleQueue(down_fun);
		if(up_fun !== undefined) this.up_queue.handleQueue(up_fun);
	}
}

class KeyboardEventQueue {
	data: KeyboardEvent[] = [];

	push(event: KeyboardEvent){
		this.data.push(event);
	}

	retrieveAllAndClear(): KeyboardEvent[] {
		return this.data.splice(0);
	}

	handleQueue(fun: (k: KeyboardEvent) => void): void {
		this.retrieveAllAndClear().forEach(fun);
	}
}