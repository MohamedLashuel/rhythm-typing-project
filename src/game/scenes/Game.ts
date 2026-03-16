import { Scene } from 'phaser';
import { Chart, Song } from '../gameobjects/Song';
import * as c from '../config';
import * as g from '../graphics';
import { GameplayManager } from '../gameobjects/Gameplay/Manager';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    manager: GameplayManager;
    debug_text: Phaser.GameObjects.Text;

    song: Song;
    chart_index: number;

    constructor () {
        super('Game');
    }

    init(data: { song: Song, chart_index: number }) {
        this.song = data.song;
        this.chart_index = data.chart_index;
    }

    preload ()
    {
        this.load.audio("song", this.song.audio_path);

        this.load.audio("hit", "assets/hit.wav")
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.manager = new GameplayManager(this, c.DEFAULT_SETTINGS, this.chart, {x: 0, y: g.NOTE_FIELD_Y});
        this.manager.keyboard.registerHandlers(this);
        
        this.debug_text = this.add.text(10, 600, "", g.NOTE_STYLE);
    }

    get chart(): Chart {
        return this.song.charts[this.chart_index] as Chart;
    }

    update (_time: number, _delta_ms: number)
    {
        this.manager.myUpdate();
        this.updateDebug();
    }

    // Used to display values for debugging
    updateDebug (obj?: any){
        this.debug_text.setText((obj ?? "").toString());
    }
}
