import { GameObjects, Scene } from "phaser";
import ScrollablePanel from "phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import * as u from './utils';
import RoundRectangle from "phaser3-rex-plugins/plugins/roundrectangle";

export type SidebarSpec = Record<string, Record<string, GameObjects.GameObject>>

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
	sidebar_sizer: Sizer;
	scene: Scene;
	theme: SidebarTheme;

	constructor(scene: Scene, theme: SidebarTheme, header: string, width_pct: number, bar_depth: number, 
			elem_depth: number, game_objs: T) {
		this.scene = scene;
		this.theme = theme;

		this.sidebar_sizer = this.sidebarSizer(game_objs, elem_depth);

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
				child: this.sidebar_sizer
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

	makeSection(label: string, game_objs: Record<string, GameObjects.GameObject>): Sizer {
		const labelled_objs = u.mapObject(game_objs, (obj, label) => {
			return this.labelled(label, obj, "element_label")
		});
		const sizer = this.makeSizer(labelled_objs);
		return this.labelled(label, sizer, "section_label")
			.addBackground(this.makeBackground(this.theme.colors.section))
	}

	makeBackground(color: number): RoundRectangle {
		return this.scene.rexUI.add.roundRectangle({color: color}).setToBack()
	}

	get<S extends Extract<keyof T, string>>(section_key: S, elem_key: Extract<keyof T[S], string>):
			GameObjects.GameObject {
		return (this.sidebar_sizer as any)
			.getElement(section_key)
			.getElement("object")
			.getElement(elem_key)
			.getElement("object");

	}
}

export function numberSlider(scene: Scene, width_pct: number, def: number, min: number, max: number, 
		step: number) {
	const COLOR_LIGHT = 0x7b5e57;
	const COLOR_DARK = 0x260e04;

	return scene.rexUI.add.slider({
		anchor: {
			width: `${width_pct}%`
		},
		space: {
			top: 5,
			bottom: 15
		},
        track: {
        	height: 2,
        	color: COLOR_DARK
        },
        thumb: {
        	radius: 10,
        	color: COLOR_LIGHT
        },
        valuechangeCallback: (v) => {console.log(v)},
        gap: step / (max - min),
    })
    	.setValue(def, min, max)
	    .layout();
}