import { Chart, Song } from "../gameobjects/Song"
import { GameplaySettings, Judgment } from "../gameobjects/types"

export type ResultsData = { song: Song, chart: Chart, score: number, judgments: Judgment[] };
export type GameplayData = { song: Song, chart_index: number, settings: GameplaySettings };