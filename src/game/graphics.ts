import TextAreaInput from "phaser3-rex-plugins/templates/ui/textareainput/TextAreaInput"
import * as c from "./config"
import { Scene } from "phaser"
import { Point } from "./helpers/types";
import { UITheme } from "./ui/types";
// Contains graphics settings, including object positions, and graphic objects

// Game size
export const WIDTH = 1024
export const HEIGHT = 768

// Note field
export const RECEPTOR_X = 64
export const NOTE_FIELD_Y = HEIGHT / 2
export const TRACK_HEIGHT = 192
export const ROW_HEIGHT = TRACK_HEIGHT

// Scoring
export const SCORE_TEXT_PT = { x: WIDTH / 2, y: 128 }
export const JUDGMENT_TEXT_PT = { x: WIDTH / 2, y: NOTE_FIELD_Y + TRACK_HEIGHT }
export const SCORE_TWEEN_SPEED = 400

// Song Select
export const SONG_SELECT_THEME: UITheme = {
    text_styles: {
        header: { fontSize: 32, fontFamily: "note_font" },
        section_label: { fontSize: 24, fontFamily: "note_font" },
        element_label: { fontSize: 18, fontFamily: "note_font" },
        value: { fontSize: 12, fontFamily: "note_font" }
    },
    colors: {
        bg: 0x691883,
        section: 0xb148d2,
        primary: 0xfbeeff,
        secondary: 0xe79aff
    }
}

// Charting
export const INFO_TEXT_Y = 200
export const CHARTING_SCREEN_BG_COLOR = 0x220066

export const DEPTHS = {
    settings_sidebar: 1,
    settings_elements: 2,
    charting_screen: 3
}

// Settings
export const SETTINGS_WIDTH_PCT = 40;

export const SETTINGS_THEME: UITheme = {
    text_styles: {
        header: { fontSize: 32, fontFamily: "note_font" },
        section_label: { fontSize: 24, fontFamily: "note_font" },
        element_label: { fontSize: 18, fontFamily: "note_font" },
        value: { fontSize: 12, fontFamily: "note_font" }
    },
    colors: {
        bg: 0x691883,
        section: 0xb148d2,
        primary: 0xfbeeff,
        secondary: 0xe79aff
    }
}

// Text styles
export const NOTE_STYLE = {
    fontFamily: 'note_font', 
    fontSize: 52,
    color: '#ffffff',
    strokeThickness: 2,
    align: 'center'
} satisfies Partial<Phaser.GameObjects.TextStyle>;

export const BPM_MARKER_STYLE = {
    fontFamily: 'note_font',
    fontSize: 26,
    color: '#ffffff',
    backgroundColor: '#ff0000'
} satisfies Partial<Phaser.GameObjects.TextStyle>;

export const SCORE_STYLE = {
    fontFamily: 'note_font', 
    fontSize: 48,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4,
    align: 'center'
} satisfies Partial<Phaser.GameObjects.TextStyle>;

export const JUDGMENT_STYLE = NOTE_STYLE;

// Entity styles
export const SPEED_ZONE_COLOR = 0xff8000;
export const SLOW_ZONE_COLOR = 0x00ffff;

// Color palettes
export const NORMAL_NOTE_PALETTE: Record<c.ValidDivision, string> = {
    4: '#ff0000',
    8: '#0000ff',
    12: '#ff00ff',
    16: '#00ff00',
    20: '#0080ff',
    24: '#8000ff',
    32: '#ff8000',
    48: '#00ff80',
    64: '#808080',
    92: '#808080',
    128: '#808080',
    192: '#808080',
    256: '#808080'
}

export const NORMAL_JUDGMENT_PALETTE: Record<string, string> = {
    "EXCELLENT": '#00ffff',
    'GREAT': '#00ff00',
    'OK': '#ffff00',
    'MISS': '#ff0000'
}

// Graphics objects
export class Circle extends Phaser.GameObjects.Arc {
  constructor(scene: Scene, x: number, y: number, radius: number, fillColor: number, alpha: number = 1) {
    super(scene, x, y, radius, 0, 360, false, fillColor, alpha);
  }
}

// Move this to UI once we refactor the charting screens
export function chartingScreenTextInput(scene: Scene, pt: Point, header: string) {
    return new TextAreaInput(scene, {
        x: pt.x,
        y: pt.y,
        width: 220,
        height: 100,
        background: scene.rexUI.add.roundRectangle(0, 0, 2, 2, 0, 0x000000),
        header: scene.add.text(0, 0, header)
    }).layout();
}