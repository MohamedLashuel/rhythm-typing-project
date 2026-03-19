import { Scene } from 'phaser';
import * as u from '../helpers/utils';
import { ResultsData } from './types';

export class Results extends Scene
{
	dt: ResultsData;

    constructor () {
        super('Results');
    }

    init(data: ResultsData) {
    	this.dt = data;
    }

    preload () {

    }

    create ()
    {
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        this.makeResultsScreen();

		this.input.once('pointerdown', () => this.scene.start('MainMenu'));
    }

    update () {

    }

    makeResultsScreen() {
    	this.add.text(100, 100, this.dt.song.song_name, {fontSize: 24});
    	this.add.text(100, 300, `Score: ${this.dt.score}`, {fontSize: 24});
    	const judgment_names: string[] = this.dt.judgments.map(j => j.name);
    	this.add.text(100, 500, JSON.stringify(u.countStrings(judgment_names)), {fontSize: 24});
    }
}
