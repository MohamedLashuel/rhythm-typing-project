import { GameObjects, Scene } from "phaser";
import NumberBar from "phaser3-rex-plugins/templates/ui/numberbar/NumberBar";
import * as u from '../helpers/utils';
import { UITheme } from "./types";

export abstract class InputElement<T extends GameObjects.GameObject, V> {
	game_obj: T

	abstract create(scene: Scene, theme: UITheme): void

	// getValue might error if called before create is
	abstract getValue(): V
}

type NumberSliderParams = {
	default: number,
	min: number,
	max: number,
	step: number
}

export class NumberSlider extends InputElement<NumberBar, number> {
	params: NumberSliderParams;
	width_pct: number;
	value: number;

	constructor(params: NumberSliderParams, width_pct: number){
		super();
		this.params = params;
		this.width_pct = width_pct;
	}

	override create(scene: Scene, theme: UITheme): void {
		const icon = scene.rexUI.add.label({
			width: 16,
			height: 16,
			background: scene.rexUI.add.roundRectangle(0, 0, 0, 0, 10, theme.colors.primary)
		})
			.setInteractive()
			.on('pointerdown', () => {
				this.game_obj.value = this.realValToSliderVal(this.params.default)
			})
		this.game_obj = scene.rexUI.add.numberBar({
			anchor: {
				width: `${this.width_pct}%`
			},
			space: {
				top: 5,
				bottom: 15
			},
			text: scene.add.text(0, 0, "", theme.text_styles.value),
			slider: {
				track: {
		        	height: 2,
		        	color: theme.colors.secondary
		        },
		        thumb: {
		        	radius: 10,
		        	color: theme.colors.primary
		        },
		        input: 'drag'
			},
			icon: icon,
	        valuechangeCallback: (val, _old_val, numberBar) => {
                numberBar.text = this.sliderValToRealVal(val).toString();
            },
	    })
	    	.setValue(this.params.default, this.params.min, this.params.max)
		    .layout();
	}

	sliderValToRealVal(val: number): number {
		return u.roundTo(val * (this.params.max - this.params.min) + this.params.min, this.params.step)
	}

	realValToSliderVal(val: number): number {
		return (val - this.params.min) / (this.params.max - this.params.min);
	}

	override getValue(): number {
		return this.sliderValToRealVal(this.game_obj.value);
	}
}