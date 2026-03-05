import { GameObjects, Scene } from "phaser"
import { Chart } from "../Song";
import * as g from '../../graphics';
import * as u from '../../utils';
import TextAreaInput from "phaser3-rex-plugins/templates/ui/textareainput/TextAreaInput";

type ScreenType = "chart_props" | "song_props" | "help"

export class ScreenManager {
	screens: Record<ScreenType, Screen>;
	active_screen?: ScreenType = undefined;
	chart: Chart;

	constructor(scene: Scene, chart: Chart) {
		this.screens = {
			chart_props: new ChartProps(scene),
			song_props: new ChartProps(scene),
			help: new ChartProps(scene)
		};
		Object.values(this.screens).forEach(s => scene.add.existing(s));

		this.chart = chart;
	}

	// Trying to activate a screen while a different one is active is OK
	activateScreen(type: ScreenType): void {
		if(this.active_screen !== undefined) this.deactivateActiveScreen();
		this.screens[type].activate().prepopulate(this.chart);
		this.active_screen = type;
	}

	deactivateActiveScreen(): void {
		u.shouldntBeUndefined(this.active_screen, "Tried to deactivate active screen when there was none");
		this.screens[this.active_screen].deactivate().saveToChart(this.chart);
		this.active_screen = undefined;
	}

	toggleScreen(type: ScreenType): void {
		(this.active_screen === type) ? this.deactivateActiveScreen() : this.activateScreen(type);
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
		this.setDepth(10).deactivate();
	}

	abstract prepopulate(chart: Chart): void

	abstract saveToChart(chart: Chart): void

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
		this.offset_input = scene.rexUI.add.textAreaInput({
            x: 400,
            y: 300,
            width: 220,
            height: 100,
            background: scene.rexUI.add.roundRectangle(0, 0, 2, 2, 0, 0xff0000)
        }).layout()

        this.bpm_input = scene.rexUI.add.textAreaInput({
            x: 400,
            y: 500,
            width: 220,
            height: 100,
            background: scene.rexUI.add.roundRectangle(0, 0, 2, 2, 0, 0xff0000)
        }).layout()

		this.add([
			this.offset_input,
			this.bpm_input
		]);
	}

	override prepopulate(chart: Chart): void {
		this.offset_input.setText(chart.offset.toString());
		this.bpm_input.setText(chart.initial_bpm.toString());
	}

	override saveToChart(chart: Chart): void {
		chart.offset = Number(this.offset_input.text)
		chart.initial_bpm = Number(this.bpm_input.text)
	}
}