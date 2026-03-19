import { GameObjects } from "phaser";

// Automatically generate the type definition for a UI theme
const styles = ["header", "section_label", "element_label", "value"] as const;
export type UITextStyle = typeof styles[number];
const colors = ["bg", "section", "primary", "secondary"] as const;
export type UIColor = typeof colors[number];
export type UITheme = {
	text_styles: {
		[Name in UITextStyle ]: Partial<GameObjects.TextStyle>
	},
	colors: {
		[Name in UIColor ]: number
	}
}