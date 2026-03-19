export type Character = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" |
"n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" | 
"A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" |
"N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"

export type Point = {
	x: number,
	y: number
}

export type Range<T> = {
	start: T,
	end: T
}

export type NonEmptyArray<T> = [T, ...T[]];

export type Comparator<T> = (a: T, b: T) => number;
export type ComparatorIfNecessary<T> = T extends string | number ? Comparator<T> | undefined : Comparator<T>

// Specifically excludes class properties which are functions, only includes real methods
type ClassMethod = (...args: any[]) => any;

export type ClassProperties<C> = keyof {
    [K in keyof C as C[K] extends ClassMethod ? never : K]: any
}

export type JSONfied<C> = Record<ClassProperties<C>, any>

export type RemapLeaves<Base, To> = {
	[Property in keyof Base]: Base[Property] extends Record<string, unknown> 
		? RemapLeaves<Base[Property], To> 
		: To
};

export type UnionKeys<T> = T extends T ? keyof T : never;
export type UnionValues<T> = T extends T ? T[keyof T] : never;

export type Layer2Keys<T> = UnionKeys<T[keyof T]>;