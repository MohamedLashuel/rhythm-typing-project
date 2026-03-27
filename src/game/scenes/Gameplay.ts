import { Scene } from 'phaser';
import { Chart, Song } from '../gameobjects/Song';
import * as g from '../graphics';
import { GameplayManager } from '../gameobjects/Gameplay/Manager';
import { GameplayData } from './types';

export class Gameplay extends Scene
{
    manager: GameplayManager;
    debug_text: Phaser.GameObjects.Text;

    dt: GameplayData;

    is_fading: boolean = false;

    constructor () {
        super('Gameplay');
    }

    init(data: GameplayData): void {
        this.dt = data;
    }

    preload (): void
    {
        this.load.audio("song", this.dt.song.audio_path);
        this.load.audio("hit", "assets/hit.wav");
    }

    create (): void
    {
        this.cameras.main.setBackgroundColor(0x000000);

        this.manager = new GameplayManager(this, this.dt.settings, this.chart, {x: 0, y: g.NOTE_FIELD_Y});
        
        this.debug_text = this.add.text(10, 600, "", g.NOTE_STYLE);
    }

    get chart(): Chart {
        return this.dt.song.charts[this.dt.chart_index]!;
    }

    update(_time: number, _delta_ms: number): void {
        this.updateDebug();
        if( this.manager.isComplete() ) {
            if(!this.is_fading) this.finishChart();
        }
        else {
            this.manager.myUpdate()
        };
    }

    // Used to display values for debugging
    updateDebug (obj?: any): void {
        this.debug_text.setText((obj ?? "").toString());
    }

    finishChart(): void {
        this.is_fading = true;
        
        this.cameras.main.once('camerafadeoutcomplete', () => {
            const logic = this.manager.note_field.logic;
            this.scene.start('Results', { song: Song, chart: Chart, score: logic.score, 
                judgments: logic.judgments } );
        });

        this.cameras.main.fadeOut(1000, 0, 0, 0);

        this.manager.sound.stopPlayback();
    }
}
