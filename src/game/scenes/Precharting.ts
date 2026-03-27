import { OpenFileChooser } from 'phaser3-rex-plugins/plugins/filechooser';
import { Scene } from 'phaser';
import { Song } from '../gameobjects/Song';

export class Precharting extends Scene
{
	camera: Phaser.Cameras.Scene2D.Camera;

    constructor () {
        super('Precharting');
    }

    preload (): void {

    }

    create (): void
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.add.text(500, 500, "Press n for new song or o to open file")
        
        this.input.keyboard?.on('keydown', (evt: KeyboardEvent) => this.handleKeyDown(evt));
    }

    update (): void {

    }

    async handleKeyDown(evt: KeyboardEvent): Promise<void> {
    	let song: Song | undefined = undefined;
    	if(evt.key === 'o'){
    		song = await this.loadSongFromFileInput();
    	} else if (evt.key === 'n'){
    		song = new Song();
    	}
    	if(song !== undefined) this.scene.start('Charting', song);
    }

    loadSongFromFileInput(): Promise<Song> {
    	return OpenFileChooser(this).then(async function(result) {
    		const file = result.files[0]!;
			return await file.text().then( txt => Song.fromJSON(txt));
		})
    }
}
