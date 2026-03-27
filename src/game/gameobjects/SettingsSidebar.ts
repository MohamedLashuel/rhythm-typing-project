import * as g from '../graphics';
import { NumberSlider } from '../ui/InputElement';
import { InputSidebar, SidebarSpec } from '../ui/InputSidebar';
import * as u from '../helpers/utils';
import { Scene } from "phaser";
import { GameplaySettings, SettingsEvents } from './types';
import { Layer2Keys, RemapLeaves } from '../helpers/types';
import { MyEmitter } from '../phaser-wrappers/MyEmitter';

const sidebar_width = g.SETTINGS_WIDTH_PCT;
const elem_width = sidebar_width - 5;

// We define this outside of the class so we can use its type for the sidebar property
const settings_sidebar_spec = {
	Rendering: {
		"Scroll Speed": new NumberSlider( { default: 400, min: 100, max: 600, step: 5}, elem_width)
	},
	Sound: {
		"Music Rate": new NumberSlider( { default: 1, min: 0.1, max: 4, step: 0.05}, elem_width),
		"Music Volume": new NumberSlider( { default: 0.5, min: 0, max: 1, step: 0.05}, elem_width),
		"Hitsound Volume": new NumberSlider( { default: 0.5, min: 0, max: 1, step: 0.05}, elem_width)
	}
} as const satisfies SidebarSpec

export class SettingsTab {
	sidebar: InputSidebar<typeof settings_sidebar_spec>;
	active: boolean;
	emitter: MyEmitter<SettingsEvents> = new MyEmitter();

	constructor(scene: Scene) {
		const spec = settings_sidebar_spec;

		this.sidebar = new InputSidebar(scene, g.SETTINGS_THEME, "Settings", sidebar_width, 
			g.DEPTHS.settings_sidebar, g.DEPTHS.settings_elements, spec);
		this.sidebar.deactivate();
		this.active = false;
	}

	activate(): void {
		this.sidebar.activate();
		this.active = true;
	}

	deactivate(): void {
		this.sidebar.deactivate();
		this.emitter.emit("SETTINGS_CHANGED", [this.getSettings()] )
		this.active = false;
	}

	toggle(): void {
		if(this.active) this.deactivate() ; else this.activate();
	}

	getSettings(): GameplaySettings {
		const keys: RemapLeaves<GameplaySettings, 
				[keyof typeof settings_sidebar_spec, Layer2Keys<typeof settings_sidebar_spec>]> = 
		{
			render: {
				base_scroll_speed: ["Rendering", "Scroll Speed"]
			},
			sound: {
				music_rate: ["Sound", "Music Rate"],
				music_volume: ["Sound", "Music Volume"],
				hitsound_volume: ["Sound", "Hitsound Volume"]
			}
		}
		return u.mapObject(keys, section => {
			return u.mapObject(section, ([k1, k2]) => this.sidebar.get(k1, k2))
		});
	}
	
}