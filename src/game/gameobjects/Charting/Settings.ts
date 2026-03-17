import * as ui from '../../ui';
import * as g from '../../graphics';
import * as u from '../../utils';
import { Scene } from "phaser";

const sidebar_width = g.SETTINGS_WIDTH_PCT;

// We define this outside of the class so we can use its type for the sidebar property
function settingsSidebarSpec() {
	return {
		Rendering: {
			"Scroll Speed": new ui.NumberSlider( { default: 400, min: 100, max: 600, step: 5}, 
				sidebar_width - 5)
		},
		Sound: {
			"Music Rate": new ui.NumberSlider( { default: 1, min: 0.1, max: 4, step: 0.01}, 
				sidebar_width - 5)
		}
	} as const satisfies ui.SidebarSpec;
} 
type SettingsSpecType = ReturnType<typeof settingsSidebarSpec>;

export class SettingsTab {
	sidebar: ui.Sidebar<SettingsSpecType>;
	active: boolean;
	emitter: u.MyEmitter = new u.MyEmitter();

	constructor(scene: Scene) {
		const theme: ui.SidebarTheme = {
			text_styles: {
				header: { fontSize: 32 },
				section_label: { fontSize: 24 },
				element_label: { fontSize: 18 }
			},
			colors: {
				bg: 0x691883,
				section: 0xb148d2,
				primary: 0xfbeeff,
				secondary: 0xe79aff
			}
		}

		const spec = settingsSidebarSpec();

		this.sidebar = new ui.Sidebar(scene, theme, "Settings", sidebar_width, g.DEPTHS.settings_sidebar, 
			g.DEPTHS.settings_elements, spec);
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

	getSettings(): u.t.GameplaySettings {
		const keys: u.t.RemapLeaves<u.t.GameplaySettings, 
				[keyof SettingsSpecType, u.t.Layer2Keys<SettingsSpecType>]> = 
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