import { Scene } from 'phaser';
import * as u from '../utils';

export class Results extends Scene
{
	camera: Phaser.Cameras.Scene2D.Camera;
	dt: u.t.ResultsData;

    constructor () {
        super('Results');
    }

    init(data: u.t.ResultsData) {
    	this.dt = data;
    }

    preload () {

    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.makeResultsScreen();

		this.input.once('pointerdown', () => this.scene.start('MainMenu'));
    }

    update () {

    }

    makeResultsScreen() {
    	this.add.text(100, 100, this.dt.song.song_name, {fontSize: 24});
    	this.add.text(100, 300, this.dt.score.toString(), {fontSize: 24});
    	const judgment_names: string[] = this.dt.judgments.map(j => j.name);
    	this.add.text(100, 500, JSON.stringify(u.countStrings(judgment_names)), {fontSize: 24});
    }
}
