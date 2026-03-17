import { Scene, GameObjects } from 'phaser';
import { Song } from '../gameobjects/Song';

const song_json = '{"song_name":"","audio_path":"assets/turkey.ogg","audio_credit":"","charts":[{"author":"","scroll_changes":[[1.5,{"mult":0.5,"total_distance":1.5}],[1.875,{"mult":1,"total_distance":1.6875}],[2.25,{"mult":1.5,"total_distance":2.0625}],[2.5,{"mult":1,"total_distance":2.4375}]],"bpms":[["0/10/16",{"total_time":1.25,"bpm":130}]],"entity_specs":[["0/2/4",{"note":{"chars":["a"]}}],["0/9/16",{"note":{"chars":["b"]}}],["0/10/16",{"bpm_marker":{"bpm":130},"note":{"chars":["c"]}}],["0/11/16",{"note":{"chars":["d"]}}],["0/12/16",{"note":{"chars":["e"]},"scroll_zone":{"end_timing":{"beat":"0/15/16","time":1.875,"scroll_pos":1.6875},"mult":0.5}}],["0/13/16",{"note":{"chars":["f"]}}],["0/14/16",{"note":{"chars":["g"]}}],["0/15/16",{"note":{"chars":["h"]}}],["1/0/16",{"note":{"chars":["i"]}}],["1/1/16",{"note":{"chars":["j"]}}],["1/2/16",{"note":{"chars":["k"]},"scroll_zone":{"end_timing":{"beat":"1/4/16","time":2.5,"scroll_pos":2.4375},"mult":1.5}}],["1/3/16",{"note":{"chars":["l"]}}],["1/4/16",{"note":{"chars":["m"]}}]],"offset":0,"initial_bpm":120}]}'

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
            this.scene.start('Gameplay', { song: song, chart_index: 0 });
        });

        this.input?.keyboard?.addKey('c').on("down", () => {
            this.scene.start('Precharting');
        })
    }
}
