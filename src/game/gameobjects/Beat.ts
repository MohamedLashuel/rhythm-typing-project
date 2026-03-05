import * as u from '../utils'
import * as c from '../config'

export class Beat {
	constructor(
		public measure: number,
		public index: number,
		public division: c.ValidDivision
	) {}

	// Make a beat while checking and fixing if index exceeds division or is < 0
	static makeBeatHandleOverflow(measure: number, index: number, division: c.ValidDivision){
		const new_idx = (index < 0) ? division + index % division : index % division;
		const measure_delta = Math.floor(index / division);
		return new Beat(measure + measure_delta, new_idx, division);
	}

	static ZERO_BEAT(): Beat {
		return new Beat(0, 0, 4);
	}

	toDecimal(): number {
		return 4 * (this.measure + (this.index / this.division));
	}

	get simplified_division(): c.ValidDivision {
		if(this.index === 0) return 4;
		const simplified = this.division / u.gcd(this.index, this.division);
		if(simplified === 2) return 4;
		return c.isValidDivision(simplified) ? simplified : this.division;
	}

	snapNextDivision(division: c.ValidDivision, dir: "forward" | "backward"): Beat {
		const ratio = this.division / division;
		const snap_fun = (dir === "forward") ? Math.ceil : Math.floor
		return Beat.makeBeatHandleOverflow(this.measure, snap_fun(this.index / ratio), division);
	}

	// If aligned with the division, move by that division. Otherwise, snap to that division
	addOrSnapToDivision(division: c.ValidDivision, dir: "forward" | "backward"): Beat {
		// E.g. if this beat is in 4ths, we are already aligned with 8ths
		if(!(division % this.division)) {
			// Add case
			// If the divisions are different, convert to the given division
			const ratio = division / this.division;
			const new_idx = this.index * ratio + (dir === "forward" ? 1 : -1);
			return Beat.makeBeatHandleOverflow(this.measure, new_idx, division);
		}
		else return this.snapNextDivision(division, dir);
	}

	static compare(a: Beat, b: Beat): number {
		return a.toDecimal() - b.toDecimal();
	}

	static beatsToSeconds = (beats: number, bpm: number) => beats / bpm * 60

	toString(): string {
		return JSON.stringify(this)
	}

	// When a beat is serialized to JSON, it keeps its properties but loses its class
	static fromJSON(obj: any): Beat {
		return new Beat(obj.measure, obj.index, obj.division);
	}
}