import * as g from '../graphics';
import { NumberSlider } from '../ui/InputElement';
import { InputSidebar, SidebarSpec } from '../ui/InputSidebar';
import * as u from '../helpers/utils';
import { Scene } from "phaser";
import { GameplaySettings } from './types';
import { Layer2Keys, RemapLeaves } from '../helpers/types';

const sidebar_width = g.SETTINGS_WIDTH_PCT;

// We define this outside of the class so we can use its type for the sidebar property
function settingsSidebarSpec() {
	return {
		Rendering: {
			"Scroll Speed": new NumberSlider( { default: 400, min: 100, max: 600, step: 5}, 
				sidebar_width - 5)
		},
		Sound: {
			"Music Rate": new NumberSlider( { default: 1, min: 0.1, max: 4, step: 0.01}, 
				sidebar_width - 5)
		}
	} as const satisfies SidebarSpec;
} 
type SettingsSpecType = ReturnType<typeof settingsSidebarSpec>;

export class SettingsTab {
	sidebar: InputSidebar<SettingsSpecType>;
	active: boolean;
	emitter: u.MyEmitter = new u.MyEmitter();

	constructor(scene: Scene) {
		const spec = settingsSidebarSpec();

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
		this.active ? this.deactivate() : this.activate();
	}

	getSettings(): GameplaySettings {
		const keys: RemapLeaves<GameplaySettings, 
				[keyof SettingsSpecType, Layer2Keys<SettingsSpecType>]> = 
		{
			render: {
				base_scroll_speed: ["Rendering", "Scroll Speed"]
			},
			sound: {
				music_rate: ["Sound", "Music Rate"]
			}
		}
		return u.mapObject(keys, section => {
			return u.mapObject(section, ([k1, k2]) => this.sidebar.get(k1, k2))
		});
	}
	
}