import { GameObjects, Scene } from "phaser";
import { Chart, Song } from "../gameobjects/Song";
import * as u from "../helpers/utils";
import * as s from "./shared";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import { ElementPickerList } from "./ElementPickerList";
import { UITheme } from "./types";

export abstract class PickableElement<T extends GameObjects.GameObject> {
	game_obj: T

	constructor(
		public scene: Scene, 
		public theme: UITheme
	) {}

	// Play animations when being hovered over
	abstract hover(): void;
	abstract unhover(): void;

	processKeyDownEvent(_event: KeyboardEvent): void {}
}

export class SelectableSong extends PickableElement<Sizer> {
	song: Song;
	text: GameObjects.Text;
	chart_selector: ElementPickerList<SelectableChart>;

	constructor(scene: Scene, theme: UITheme, song: Song){
		super(scene, theme)
		this.song = song;
		this.game_obj = this.createGameObj();
	}

	createGameObj(): Sizer {
		const selectable_charts = u.nonEmptyMap(this.song.charts, 
			ch => new SelectableChart(this.scene, this.theme, ch));

		this.chart_selector = new ElementPickerList(this.scene, this.theme, selectable_charts, "horizontal");
		this.text = this.scene.add.text(0, 0, this.song.song_name, {
			...this.theme.text_styles.section_label,
			color: s.colorToString(this.theme.colors.secondary)
		})
		const sizer = s.makeSizer(this.scene, [
			this.text,
			this.chart_selector.panel
		]);
		sizer.setInteractive();

		return sizer;
	}

	hover(){
		this.text.setStyle( { color: s.colorToString(this.theme.colors.primary) } )
		this.chart_selector.selectedElement().hover();
	}
	unhover(){
		this.text.setStyle( { color: s.colorToString(this.theme.colors.secondary) } )
		this.chart_selector.unhoverAll();
	}

	processKeyDownEvent(event: KeyboardEvent): void {
		if(event.key === "ArrowRight") this.chart_selector.moveCursor("down");
		else if(event.key === "ArrowLeft") this.chart_selector.moveCursor("up")
	}
}

export class SelectableChart extends PickableElement<GameObjects.Text> {
	chart: Chart;

	constructor(scene: Scene, theme: UITheme, chart: Chart){
		super(scene, theme);
		this.chart = chart;
		this.game_obj = this.createGameObj();
	}

	createGameObj(): GameObjects.Text {
		return this.scene.add.text(0, 0, this.chart.difficulty.toString(), 
			this.theme.text_styles.element_label).setInteractive();
	}

	hover(){
		this.game_obj.setColor('#0000ff');
	}

	unhover(){
		this.game_obj.setColor('#00ff00');
	}
}