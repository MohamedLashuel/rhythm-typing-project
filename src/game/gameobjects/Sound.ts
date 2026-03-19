import { Scene } from "phaser";
import { GameplaySettings, SoundInstance } from "./types";

// Audio is preloaded in the scene itself with key "song" (or might not be loaded, which is also ok)
export class SoundManager {
	scene: Scene;
	settings: GameplaySettings["sound"];
	song_instance?: SoundInstance
	complete: boolean = false;

	constructor(scene: Scene, settings: GameplaySettings["sound"]){
		this.scene = scene;
		this.settings = settings;
		this.trySetSongInstance();
	}

	trySetSongInstance(): void {
		this.song_instance = this.scene.cache.audio.exists("song") ? this.scene.sound.add("song") : undefined;
		this.song_instance?.once("complete", () => this.complete = true);
	}

	changeSongPath(new_path: string) {
		this.scene.load.audio("song", new_path)
			.once("filecomplete", () => this.trySetSongInstance())
			.start();
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
		requestAnimationFrame( () => this.song_instance?.play( 
			{ seek: seek, delay: delay, rate: this.settings.music_rate } )
		);
	}

	stopPlayback(): void {
		this.scene.sound.stopByKey("song");
	}

	updateSettings(settings: GameplaySettings): void {
		this.settings = settings.sound;
	}

	// If playback time should be negative (because of negative offset), this returns 0
	// Might be a problem later, but I can't find a better way
	get song_playback_time(): number | undefined {
		return this.song_instance?.seek;
	}
}