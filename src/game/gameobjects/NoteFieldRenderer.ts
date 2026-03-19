import { Scene, GameObjects } from "phaser";
import { Entity } from "./Entities/Entity";
import { Chart } from "./Song";
import * as c from '../config';
import * as g from '../graphics';
import { GameplaySettings } from "./types";
import { Point, Range } from "../helpers/types";

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
	entities: EntityStructType;
	playback_time: number = 0;
	scroll_position: number = 0;
	current_scroll_mod: number = 1;
	settings: GameplaySettings["render"];
	chart: Chart;
	active_range: Range<EntityIndex>;

	// -----------------------------------------------
	// INITIALIZATION
	// -----------------------------------------------

	constructor(scene: Scene, settings: GameplaySettings["render"],
			chart: Chart, entities: EntityStructType, pt: Point){
		super(scene, pt.x, pt.y);

		this.settings = settings;

		this.entity_container = new GameObjects.Container(scene, g.RECEPTOR_X, 0);
		
		this.track_container = new TrackContainer(scene);
		this.add( [ this.entity_container, this.track_container ] );
		this.sendToBack(this.track_container);

		this.loadChart(chart, entities);
	}

	loadChart(chart: Chart, chart_entities: EntityStructType) {
		this.chart = chart;
		this.entities = chart_entities;

		this.entity_container.removeAll(true);
		this.entitiesToArray(chart_entities).forEach(e => this.addEntity(e));

		this.active_range = this.initialActiveRange();
		this.scrollToTime(0);

	}

	abstract initialActiveRange(): Range<EntityIndex>

	abstract entitiesToArray(entities: EntityStructType): Entity[];

	// -----------------------------------------------
	// MAIN FUNCTIONALITY
	// -----------------------------------------------

	addEntity(entity: Entity) {
		entity.draw(this.scene, this.settings);
		this.entity_container.add(entity.graphic);
	}

	redraw(entity: Entity) {
		this.entity_container.remove(entity.graphic);
		this.addEntity(entity);
	}

	scrollToTime(time: number){
		const dir = time >= this.playback_time ? "forward" : "backward";
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
		this.active_entities.forEach(e => this.moveEntity(e));
	}

	moveEntity(e: Entity): void { 
		e.graphic.x = (e.timing.scroll_pos - this.scroll_position) * this.settings.base_scroll_speed;
	}

	setBaseScrollSpeed(speed: number): void {
		this.settings.base_scroll_speed = speed;
		this.updateWhichEntitiesActive("forward");
		this.updateWhichEntitiesActive("backward");
		this.moveActiveEntities();
	}

	// -----------------------------------------------
	// HELPERS
	// -----------------------------------------------

	// The scroll position of the start of the track where entities appear from
	// Derived by solving for scroll position in the formula for entity x 
	get track_start_pos(): number {
		return g.WIDTH / this.settings.base_scroll_speed + this.scroll_position;
	}

	get track_end_pos(): number {
		return this.x / this.settings.base_scroll_speed + this.scroll_position;
	}

	// Correctly returns negative time if the entity is past pos
	timeUntilEntityReachesPos(entity: Entity, pos: number, count_from_end: boolean): number {
		const entity_pos = count_from_end ? entity.end_pos : entity.timing.scroll_pos;
		return entity_pos - pos;
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
		const data: Record<typeof dir, Range<["forward" | "backward", "activate" | "deactivate"]>> = {
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
			(e: Entity) => this.willEntityAppearSoon(e) :
			(e: Entity) => this.isEntityNotExpiredYet(e);
		const fun2 = (toggle === "activate") ? (e: Entity) => fun1(e) : (e: Entity) => !fun1(e);

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
		this.moveActiveEntities();
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