import BTree from "sorted-btree";
import { ComparatorIfNecessary, UnionKeys } from "./types";
import * as u from './utils';

// Wrapper for the BTree library with some fixes
export class BinaryTree<K, V> extends BTree<K, V> {
	compare: ComparatorIfNecessary<K>;

	// Require a comparator if the key type needs one (not string/number)
	constructor(compare: ComparatorIfNecessary<K>, entries?: [K, V][]){
		super(entries, compare);
		this.compare = compare;
	}

	// I think BTree's get is incorrectly typed - if a default value is supplied, returning undefined should
	// be impossible. This retyping fixes it.
	get(key: K): V | undefined
	get(key: K, default_val: V): V
	get(key: K, default_val?: V): Partial<V> | undefined {
		return super.get(key, default_val)
	}
}

// Binary tree specialized for storing objects with solely optional properties
export class GroupTree<K, V extends {}> extends BinaryTree<K, Partial<V>> {
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
		if(u.isObjectEmpty(result)) this.delete(key);
	}

	existsProp<P extends keyof V>(key: K, prop: P): boolean {
		return this.getProp(key, prop) !== undefined;
	}

	map<R extends {}>(fun: (v: Partial<V>, k: K, i: number) => Partial<R>): GroupTree<K, R>{
		const new_entries = this.mapValues(fun).toArray();
		return new GroupTree<K, R>(this.compare, new_entries);
	}

	mapProps<R>(fun: (v: V[keyof V], k: K) => R): GroupTree<K, { [P in UnionKeys<Partial<V>>]: R }> {
		return this.map<{ [P in UnionKeys<Partial<V>>]: R }>( (group, key) => u.mapObject(group, val => {
			if(val === undefined) return undefined;
			return fun(val, key)
		}))
	}

	forEachProp(fun: (v: V[keyof V], k: K) => any): void {
		this.forEachPair( (key, group) => u.mapObject(group, val => {
			if(val === undefined) return;
			fun(val, key)
		}));
	}
}

export function binaryTreeFromJSON<K, V>(compare: ComparatorIfNecessary<K>, entries: [any, any][],
		key_reviver: (k: any) => K = (k => k as K), val_reviver: (v: any) => V = (v => v as V))
		: BinaryTree<K, V> {
	const new_entries = entries.map( ([k, v]: [any, any]) => [key_reviver(k), val_reviver(v)] as [K, V]);
	return new BinaryTree(compare, new_entries);
}

export function groupTreeFromJSON<K, V>(compare: ComparatorIfNecessary<K>, entries: [any, any][],
		key_reviver: (k: any) => K = (k => k as K), 
		val_reviver: (v: any) => Partial<V> = (v => v as V))
		: GroupTree<K, Partial<V>> {
	const new_entries = entries.map( ([k, v]: [any, any]) => {
		return [key_reviver(k), val_reviver(v)] as [K, Partial<V>]
	});
	return new GroupTree(compare, new_entries);
}