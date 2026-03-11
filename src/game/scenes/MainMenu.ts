import { Scene, GameObjects } from 'phaser';
import { Song } from '../gameobjects/Song';

const song_json = '{"song_name":"","audio_path":"assets/turkey.ogg","audio_credit":"","charts":[{"author":"","scroll_changes":[],"bpms":[],"entity_specs":[["0/1/8",{"note":{"chars":["a"]}}],["0/1/4",{"note":{"chars":["a"]}}],["0/4/12",{"note":{"chars":["d"]}}],["0/5/12",{"note":{"chars":["e"]}}],["0/2/4",{"note":{"chars":["b"]}}]],"offset":0,"initial_bpm":120}]}'

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
        this.logo = this.add.image(512, 300, 'logo');

        this.title = this.add.text(512, 460, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            const song = Song.fromJSON(song_json);
            this.scene.start('Game', { song: song, chart_index: 0 });
        });

        this.input?.keyboard?.addKey('c').on("down", () => {
            this.scene.start('Precharting');
        })
    }
}
