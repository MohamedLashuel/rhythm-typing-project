import { Scene } from "phaser";
import * as u from '../utils'

const DEFAULT_TABLE = {
	hit: "hit",
}

type SoundType = keyof typeof DEFAULT_TABLE
type SoundTable = Record<SoundType, string>

export class SoundManager {
	song_instance: u.t.SoundInstance
	constructor(
		public scene: Scene, 
		public song_key: string,
		public table: SoundTable = DEFAULT_TABLE
	){
		this.song_instance = scene.sound.add(song_key);
	}

	// Wrapper for playing sounds
	play(...args: Parameters<Phaser.Sound.BaseSoundManager['play']>): boolean {
		return this.scene.sound.play(...args)
	}

	// Returns a function that plays the specified sound when called
	playSoundFactory(sound_type: SoundType): () => void {
		return () => {
			this.play(this.table[sound_type]);
		}
	}

	startPlayback(start_time: number): void {
		const seek = start_time > 0 ? start_time : 0;
		const delay = start_time < 0 ? start_time : 0;
		// Wait until main thread unblocked so that audio syncs properly
		requestAnimationFrame( () => this.song_instance.play( { seek: seek, delay: delay } ));
	}

	stopPlayback(): void {
		this.scene.sound.stopByKey(this.song_key)
	}

	get song_playback_time(): number {
		return this.song_instance.seek;
	}
}