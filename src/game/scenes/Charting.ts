import { Scene } from 'phaser';
import { ChartingManager } from '../gameobjects/Charting/Manager';
import '../gameobjects/Gameplay/NoteField'
import * as g from '../graphics'
import { Chart } from '../gameobjects/Song';

const chartjson = '{"author":"","scroll_changes":[],"bpms":[],"entities":[{"chars":["a"],"beat":{"measure":4,"index":0,"division":4}},{"chars":["p"],"beat":{"measure":4,"index":1,"division":8}},{"chars":["r"],"beat":{"measure":4,"index":4,"division":16}},{"chars":["i"],"beat":{"measure":4,"index":5,"division":16}},{"chars":["l"],"beat":{"measure":4,"index":6,"division":16}},{"chars":["e"],"beat":{"measure":4,"index":7,"division":16}},{"chars":["d"],"beat":{"measure":4,"index":8,"division":16}},{"chars":["m"],"beat":{"measure":4,"index":10,"division":16}},{"chars":["c"],"beat":{"measure":4,"index":12,"division":16}},{"chars":["o"],"beat":{"measure":4,"index":13,"division":16}},{"chars":["r"],"beat":{"measure":4,"index":14,"division":16}},{"chars":["n"],"beat":{"measure":4,"index":15,"division":16}},{"chars":["y"],"beat":{"measure":5,"index":0,"division":16}},{"chars":["w"],"beat":{"measure":5,"index":4,"division":16}},{"chars":["r"],"beat":{"measure":5,"index":5,"division":16}},{"chars":["i"],"beat":{"measure":5,"index":6,"division":16}},{"chars":["t"],"beat":{"measure":5,"index":7,"division":16}},{"chars":["e"],"beat":{"measure":5,"index":8,"division":16}},{"chars":["d"],"beat":{"measure":5,"index":12,"division":16}},{"chars":["a"],"beat":{"measure":5,"index":13,"division":16}},{"chars":["r"],"beat":{"measure":5,"index":14,"division":16}},{"chars":["k"],"beat":{"measure":5,"index":15,"division":16}},{"chars":["v"],"beat":{"measure":6,"index":0,"division":16}},{"chars":["i"],"beat":{"measure":6,"index":1,"division":16}},{"chars":["l"],"beat":{"measure":6,"index":2,"division":16}},{"chars":["e"],"beat":{"measure":6,"index":3,"division":16}},{"chars":["m"],"beat":{"measure":6,"index":4,"division":16}},{"chars":["o"],"beat":{"measure":6,"index":5,"division":16}},{"chars":["d"],"beat":{"measure":6,"index":6,"division":16}},{"chars":["e"],"beat":{"measure":6,"index":7,"division":16}},{"chars":["m"],"beat":{"measure":6,"index":8,"division":16},"hold_beat":{"measure":6,"index":9,"division":16}},{"chars":["w"],"beat":{"measure":6,"index":12,"division":16}},{"chars":["i"],"beat":{"measure":6,"index":7,"division":8}},{"chars":["t"],"beat":{"measure":7,"index":0,"division":8}},{"chars":["h"],"beat":{"measure":7,"index":1,"division":8}},{"chars":["h"],"beat":{"measure":7,"index":2,"division":8}},{"chars":["o"],"beat":{"measure":7,"index":3,"division":8}},{"chars":["l"],"beat":{"measure":7,"index":4,"division":8}},{"chars":["d"],"beat":{"measure":7,"index":5,"division":8}},{"chars":["b"],"beat":{"measure":7,"index":6,"division":8}},{"chars":["l"],"beat":{"measure":7,"index":7,"division":8}},{"chars":["a"],"beat":{"measure":8,"index":0,"division":8}},{"chars":["s"],"beat":{"measure":8,"index":1,"division":8}},{"chars":["t"],"beat":{"measure":8,"index":2,"division":8}},{"chars":["e"],"beat":{"measure":8,"index":3,"division":8}},{"chars":["r"],"beat":{"measure":8,"index":2,"division":4},"hold_beat":{"measure":8,"index":5,"division":8}},{"chars":["j"],"beat":{"measure":8,"index":6,"division":8}},{"chars":["u"],"beat":{"measure":8,"index":13,"division":16}},{"chars":["i"],"beat":{"measure":8,"index":14,"division":16}},{"chars":["c"],"beat":{"measure":8,"index":15,"division":16}},{"chars":["e"],"beat":{"measure":9,"index":0,"division":16}},{"chars":["f"],"beat":{"measure":9,"index":4,"division":16}},{"chars":["l"],"beat":{"measure":9,"index":5,"division":16}},{"chars":["o"],"beat":{"measure":9,"index":6,"division":16}},{"chars":["a"],"beat":{"measure":9,"index":7,"division":16}},{"chars":["t"],"beat":{"measure":9,"index":8,"division":16}},{"chars":["h"],"beat":{"measure":9,"index":12,"division":16}},{"chars":["i"],"beat":{"measure":9,"index":13,"division":16}},{"chars":["r"],"beat":{"measure":9,"index":14,"division":16}},{"chars":["e"],"beat":{"measure":9,"index":15,"division":16}},{"chars":["g"],"beat":{"measure":10,"index":0,"division":16}},{"chars":["l"],"beat":{"measure":10,"index":1,"division":16}},{"chars":["u"],"beat":{"measure":10,"index":2,"division":16}},{"chars":["e"],"beat":{"measure":10,"index":3,"division":16}},{"chars":["n"],"beat":{"measure":10,"index":4,"division":16}},{"chars":["a"],"beat":{"measure":10,"index":5,"division":16}},{"chars":["s"],"beat":{"measure":10,"index":6,"division":16}},{"chars":["t"],"beat":{"measure":10,"index":7,"division":16}},{"chars":["y"],"beat":{"measure":10,"index":8,"division":16}},{"chars":["p"],"beat":{"measure":10,"index":12,"division":16}},{"chars":["i"],"beat":{"measure":10,"index":7,"division":8}},{"chars":["p"],"beat":{"measure":11,"index":0,"division":8}},{"chars":["e"],"beat":{"measure":11,"index":1,"division":8}}],"offset":-0.213,"initial_bpm":150}'

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
        
        this.manager = new ChartingManager(this, {x: 0, y: g.NOTE_FIELD_Y}, 'turkey', Chart.fromJSON(chartjson, this));
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
