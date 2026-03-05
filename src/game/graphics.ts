import * as c from "./config"
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

// Charting
export const INFO_TEXT_Y = 200
export const CHARTING_SCREEN_BG_COLOR = 0xff00ff

// Text styles
export const NOTE_STYLE: Partial<Phaser.GameObjects.TextStyle> = {
    fontFamily: 'note_font', 
    fontSize: 52,
    color: '#ffffff',
    strokeThickness: 2,
    align: 'center'
}

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

export const SCORE_STYLE: Partial<Phaser.GameObjects.TextStyle> = {
    fontFamily: 'note_font', 
    fontSize: 48,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4,
    align: 'center'
}

export const JUDGMENT_STYLE: Partial<Phaser.GameObjects.TextStyle> = {
    fontFamily: 'note_font', 
    fontSize: 48,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4,
    align: 'center'
}

export const NORMAL_JUDGMENT_PALETTE: Record<string, string> = {
    "EXCELLENT": '#00ffff',
    'GREAT': '#00ff00',
    'OK': '#ffff00',
    'MISS': '#ff0000'
}

// Graphics objects
export class Circle extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, fillColor: number, alpha: number = 1) {
    super(scene, x, y, radius, 0, 360, false, fillColor, alpha);
  }
}