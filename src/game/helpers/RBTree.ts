import { OrderedMap, OrderedMapIterator } from "js-sdsl";
import * as u from './utils';
import { ComparatorIfNecessary, UnionKeys } from "./types";

type KVReviver<K, V> = { key?: (k: any) => K, val?: (v: any) => V };
type SafeIterator<K, V> = OrderedMapIterator<K, V> & { __is_accessible: void }

// Wrapper around OrderedMap, which is implemented as a red-black tree
export class RBTree<K, V> extends OrderedMap<K, V> {
	constructor(public compare: ComparatorIfNecessary<K>, entries?: [K, V][]) {
		super(entries, compare);
	}

	get(key: K): V | undefined { return this.getElementByKey(key) }
	set(key: K, value: V): void { this.setElement(key, value) }
	delete(key: K): void { this.eraseElementByKey(key) }
	exists(key: K): boolean { return this.get(key) !== undefined }

	_mapKeyEntries<R>(fun: (k: K, v: V) => R): [R, V][] {
		return [...this].map(([k, v]) => [fun(k, v), v] as [R, V]);
	}

	_mapValueEntries<R>(fun: (v: V, k: K) => R): [K, R][] {
		return [...this].map(([k, v]) => [k, fun(v, k)] as [K, R]);
	}

	mapKeys<R>(fun: (k: K, v: V) => R, compare: ComparatorIfNecessary<R>): RBTree<R, V> {
		return new RBTree(compare, this._mapKeyEntries(fun));
	}

	mapValues<R>(fun: (v: V, k: K) => R): RBTree<K, R> {
		return new RBTree(this.compare, this._mapValueEntries(fun));
	}

	toJSON(): [K, V][] {
		return [...this];
	}

	static _entriesFromJSON<K, V>(entries: [any, any][], revivers: KVReviver<K, V>): [K, V][]{
		const key_reviver = revivers.key ?? ((k: any): K => k as K);
		const val_reviver = revivers.val ?? ((v: any): V => v as V);
		return entries.map( ([k, v]) => [key_reviver(k), val_reviver(v)] );
	}

	valuesArray(): V[] {
		return [...this].map( ([_k, v]) => v);
	}

	floorIterator(key: K): RBIterator<K, V> | undefined {
		const itr = this.upperBound(key);
		// Empty tree case
		if(!iteratorIsSafe(itr)) return undefined;

		return new RBIterator(itr).prev();
	}

	// Returns the entry for the key if it exists, otherwise the entry of the closest lower key
	floor(key: K): [K, V] | undefined {
		return this.floorIterator(key)?.entry;
	} 

	startItr(): RBIterator<K, V> | undefined {
		const itr = this.begin();
		return iteratorIsSafe(itr) ? new RBIterator(itr) : undefined;
	}
}

function iteratorIsSafe<K, V>(itr: OrderedMapIterator<K, V>): itr is SafeIterator<K, V> {
	return itr.isAccessible();
}

// OrderedMapIterator errors quite easily. This class is intended to be an immutable and safe wrapper
// Should only ever error if the pointed-to node was deleted
export class RBIterator<K, V> {
	itr: SafeIterator<K, V>

	constructor(itr: SafeIterator<K, V>){
		this.itr = itr;
	}

	get key(): K {
		return this.itr.pointer[0];
	}

	get value(): V {
		return this.itr.pointer[1];
	}

	get entry(): [K, V] {
		return this.itr.pointer;
	}

	// On OrderedMapIterator, .next will return an inaccessible iterator once it goes past the end
	// .pre will error if you try going before the beginning
	prev(): RBIterator<K, V> | undefined {
		return u.safely(() => {
			const new_itr = this.itr.copy().pre()
			return new RBIterator<K, V>(new_itr as SafeIterator<K, V>)
		});
	}

	next(): RBIterator<K, V> | undefined {
		const new_itr = this.itr.copy().next()
		return iteratorIsSafe(new_itr) ? new RBIterator<K, V>(new_itr) : undefined;
	}

	toString(): string {
		return this.entry.toString();
	}
}

// Binary tree specialized for storing objects with solely optional properties
export class GroupTree<K, V extends object> extends RBTree<K, Partial<V>> {
	getProp<P extends keyof V>(key: K, prop: P): V[P] | undefined {
		return this.getElementByKey(key)?.[prop];
	}

	setProp<P extends keyof V>(key: K, prop: P, val: V[P]): void {
		const result = this.getElementByKey(key);
		if(result === undefined){
			const obj: Partial<V> = {};
			obj[prop] = val;
			this.setElement(key, obj);
		} else {
			result[prop] = val;
		}
	}

	// Returns true if the whole object got deleted
	deleteProp(key: K, prop: keyof V): void {
		const result: Partial<V> = this.getElementByKey(key) ?? {};
		delete result[prop];
		if(u.isObjectEmpty(result)) this.eraseElementByKey(key);
	}

	existsProp(key: K, prop: keyof V): boolean {
		return this.getProp(key, prop) !== undefined;
	}

	mapKeys<R>(fun: (k: K, v: Partial<V>) => R, compare: ComparatorIfNecessary<R>): GroupTree<R, V> {
		return new GroupTree(compare, this._mapKeyEntries(fun));
	}	

	mapProps<R>(fun: (v: V[keyof V], k: K) => R): GroupTree<K, { [P in UnionKeys<Partial<V>>]: R }> {
		const new_entries = this._mapValueEntries( 
			(group, key) => u.mapObject(group, val => {
				if(val === undefined) return undefined; // eslint-disable-line
				return fun(val, key)
			}))
		return new GroupTree(this.compare, new_entries);
	}

	mapGroups<R extends object>(fun: (v: Partial<V>, k: K) => Partial<R>): GroupTree<K, R> {
		return new GroupTree(this.compare, this._mapValueEntries(fun));
	}

	forEachProp(fun: (v: V[keyof V], k: K, prop: keyof V) => void): void {
		this.forEach(([k, group]) => u.mapObject(group, (val, prop) => {
			if(val === undefined) return; // eslint-disable-line
			fun(val, k, prop)
		}));
	}

	allProps(): V[keyof V][] {
		return [...this].flatMap( ([_k, group]) => Object.values(group));
	}
}

export function RBTreeFromJSON<K, V>(compare: ComparatorIfNecessary<K>, entries: [any, any][], 
		revivers: KVReviver<K, V> = { key: undefined, val: undefined } ): RBTree<K, V> {
	return new RBTree(compare, RBTree._entriesFromJSON(entries, revivers));
}

export function groupTreeFromJSON<K, V extends object>(compare: ComparatorIfNecessary<K>, entries: [any, any][], 
		revivers: KVReviver<K, V> = { key: undefined, val: undefined } ): GroupTree<K, V> {
	return new GroupTree(compare, GroupTree._entriesFromJSON(entries, revivers));
}