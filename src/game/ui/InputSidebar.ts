import { GameObjects, Scene } from "phaser";
import ScrollablePanel from "phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import * as u from '../helpers/utils';
import * as s from './shared';
import { InputElement } from "./InputElement";
import { Layer2Keys } from "../helpers/types";
import { UITextStyle, UITheme } from "./types";

type ValueTypeOfInputElement<T> = T extends InputElement<infer _T, infer V> ? V : never;

export type SidebarSpec = Record<string, Record<string, InputElement<any,any>>>

export class InputSidebar<T extends SidebarSpec> {
	panel: ScrollablePanel;
	elements: T;
	scene: Scene;
	theme: UITheme;

	constructor(scene: Scene, theme: UITheme, header: string, width_pct: number, bar_depth: number, 
			elem_depth: number, game_objs: T) {
		this.scene = scene;
		this.theme = theme;

		u.objectForEach(game_objs, obj => {
			u.objectForEach(obj, ie => ie.create(scene, theme))
		});
		this.elements = game_objs;

		this.panel = new ScrollablePanel(scene, {
			anchor: {
				left: 'left',
				height: '100%',
				width: `${width_pct}%`
			},
			header: scene.add.text(0, 0, header, theme.text_styles.header),
			origin: 0,
			background: s.makeBackground(scene, this.theme.colors.bg),
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
		return s.makeSizer(this.scene, game_objs, config, {align: 'left', padding: { bottom: 10 }});
	}

	labelled(label: string, obj: GameObjects.GameObject, style: UITextStyle): Sizer {
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
			return this.labelled(label, ie.game_obj, "element_label")
		});
		const sizer = this.makeSizer(labelled_objs);
		return this.labelled(label, sizer, "section_label")
			.addBackground(s.makeBackground(this.scene, this.theme.colors.section))
	}

	get<S extends keyof T, E extends Extract<Layer2Keys<T>, string>>(
			section_key: S, elem_key: E): ValueTypeOfInputElement<T[S][E]> {
		// It's probably possible to retype T to make this type-safe, but it would be a big pain
		return (this.elements as any)[section_key][elem_key].getValue();
	}
}