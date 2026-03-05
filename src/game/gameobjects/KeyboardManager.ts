import { Scene } from "phaser";

export class KeyboardManager {
	down_queue: KeyboardEventQueue = new KeyboardEventQueue();
	up_queue: KeyboardEventQueue = new KeyboardEventQueue();

	handleKeyDown(event: KeyboardEvent){
		this.down_queue.push(event);
	}

	handleKeyUp(event: KeyboardEvent){
		this.up_queue.push(event)
	}

	handleQueues(down_fun: (k: KeyboardEvent) => void, up_fun: (k: KeyboardEvent) => void): void {
		this.down_queue.handleQueue(down_fun);
		this.up_queue.handleQueue(up_fun);
	}

	registerHandlers(scene: Scene): void {
		scene.input.keyboard?.on("keydown", this.handleKeyDown, this);
        scene.input.keyboard?.on("keyup", this.handleKeyUp, this);
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