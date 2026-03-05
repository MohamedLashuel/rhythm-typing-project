import * as t from "./types"
export * as t from "./types"

export function isChar(str: string): str is t.Character { 
	return /^[A-z]$/.test(str);
}

// Return an array without any of the specified elements
export function without<T>(ary: T[], els: T[]): T[] {
	return ary.filter(v => !els.includes(v));
}

// Take elements from an array while a predicate function returns true
export function takeWhile<T>(ary: T[], pred: (t: T) => boolean): T[]{
	const end_index = ary.findIndex(t => !pred(t));
	if(end_index === -1) return ary;
	return ary.slice(0, end_index);
}

// Increase an array index until pred returns false
export function marchIndexForward<T>(ary: T[], pred: (t: T) => boolean, start_ind: integer = 0): integer {
	const result = ary.slice(start_ind).findIndex(t => !pred(t));
	if(result === -1) return ary.length;
	return start_ind + result;
}

// Iterate an iterator while a predicate function returns true.
// Return the true elements and the entry where the predicate failed
export function iterateWhile<T>(itr: IterableIterator<T>, pred: (t: T) => boolean):
	[T[], T | undefined] {
		const true_els: T[] = [];
		let failing: T | undefined;
		while(true){
			let next = itr.next();
			if(next.done === true){
				failing = undefined;
				break;
			}
			if(!pred(next.value)){
				failing = next.value;
				break;
			}
			true_els.push(next.value);
		}
		return [true_els, failing];
	}

function divisors(x: integer): integer[] {
	const divisors: integer[] = [];
	const limit = Math.max(4, Math.sqrt(x))
	for(var i = 2; i <= limit; i++){
		if( !(x % i) ){
			divisors.push(i);
			x = x / i;
			i--;
		}
	}
	return divisors;
}

// Approach: Find all divisors of the lower of the two, filter if they divide the other,
// then multiply them all
export function gcd(x: integer, y: integer): integer {
	const lower = Math.min(x, y);
	const higher = Math.max(x, y);

	return divisors(lower).filter(d => !(higher % d) ).reduce( (x, y) => x * y, 1);
}
// Determines if a note is a 4th, 8th, 16th etc. note
// Ex: the second note out of 16 is an 8th note
export function noteDivision(i: integer, len: integer){
	return len / gcd(i, len);
}

// Split a string into individual characters, but keep segments inside parenthesis
export function splitCharsExceptParensAndNumbers(str: string){
	return str.split(/(?<![0-9])a{0}(?![^(]*\))/);
}

// Used in cases where TypeScript thinks a value could be undefined, but we're reasonably sure it's not
// Checks and logs an error if it is undefined, then allows us to use the value as if it's not
export function shouldntBeUndefined<T>(value: T | undefined, msg: string): asserts value is T {
	if(value === undefined) console.error(msg);
}

export function map2<T, V, R>(a1: T[], a2: V[], fun: (arg0: T, arg1: V) => R): R[] {
	if(a1.length !== a2.length) console.error("map2: Arrays have different length");
	const limit = Math.min(a1.length, a2.length)
	const results = [];
	for(var i=0; i<limit; i++){
		results.push(fun(a1[i] as T, a2[i] as V));
	}
	return results;
}

export function arraysHaveSameValues(a1: any[], a2: any[]): boolean {
	if(a1.length !== a2.length) return false;
	return map2(a1.toSorted(), a2.toSorted(), (x, y) => x === y).every(v => v);
}

export function toggleInclusion<T>(ary: T[], obj: T): T[] {
	return ary.includes(obj) ? without(ary, [ obj ] ) : ary.concat( [ obj ] );
}

export function clamp(x: number, min: number, max: number){
	return Math.min(Math.max(x, min), max);
}

export function clampedIndex<T>(i: number, ary: readonly T[]): T {
	return ary[clamp(i, 0, ary.length)] as T
}