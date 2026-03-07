import { Scene } from 'phaser';
import { ChartingManager } from '../gameobjects/Charting/Manager';
import '../gameobjects/Gameplay/NoteField'
import * as g from '../graphics'
import { Song } from '../gameobjects/Song';

const song_json = '{"song_name":"","audio_path":"","audio_credit":"","charts":[{"author":"","scroll_changes":[],"bpms":[],"entities":[{"chars":["a"],"beat":"0/2/4"}],"offset":0,"initial_bpm":120}]}';

export class Charting extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    manager: ChartingManager;
    debug_text: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Charting');
    }

    preload ()
    {
        this.load.audio('beethoven', 'assets/beethoven.mp3')
        this.load.audio('turkey', 'assets/turkey.ogg')
        this.load.audio('hit', 'assets/hit.wav')
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);
        
        this.manager = new ChartingManager(this, {x: 0, y: g.NOTE_FIELD_Y}, 'turkey', Song.fromJSON(song_json, this));
        this.manager.keyboard.registerHandlers(this);
        // This isn't needed for the game scene, but it is needed here. No clue why.
        this.add.existing(this.manager.note_field.renderer);

        this.debug_text = this.add.text(10, 600, "");
        
    }

    update (_time: number, delta_ms: number)
    {
        this.updateDebug("");
        this.manager.myUpdate(delta_ms);
    }

    // Used to display values for debugging
    updateDebug (...obj: any[]){
        this.debug_text.setText(obj.toString());
    }
}
