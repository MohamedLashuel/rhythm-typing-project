import { Scene } from 'phaser';
import { Song } from '../gameobjects/Song';
import { ElementPickerList } from '../ui/ElementPickerList';
import { SelectableSong } from '../ui/PickableElement';
import { KeyboardManager } from '../gameobjects/KeyboardManager';
import * as u from '../helpers/utils';
import * as g from '../graphics';
import { SettingsTab } from '../gameobjects/SettingsSidebar';
import { NonEmptyArray } from '../helpers/types';

export class SongSelect extends Scene
{
    // Need to guarantee at least one song because ElementPickerList requires at least one element
    songs: NonEmptyArray<Song>;
    keyboard: KeyboardManager;
    select: ElementPickerList<SelectableSong>
    settings: SettingsTab;

    constructor () {
        super('SongSelect');
    }

    preload (): void {
        this.load.json('songs', 'assets/all_songs.json');
    }

    create (): void
    {
        this.songs = this.cache.json.get('songs').map((json: string) => Song.fromJSON(json));
        this.keyboard = new KeyboardManager(this);
        this.settings = new SettingsTab(this);
        this.cameras.main.setBackgroundColor(0x000000);
        this.makeSongSelect()
    }

    update (): void {
        this.keyboard.handleQueues(e => this.processKeyDownEvent(e))
    }

    processKeyDownEvent(event: KeyboardEvent): void {
        if (event.key === "s") this.settings.toggle();
        else if(this.settings.active) return;
        else if(event.key === "Enter") this.startGameplay();
        else this.select.processKeyDownEvent(event);
    }

    makeSongSelect(): void {
        const els = u.nonEmptyMap(this.songs, s => new SelectableSong(this, g.SONG_SELECT_THEME, s));
        this.select = new ElementPickerList(this, g.SONG_SELECT_THEME, els, "vertical", {
            anchor: {
                right: 'right',
                height: '100%',
                width: '40%'
            }
        });
    }

    startGameplay(): void {
        const song = this.songs[this.select.cursor];
        u.shouldntBeUndefined(song, "Song cursor out of bounds indexing songs");

        const chart_index = this.select.selectedElement().chart_selector.cursor

        this.scene.start("Gameplay", { song: song, chart_index: chart_index, 
            settings: this.settings.getSettings() })
    }
}