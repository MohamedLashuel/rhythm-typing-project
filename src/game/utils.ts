import BTree from "sorted-btree";
import * as t from "./types"
export * as t from "./types"

export function isChar(str: string): str is t.Character { 
	return /^[A-z]$/.test(str);
}

export function isNum(str: string): boolean {
	return /^[0-9]+$/.test(str);
}

export function arrayWithout<T>(ary: T[], els: T[]): T[] {
	return ary.filter(v => !els.includes(v));
}

export function objectWithout<T extends Record<string, any>, K extends string>(obj: T, props: K[])
: Omit<typeof obj, K> {
  obj = { ...obj };
  props.forEach(prop => delete obj[prop]);
  return obj;
}

export function mapObject<K extends PropertyKey, V, R>(obj: Partial<Record<K, V>>, fun: (v: V, k: K) => R )
: Record<K, R>{
	const entries = Object.entries(obj) as [K, V][];
	const new_entries = entries.map( ([k, v]) => [k, fun(v, k)]);
	return Object.fromEntries(new_entries);
}

export function isObjectEmpty(obj: any){
	for (const key in obj) if (Object.hasOwn(obj, key)) return false;
	return true;
}

export function flatProperties<T>(ary: { [s: string]: T}[]) {
	return ary.map(o => Object.values(o)).flat();
}

// Take elements from an array while a predicate function returns true
export function takeWhile<T>(ary: T[], pred: (t: T) => boolean): T[] {
	const end_index = ary.findIndex(t => !pred(t));
	if(end_index === -1) return ary;
	return ary.slice(0, end_index);
}

// Take elements from an array starting from where the first function returns true while the second is true
export function takeFromWhile<T>(ary: T[], f1: (t: T) => boolean, f2: (t: T) => boolean): T[] {
	const start_ind = ary.findIndex(t => f1(t));
	if(start_ind === -1) return [];
	return takeWhile(ary.slice(start_ind), f2);
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
	return ary.includes(obj) ? arrayWithout(ary, [ obj ] ) : ary.concat( [ obj ] );
}

export function clamp(x: number, min: number, max: number){
	return Math.min(Math.max(x, min), max);
}

export function clampedIndex<T>(i: number, ary: readonly T[]): T {
	return ary[clamp(i, 0, ary.length - 1)] as T
}

export function range(first: number, second?: number, step: number = 1){
	const start = (second === undefined) ? 0 : first;
	const end = (second === undefined) ? first : second;

	const ary = [];
	for(let i = start; i < end; i += step){
		ary.push(i);
	}

	return ary;
}

// Emits Phaser events with automatic type checking
export class MyEmitter {
	private event_emitter: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();

	emit<E extends t.Event>(code: E, args: t.EventTable[E]): void {
		this.event_emitter.emit(code, ...args);
	}

	addListeners(...listeners: t.Listener[]): void {
		listeners.forEach( (l) => this.event_emitter.on(l.event, l.fun, l.context));
	}
}

// Binary tree specialized for storing objects with solely optional properties
export class GroupTree<K, V extends {}> extends BTree<K, Partial<V>> {
	compare: t.ComparatorIfNecessary<K>;
	// Giving a function to compare is mandatory only if not keyed by string/number
	constructor(compare: t.ComparatorIfNecessary<K>, entries?: [K, Partial<V>][]){
		super(entries, compare);
		this.compare = compare;
	}

	// I think BTree's get is incorrectly typed - if a default value is supplied, returning undefined should
	// be impossible. This retyping fixes it.
	get(key: K): Partial<V> | undefined
	get(key: K, default_val: Partial<V>): Partial<V>
	get(key: K, default_val?: Partial<V>): Partial<V> | undefined {
		return super.get(key, default_val)
	}

	getProp<P extends keyof V>(key: K, prop: P): V[P] | undefined {
		return this.get(key)?.[prop];
	}

	setProp<P extends keyof V>(key: K, prop: P, val: V[P]){
		const result = this.get(key);
		if(result === undefined){
			const obj: Partial<V> = {};
			obj[prop] = val;
			this.set(key, obj);
		} else {
			result[prop] = val;
		}
	}

	deleteProp<P extends keyof V>(key: K, prop: P){
		const result: Partial<V> = this.get(key) ?? {};
		delete result[prop];
		if(isObjectEmpty(result)) this.delete(key);
	}

	existsProp<P extends keyof V>(key: K, prop: P): boolean {
		return this.getProp(key, prop) !== undefined;
	}

	map<R extends {}>(fun: (v: Partial<V>, k: K, i: number) => Partial<R>): GroupTree<K, R>{
		const new_entries = this.mapValues(fun).toArray();
		return new GroupTree<K, R>(this.compare, new_entries);
	}

	mapProps<R extends {}>(fun: (v: V[keyof V], k: K) => R): GroupTree<K, Record<keyof V, R>> {
		return this.map( (group, key) => mapObject(group, val => fun(val, key)));
	}

	forEachProp(fun: (v: V[keyof V], k: K) => any): void {
		this.forEachPair( (key, group) => mapObject(group, val => fun(val, key)));
	}
}

export const DEFAULT_SETTINGS: t.GameplaySettings = {
	render: {
		base_scroll_speed: 600
	},
	sound: {
		music_rate: 1
	}
}