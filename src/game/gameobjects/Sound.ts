import { Scene } from "phaser";
import * as u from '../utils'

// Audio is preloaded in the scene itself with key "song"
export class SoundManager {
	song_instance: u.t.SoundInstance
	constructor(
		public scene: Scene
	){
		this.song_instance = scene.sound.add("song");
	}

	// Wrapper for playing sounds
	play(...args: Parameters<Phaser.Sound.BaseSoundManager['play']>): boolean {
		return this.scene.sound.play(...args)
	}

	// Returns a function that plays the specified sound when called
	playSoundFactory(key: string): () => void {
		return () => {
			this.play(key);
		}
	}

	startPlayback(start_time: number): void {
		const seek = start_time > 0 ? start_time : 0;
		const delay = start_time < 0 ? start_time : 0;
		// Wait until main thread unblocked so that audio syncs properly
		requestAnimationFrame( () => this.song_instance.play( { seek: seek, delay: delay } ));
	}

	stopPlayback(): void {
		this.scene.sound.stopByKey("song");
	}

	// If playback time should be negative (because of negative offset), this returns 0
	// Might be a problem later, but I can't find a better way
	get song_playback_time(): number {
		return this.song_instance.seek;
	}
}