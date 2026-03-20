import { Scene } from 'phaser';
import { ChartingManager } from '../gameobjects/Charting/Manager';
import '../gameobjects/Gameplay/NoteField'
import * as g from '../graphics'
import { Song } from '../gameobjects/Song';

export class Charting extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    manager: ChartingManager;
    debug_text: Phaser.GameObjects.Text;

    song: Song;
    chart_index: number;

    constructor () {
        super('Charting');
    }

    init(song: Song) {
        this.song = song;
    }

    preload ()
    {
        this.load.audio('song', this.song.audio_path);
        this.load.audio("hit", "assets/hit.wav");
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);
        
        this.manager = new ChartingManager(this, {x: 0, y: g.NOTE_FIELD_Y}, this.song);
        // This isn't needed for the game scene, but it is needed here. No clue why.
        this.add.existing(this.manager.note_field.renderer);

        this.debug_text = this.add.text(10, 700, "");
        
    }

    update ()
    {
        this.updateDebug();
        this.manager.myUpdate();
    }

    // Used to display values for debugging
    updateDebug (...obj: any[]){
        this.debug_text.setText(obj.toString());
    }
}
