import { GameplaySettings, Judgment } from './gameobjects/types'

// Contains global gameplay settings

export const MISS_JUDGMENT: Judgment = { window: undefined, name: "MISS", points: -10}
export const JUDGMENTS: Judgment[] = [
	{ window: 100 / 1000, name: "EXCELLENT", points: 100 },
	{ window: 400 / 1000, name: "GREAT", points: 80 },
	{ window: 1000 / 1000, name: "OK", points: 50},
	MISS_JUDGMENT
]
const window_sizes = JUDGMENTS.map(j => j.window ?? 0)
export const HIT_BUFFER = Math.max(...window_sizes)
export const HOLD_BUFFER = 0.25;

export const ENTITY_LOAD_BUFFER = 2;
export const DEFAULT_BPM = 120;

export const VALID_DIVISIONS = [4, 8, 12, 16, 20, 24, 32, 48, 64, 92, 128, 192, 256] as const;
export type ValidDivision = typeof VALID_DIVISIONS[number];
export function isValidDivision(x: number): x is ValidDivision {
	return VALID_DIVISIONS.includes(x as ValidDivision);
}

export const DEFAULT_SETTINGS: GameplaySettings = {
	render: {
		base_scroll_speed: 600
	},
	sound: {
		music_rate: 1,
		music_volume: 0.5,
		hitsound_volume: 0.5
	}
}