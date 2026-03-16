import * as ui from '../../ui';
import * as g from '../../graphics';
//import * as u from '../../utils';
import { Scene } from "phaser";

const sidebar_width = g.SETTINGS_WIDTH_PCT;

// We define this outside of the class so we can use its type for the sidebar property
function settingsSidebarSpec(scene: Scene) {
	return {
		Rendering: {
			"Scroll Speed": ui.numberSlider(scene, sidebar_width - 5, 400, 0, 600, 5)
		},
		Sound: {
			"Music Rate": ui.numberSlider(scene, sidebar_width - 5, 1, 0.1, 4, 0.01)
		}
	} as const satisfies ui.SidebarSpec;
} 

export class SettingsTab {
	sidebar: ui.Sidebar<ReturnType<typeof settingsSidebarSpec>>;

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

		const spec = settingsSidebarSpec(scene);

		this.sidebar = new ui.Sidebar(scene, theme, "Settings", sidebar_width, g.DEPTHS.settings_sidebar, 
			g.DEPTHS.settings_elements, spec);
	}

	/*
	getSettings(): u.t.GameplaySettings {
		const keys: u.t.RemapLeaves<u.t.GameplaySettings, [string, string]> = {
			render: {
				base_scroll_speed: ["Rendering", "Scroll Speed"]
			},
			sound: {
				music_rate: ["Sound", "Music Rate"]
			}
		}
	}
	*/
}