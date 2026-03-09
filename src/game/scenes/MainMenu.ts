import { Scene, GameObjects } from 'phaser';
import { Song } from '../gameobjects/Song';

const song_json = '{"song_name":"","audio_path":"assets/turkey.ogg","audio_credit":"","charts":[{"author":"","scroll_changes":[],"bpms":[],"entity_specs":[["0/1/8",{"note":{"chars":["a"]}}]],"offset":0,"initial_bpm":120}]}'

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        const song = Song.fromJSON(song_json);
        this.logo = this.add.image(512, 300, 'logo');

        this.title = this.add.text(512, 460, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('Game', { song: song, chart_index: 0 });
        });

        this.input?.keyboard?.addKey('c').on("down", () => {
            this.scene.start('Charting', { song: song, chart_index: 0 });
        })
    }
}
