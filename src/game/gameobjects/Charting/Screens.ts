import { GameObjects, Scene } from "phaser"
import { Chart, Song } from "../Song";
import * as g from '../../graphics';
import * as u from '../../helpers/utils';
import TextAreaInput from "phaser3-rex-plugins/templates/ui/textareainput/TextAreaInput";
import DropDownList from "phaser3-rex-plugins/templates/ui/dropdownlist/DropDownList";

// Updating this variable automatically updates keyboard shortcuts
export const SCREEN_TYPES = ["shortcuts", "chart_props", "song_props", "chart_list"] as const;
export type ScreenType = typeof SCREEN_TYPES[number];

export class ScreenManager {
	screens: Record<ScreenType, Screen>;
	active_screen?: ScreenType = undefined;
	song: Song;
	chart_index: number;
	emitter: u.MyEmitter = new u.MyEmitter();

	constructor(scene: Scene, song: Song, chart_index: number) {
		this.screens = {
			chart_props: new ChartProps(scene),
			song_props: new SongProps(scene),
			shortcuts: new Shortcuts(scene),
			chart_list: new ChartList(scene)
		};
		Object.values(this.screens).forEach(s => scene.add.existing(s));

		this.song = song;
		this.chart_index = chart_index;
	}

	get chart(): Chart {
		return this.song.charts[this.chart_index]!;
	}

	// Trying to activate a screen while a different one is active is OK
	activateScreen(type: ScreenType): void {
		if(this.active_screen !== undefined) this.deactivateActiveScreen();
		this.screens[type].activate().prepopulate(this);
		this.active_screen = type;
	}

	// Could be made more type-safe by turning class into a state machine and putting this function inside
	// an "active screen" state. But it's only used in one place so eh
	private deactivateActiveScreen(): void {
		u.shouldntBeUndefined(this.active_screen, "Tried to deactivate active screen when there was none");
		this.screens[this.active_screen].deactivate().saveChanges(this);
		this.active_screen = undefined;
	}

	toggleScreen(type: ScreenType): void {
		if(this.active_screen === type) this.deactivateActiveScreen() ; else this.activateScreen(type);
	}

	isActive(): boolean {
		return this.active_screen !== undefined;
	}
}

abstract class Screen extends GameObjects.Container {
	constructor(scene: Scene){
		super(scene)
		this.add(
			new GameObjects.Rectangle(scene, 0, 0, g.WIDTH, g.HEIGHT, g.CHARTING_SCREEN_BG_COLOR)
				.setOrigin(0)
		);
		this.setDepth(g.DEPTHS.charting_screen).deactivate();
	}

	// Screens use different data, so just pass in the whole manager
	abstract prepopulate(mgr: ScreenManager): void
	abstract saveChanges(mgr: ScreenManager): void

	activate(): this {
		return this.setActive(true).setVisible(true);
	}

	deactivate(): this {
		return this.setActive(false).setVisible(false);
	}
}

class ChartProps extends Screen {
	offset_input: TextAreaInput;
	bpm_input: TextAreaInput;

	constructor(scene: Scene) {
		super(scene);
		this.offset_input = g.chartingScreenTextInput(scene, {x: 400, y: 300}, "Offset");
        this.bpm_input = g.chartingScreenTextInput(scene, {x: 400, y: 500}, "BPM");

		this.add([
			this.offset_input,
			this.bpm_input
		]);
	}

	override prepopulate(mgr: ScreenManager): void {
		this.offset_input.setText(mgr.chart.offset.toString());
		this.bpm_input.setText(mgr.chart.initial_bpm.toString());
	}

	override saveChanges(mgr: ScreenManager): void {
		mgr.chart.offset = Number(this.offset_input.text)
		mgr.chart.initial_bpm = Number(this.bpm_input.text)
	}
}

class SongProps extends Screen {
	song_name_input: TextAreaInput;
	audio_path_input: TextAreaInput;
	audio_credit_input: TextAreaInput;

	constructor(scene: Scene) {
		super(scene);
		this.song_name_input = g.chartingScreenTextInput(scene, {x: 400, y: 200}, "Song Name");
        this.audio_path_input = g.chartingScreenTextInput(scene, {x: 400, y: 400}, "Audio Path");
        this.audio_credit_input = g.chartingScreenTextInput(scene, {x: 400, y: 600}, "Audio Credit");

		this.add([
			this.song_name_input,
			this.audio_path_input,
			this.audio_credit_input
		]);
	}

	override prepopulate(mgr: ScreenManager): void {
		this.song_name_input.setText(mgr.song.song_name);
		this.audio_path_input.setText(mgr.song.audio_path);
		this.audio_credit_input.setText(mgr.song.audio_credit);
	}

	override saveChanges(mgr: ScreenManager): void {
		mgr.song.song_name = this.song_name_input.text;
		mgr.song.audio_path = this.audio_path_input.text;
		mgr.song.audio_credit = this.audio_credit_input.text;

		mgr.emitter.emit("SONG_PATH_CHANGED", [this.audio_path_input.text]);
	}
}

class Shortcuts extends Screen {
	constructor(scene: Scene) {
		super(scene)
		this.add(new GameObjects.Text(scene, 400, 400, "Figure it out yourself lole", {}));
	}

	override prepopulate(_mgr: ScreenManager): void {
		return;
	}

	override saveChanges(_mgr: ScreenManager): void {
		return;
	}
}

// Sorry for the ugly implementation
// This will definitely change once the UI is decided
class ChartList extends Screen {
	selector: DropDownList;

	constructor(scene: Scene) {
		super(scene);

		this.selector = new DropDownList(scene, {
			x: 400, y: 300,
			text: scene.add.text(0, 0, "Chart index", {}),
			background: scene.rexUI.add.roundRectangle(0, 0, 2, 2, 0, 0x000000),
			list: {
				createButtonCallback: function (scene, option) {
                    const button = scene.rexUI.add.label({
                        background: scene.rexUI.add.roundRectangle(0, 0, 2, 2, 0),
                        text: scene.add.text(0, 0, option.text),
                    });
                    (button as any).value = option.value;

                    return button;
                },

                onButtonClick: function (button: Phaser.GameObjects.GameObject) {
                    this.text = (button as any).text;
                    this.value = (button as any).value;
                }
			}
		}).layout();

		const add_button = new GameObjects.Text(scene, 200, 500, "  +  ", { backgroundColor: "#00ff00" })
			.setInteractive()
			.on('pointerdown', () => this.addChart());

		const delete_button = new GameObjects.Text(scene, 600, 500, "  -  ", { backgroundColor: "#ff0000" })
			.setInteractive()
			.on('pointerdown', () => this.deleteChart());

		this.add([
			this.selector,
			add_button,
			delete_button
		]);
	}

	override prepopulate(mgr: ScreenManager): void {
		const options = mgr.song.charts.map((_ch, i) => { 
			return {text: i.toString(), value: i} 
		});
		this.selector.setOptions(options);
		this.selector.text = mgr.chart_index.toString();
		this.selector.value = mgr.chart_index;
	}

	override saveChanges(mgr: ScreenManager): void {
		// Add new charts and delete deleted ones
		const old_charts = mgr.song.charts;
		const new_charts: Chart[] = this.selector.options.map(o => {
			if(o.value >= old_charts.length) return new Chart();
			else return (old_charts[o.value]!)
		})

		// Switch chart if necessary
		const translated_old_index = this.selector.options.map(o => o.value).indexOf(mgr.chart_index);
		const new_index = this.selector.options.map(o => o.value).indexOf(this.selector.value);
		mgr.song.charts = new_charts as [Chart, ...Chart[]];
		mgr.chart_index = new_index;

		if(translated_old_index !== new_index) {
			mgr.emitter.emit("SWITCH_CHART", [new_index]);
		}
	}

	addChart(): void {
		const options = this.selector.options;
		options.push( { text: options.length.toString(), value: options.length });
		this.selector.setOptions(options);
	}

	deleteChart(): void {
		if(this.selector.options.length <= 1) return;
		// We can't index options by selector value, that doesn't work for multiple deletes
		const new_options = this.selector.options.filter(o => o.value !== this.selector.value);
		this.selector.setOptions(new_options);

		this.selector.value = this.selector.options[0].value;
		this.selector.text = this.selector.options[0].text
	}
}