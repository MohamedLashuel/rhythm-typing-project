import { GameObjects, Scene } from "phaser";
import ScrollablePanel from "phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import * as u from './utils';
import RoundRectangle from "phaser3-rex-plugins/plugins/roundrectangle";
import Slider from "phaser3-rex-plugins/templates/ui/slider/Slider";

abstract class InputElement<T extends GameObjects.GameObject, V> {
	element: T

	abstract create(scene: Scene, theme: SidebarTheme): void

	// getValue might error if called before create is
	abstract getValue(): V
}
type ValueTypeOfInputElement<T> = T extends InputElement<infer _T, infer V> ? V : never;

export type SidebarSpec = Record<string, Record<string, InputElement<any,any>>>

// Automatically generate the type definition for a sidebar theme
const styles = ["header", "section_label", "element_label"] as const;
type SidebarStyle = typeof styles[number];
const colors = ["bg", "section", "primary", "secondary"] as const;
type SidebarColor = typeof colors[number];
export type SidebarTheme = {
	text_styles: {
		[Name in SidebarStyle ]: Partial<GameObjects.TextStyle>
	},
	colors: {
		[Name in SidebarColor ]: number
	}
}

export class Sidebar<T extends SidebarSpec> {
	panel: ScrollablePanel;
	game_objs: T;
	scene: Scene;
	theme: SidebarTheme;

	constructor(scene: Scene, theme: SidebarTheme, header: string, width_pct: number, bar_depth: number, 
			elem_depth: number, game_objs: T) {
		this.scene = scene;
		this.theme = theme;

		u.objectForEach(game_objs, obj => {
			u.objectForEach(obj, ie => ie.create(scene, theme))
		});
		this.game_objs = game_objs;

		this.panel = new ScrollablePanel(scene, {
			anchor: {
				left: 'left',
				height: '100%',
				width: `${width_pct}%`
			},
			header: scene.add.text(0, 0, header, theme.text_styles.header),
			origin: 0,
			background: this.makeBackground(this.theme.colors.bg),
			panel: {
				child: this.sidebarSizer(game_objs, elem_depth)
			},
			slider: {
	            track: scene.rexUI.add.roundRectangle({ width: 5, radius: 5, color: theme.colors.primary }),
	            thumb: scene.rexUI.add.roundRectangle({ radius: 5, color: theme.colors.secondary }),
	            hideUnscrollableSlider: true,
	            disableUnscrollableDrag: true
	        },
	        clampChildOY: true,
		}).setDepth(bar_depth).layout();
	}

	activate(): void {
		this.panel.setVisible(true).setActive(true);
	}

	deactivate(): void {
		this.panel.setVisible(false).setActive(false);
	}

	sidebarSizer(game_objs: SidebarSpec, depth: number): Sizer {
		const sections = u.mapObject(game_objs, (obj, label) => this.makeSection(label, obj))
		const sizer = this.makeSizer(sections, { 
			space: {
				left: 5,
				right: 5
			}
		})
		u.objectForEach(sections, (obj => obj.setDepth?.(depth)));
		return sizer;
	}

	makeSizer(game_objs: Record<string, GameObjects.GameObject>, config: Sizer.IConfig = {}): Sizer {
		const sizer = this.scene.rexUI.add.sizer( { 
			orientation: 'vertical',
			...config
		})
		// You have to do scene.add.existing when adding an object to a sizer, for some reason
		u.objectForEach(game_objs, (obj, key) => {
			sizer.add(this.scene.add.existing(obj), { 
				align: 'left',
				padding: { bottom: 10 },
				key: key
			} ) 
		})
		sizer.layout();
		return sizer;
	}

	labelled(label: string, obj: GameObjects.GameObject, style: SidebarStyle): Sizer {
		return this.makeSizer({
			label: this.label(label, this.theme.text_styles[style]),
			object: obj
		})
	}

	label(txt: string, style: Partial<GameObjects.TextStyle>): GameObjects.Text {
		return new GameObjects.Text(this.scene, 0, 0, txt, style);
	}

	makeSection(label: string, game_objs: Record<string, InputElement<any, any>>): Sizer {
		const labelled_objs = u.mapObject(game_objs, (ie, label) => {
			return this.labelled(label, ie.element, "element_label")
		});
		const sizer = this.makeSizer(labelled_objs);
		return this.labelled(label, sizer, "section_label")
			.addBackground(this.makeBackground(this.theme.colors.section))
	}

	makeBackground(color: number): RoundRectangle {
		return this.scene.rexUI.add.roundRectangle({color: color}).setToBack()
	}

	get<S extends keyof T, E extends Extract<u.t.Layer2Keys<T>, string>>(
			section_key: S, elem_key: E): ValueTypeOfInputElement<T[S][E]> {
		// It's probably possible to retype T to make this type-safe, but it would be a big pain
		return (this.game_objs as any)[section_key][elem_key].getValue();
	}
}

type NumberSliderParams = {
	default: number,
	min: number,
	max: number,
	step: number
}

export class NumberSlider extends InputElement<Slider, number> {
	params: NumberSliderParams;
	width_pct: number;
	value: number;

	constructor(params: NumberSliderParams, width_pct: number){
		super();
		this.params = params;
		this.width_pct = width_pct;
	}

	override create(scene: Scene, theme: SidebarTheme): void {
		this.element = scene.rexUI.add.slider({
			anchor: {
				width: `${this.width_pct}%`
			},
			space: {
				top: 5,
				bottom: 15
			},
	        track: {
	        	height: 2,
	        	color: theme.colors.secondary
	        },
	        thumb: {
	        	radius: 10,
	        	color: theme.colors.primary
	        },
	        valuechangeCallback: () => {},
	        gap: this.params.step / (this.params.max - this.params.min),
	    })
	    	.setValue(this.params.default, this.params.min, this.params.max)
		    .layout();
	}

	sliderValToRealValue(val: number): number {
		return Math.round(val * (this.params.max - this.params.min) + this.params.min)
	}

	override getValue(): number {
		return this.sliderValToRealValue(this.element.value);
	}
}