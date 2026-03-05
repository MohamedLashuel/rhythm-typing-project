import { Scene, GameObjects } from "phaser";
import { Note } from "./Note";
import { Chart } from "./Song";
import * as u from '../utils';
import * as c from '../config';
import * as g from '../graphics';

export type Entity = Note;
export type UpdateDirection = "forward" | "backward" | "expand" | "contract";
/*
Gameplay and charting renderers use different data structures to store entities.
Also, they both only process and render a few entities at a time rather than all entities at once.
We use an abstract class and implement these features differently in both.
The second generic parameter is the index used to access the data structure
*/
export abstract class NoteFieldRenderer<EntityStructType, EntityIndex = keyof EntityStructType>
		extends GameObjects.Container {
	entity_container: GameObjects.Container;
	track_container: TrackContainer;
	readonly entities: EntityStructType;
	playback_time: number = 0;
	scroll_position: number = 0;
	current_scroll_mod: number = 1;
	base_scroll_speed: number = 600;
	readonly chart: Chart;
	active_range: u.t.Range<EntityIndex>;

	// -----------------------------------------------
	// INITIALIZATION
	// -----------------------------------------------

	constructor(scene: Scene, chart: Chart, entities: EntityStructType, pt: u.t.Point){
		super(scene, pt.x, pt.y);

		this.chart = chart;
		this.entities = entities;
		this.active_range = this.initialActiveRange();

		this.entity_container = this.initialEntityContainer(scene, entities);
		this.track_container = new TrackContainer(scene);
		this.add( [ this.entity_container, this.track_container ] );
		this.sendToBack(this.track_container);
	}

	abstract initialActiveRange(): u.t.Range<EntityIndex>

	abstract entitiesToArray(entities: EntityStructType): Entity[];

	initialEntityContainer(scene: Scene, entities: EntityStructType): GameObjects.Container {
		return new GameObjects.Container(scene, g.RECEPTOR_X, 0, this.entitiesToArray(entities));
	}

	// -----------------------------------------------
	// MAIN FUNCTIONALITY
	// -----------------------------------------------

	scrollToTime(time: number){
		const dir = time > this.playback_time ? "forward" : "backward";
		this.updateScroll(time);
		this.updateWhichEntitiesActive(dir);
		this.moveActiveEntities();
		this.playback_time = time;
	}

	// Update both scroll position and scroll speed
	updateScroll(time: number): void {
		const new_scroll = this.chart.mostRecentScrollEntryFrom(time);
		this.current_scroll_mod = new_scroll[1].mult
		this.scroll_position = this.chart.scrollPositionUsingScrollEntry(time, new_scroll);
	}

	moveActiveEntities(): void {
		this.active_entities.forEach(n => 
			n.x = (n.timing.scroll_pos - this.scroll_position) * this.current_scroll_speed);
	}

	setBaseScrollSpeed(speed: number): void {
		this.base_scroll_speed = speed;
		this.updateWhichEntitiesActive("forward");
		this.updateWhichEntitiesActive("backward");
		this.moveActiveEntities();
	}

	// -----------------------------------------------
	// HELPERS
	// -----------------------------------------------

	get current_scroll_speed(): number {
		return this.base_scroll_speed * this.current_scroll_mod;
	}

	// The scroll position of the start of the track where entities appear from
	// Derived by solving for scroll position in the formula for entity x 
	get track_start_pos(): number {
		return g.WIDTH / this.current_scroll_speed + this.scroll_position;
	}

	get track_end_pos(): number {
		return this.x / this.current_scroll_speed + this.scroll_position;
	}

	// Correctly returns negative time if the entity is past pos
	timeUntilEntityReachesPos(entity: Entity, pos: number, count_from_end: boolean): number {
		const entity_pos = count_from_end ? entity.end_pos : entity.timing.scroll_pos;
		return (entity_pos - pos)/this.current_scroll_mod;
	}
	
	willEntityAppearSoon(entity: Entity){
		return this.timeUntilEntityReachesPos(entity, this.track_start_pos, false) < c.EVENT_PRELOAD_TIME;
	}

	isEntityNotExpiredYet(entity: Entity){
		return this.timeUntilEntityReachesPos(entity, this.track_end_pos, true) >= -c.EVENT_EXPIRY_TIME;
	}

	// -----------------------------------------------
	// MANAGING EVENT ACTIVITY
	// -----------------------------------------------

	abstract get active_entities(): Entity[]

	updateWhichEntitiesActive(dir: "forward" | "backward" | "expand" | "contract"): void {
		const data: Record<typeof dir, u.t.Range<["forward" | "backward", "activate" | "deactivate"]>> = {
			forward: { start: ["forward", "deactivate"], end: ["forward", "activate"]},
			backward: { start: ["backward", "activate"], end: ["backward", "deactivate"]},
			expand: { start: ["backward", "activate"], end: ["forward", "activate"]},
			contract: { start: ["forward", "deactivate"], end: ["backward", "deactivate"]},
		}
		const entry = data[dir];
		this.setEntityActivity(this.active_range.start, "start", entry.start[0], entry.start[1]);
		this.setEntityActivity(this.active_range.end, "end", entry.end[0], entry.end[1]);
	}

	setEntityActivity(from_index: EntityIndex, range_side: "start" | "end", dir: "forward" | "backward",
		toggle: "activate" | "deactivate"): void {
		const fun1 = (range_side === "end") ? 
			(n: Note) => this.willEntityAppearSoon(n) :
			(n: Note) => this.isEntityNotExpiredYet(n);
		const fun2 = (toggle === "activate") ? (n: Note) => fun1(n) : (n: Note) => !fun1(n);

		const [to_toggle, last_ind] = this.findEntitiesFromIndexWhile(from_index, dir, fun2);

		this.active_range[range_side] = last_ind;

		const fun = toggle === "activate" ? (e: Entity) => e.activate() : (e: Entity) => e.deactivate();
		to_toggle.map(fun);
	}

	// Returns entities and the last index to set the active range
	abstract findEntitiesFromIndexWhile(index: EntityIndex, dir: "forward" | "backward"
		, pred: (e: Entity) => boolean): [Entity[], EntityIndex]

	// In the case of making a big jump, it's faster to start the active range from scratch
	resetWhichEntitiesActive(from_ind: EntityIndex): void {
		this.active_entities.map(e => e.deactivate());
		this.active_range = { start: from_ind, end: from_ind };
		this.updateWhichEntitiesActive("expand");
	}
}

class TrackContainer extends GameObjects.Container {
	track: GameObjects.Rectangle;
	receptor: g.Circle;
	center_line: GameObjects.Rectangle;

	constructor(scene: Scene){
		super(scene);

		this.track = new GameObjects.Rectangle(scene, 0, 0, g.WIDTH, g.TRACK_HEIGHT, 0xffffff, 0.2)
        	.setOrigin(0, 0.5);
	    this.receptor = new g.Circle(scene, g.RECEPTOR_X, 0, 52, 0xffffff, 0.3);
	    this.center_line = new GameObjects.Rectangle(scene, g.RECEPTOR_X, 0, 2, 52 * 2, 0x000000, 1);

	    this.add( [ this.track, this.receptor, this.center_line ]);
	}
}