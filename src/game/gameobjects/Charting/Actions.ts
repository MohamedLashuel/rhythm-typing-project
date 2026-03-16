import { ChartingNoteField } from "./NoteField";
import * as u from '../../utils';
import { Beat } from "../Beat";
import { BpmMarker } from "../Entities/BpmMarker";

// This class stores functions to perform actions together with functions that undo them,
// making it easy to implement undo and redo in the charting editor
export type ChartingAction<E, U = E> = {
	// Execute returns the data that undo needs, because it might have to be calculated in execution
	execute: (nf: ChartingNoteField, data: E) => U;
	undo: (nf: ChartingNoteField, data: U) => void;
}

export type ChartingActionWithData<E, U = E> = {
	action: ChartingAction<E, U>,
	undo_data: U,
	redo_data: E
}

export type ReversibleChartingAction<E, U = E> = ChartingAction<E, U> 
	& {undo: (nf: ChartingNoteField, data: U) => E}

function reverseAction<E, U>(action: ReversibleChartingAction<E, U>)
		: ReversibleChartingAction<U, E> {
	return {
		execute: action.undo,
		undo: action.execute
	};
}

export const placeOrRemoveChar: ChartingAction<{ beat: Beat, char: u.t.Character }> = {
	execute: (nf, dt) => {
		nf.logic.placeOrRemoveChar(dt.beat, dt.char)
		return dt;
	},
	undo: (nf, dt) => nf.logic.placeOrRemoveChar(dt.beat, dt.char)
}

export const placeBpmChange: ReversibleChartingAction<{ beat: Beat, bpm: number},
 { beat: Beat, marker: BpmMarker }> = {
	execute: (nf, dt) => {
		const marker = nf.logic.placeBpmChange(dt.beat, dt.bpm);
		return { beat: dt.beat, marker: marker };
	},
	undo: (nf, dt) => {
		const old_bpm = nf.logic.removeBpmChange(dt.beat, dt.marker);
		return { beat: dt.beat, bpm: old_bpm };
	}
}

export const removeBpmChange = reverseAction(placeBpmChange);