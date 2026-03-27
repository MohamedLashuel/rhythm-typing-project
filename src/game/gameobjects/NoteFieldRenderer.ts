import { Scene, GameObjects } from "phaser";
import { Entity } from "./Entities/Entity";
import { Chart, EntityMap } from "./Song";
import * as u from '../helpers/utils';
import * as c from '../config';
import * as g from '../graphics';
import { GameplaySettings } from "./types";
import { Point, Range } from "../helpers/types";
import { EntityGroup, UsedEntity } from "./Entities/EntityGroup";
import { GroupTree, RBIterator } from "../helpers/RBTree";

type UpdateDirection = "forward" | "backward" | "expand" | "contract";

// Undefined used if there are no entities to iterate through
type EntityRange = { left: REC_Itr, right: REC_Itr } | undefined

export abstract class NoteFieldRenderer extends GameObjects.Container {
	entity_container: GameObjects.Container;
	track_container: TrackContainer;
	entities: RendererEntityContainer;
	playback_time: number = 0;
	scroll_position: number = 0;
	current_scroll_mod: number = 1;
	settings: GameplaySettings["render"];
	chart: Chart;
	active_range: EntityRange

	// -----------------------------------------------
	// INITIALIZATION
	// -----------------------------------------------

	constructor(scene: Scene, settings: GameplaySettings["render"],
			chart: Chart, entities: EntityMap, pt: Point){
		super(scene, pt.x, pt.y);

		this.settings = settings;

		this.entity_container = new GameObjects.Container(scene, g.RECEPTOR_X, 0);
		
		this.track_container = new TrackContainer(scene);
		this.add( [ this.entity_container, this.track_container ] );
		this.sendToBack(this.track_container);

		this.loadChart(chart, entities);
	}

	loadChart(chart: Chart, chart_entities: EntityMap): void {
		this.chart = chart;
		this.entities = new RendererEntityContainer(chart_entities);

		this.entity_container.removeAll(true);
		chart_entities.forEachProp(e => {
			this.drawEntity(e);
			e.deactivate();
		})

		this.active_range = this.entities.initialIterators();
		this.scrollToTime(0);
	}

	// -----------------------------------------------
	// MAIN FUNCTIONALITY
	// -----------------------------------------------

	addEntity(entity: UsedEntity): void {
		this.entities.addEntity(entity);
		this.drawEntity(entity);
	}

	deleteEntity(entity: UsedEntity): void { 
		if(this.active_range !== undefined){
			const new_range: { left: REC_Itr | undefined, right: REC_Itr | undefined } = this.active_range;
			// Check if either iterator is both pointing to the entity and the whole group will be deleted
			if(u.objectsEqual(this.active_range.left.value, { [entity.key]: entity } )){
				new_range.left = this.active_range.left.prev()
			}
			if(u.objectsEqual(this.active_range.right.value, { [entity.key]: entity } )){
				new_range.right = this.active_range.right.next()
			}
			this.active_range = bubbleUpUndefined(new_range);
		}
		this.entities.deleteEntity(entity) 
	};

	drawEntity(entity: Entity): void {
		entity.draw(this.scene, this.settings);
		this.entity_container.add(entity.graphic);
	}

	redraw(entity: Entity): void {
		entity.draw(this.scene, this.settings);
	}

	scrollToTime(time: number): void {
		const dir = time >= this.playback_time ? "forward" : "backward";
		this.updateScroll(time);
		this.active_range = this.entities.updateActiveRange(this.active_range, dir, this.track_positions);
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
		this.active_entities.forEach(e => this.moveEntity(e) );
	}

	moveEntity(e: Entity): void { 
		e.graphic.x = (e.timing.scroll_pos - this.scroll_position) * this.settings.base_scroll_speed;
	}

	setBaseScrollSpeed(speed: number): void {
		this.settings.base_scroll_speed = speed;
		this.active_range = this.entities.updateActiveRange(this.active_range, "expand", this.track_positions)
		this.moveActiveEntities();
	}

	// -----------------------------------------------
	// HELPERS
	// -----------------------------------------------

	get current_scroll_speed(): number {
		return this.settings.base_scroll_speed * this.current_scroll_mod;
	}

	// The scroll position of the start and end of the track where entities appear from, plus a buffer
	// Derived by solving for scroll position in the formula for entity x 
	get track_positions(): { left: number, right: number } {
		const buffer = c.ENTITY_LOAD_BUFFER * this.current_scroll_speed;
		return { 
			left: g.WIDTH / this.settings.base_scroll_speed + this.scroll_position - buffer,
			right: this.x / this.current_scroll_speed + this.scroll_position + buffer
		};
	}

	// -----------------------------------------------
	// MANAGING EVENT ACTIVITY
	// -----------------------------------------------

	get active_entities(): Entity[] {
		return this.entities.entitiesInRange(this.active_range, this.track_positions);
	}

	// In the case of making a big jump, it's faster to start the active range from scratch
	resetWhichEntitiesActive(at: number): void {
		this.active_entities.map(e => e.deactivate());
		this.active_range = this.entities.updateActiveRange(
			this.entities.floorIterator(at), "expand", this.track_positions
		)
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

type REC_Itr = RBIterator<number, Partial<EntityGroup>>

class RendererEntityContainer {
	// Start tree is indexed by start position, end tree is indexed by end position
	// Start tree keeps an iterator pointing at the end of the track, end tree the start
	start_tree: GroupTree<number, EntityGroup>
	end_tree: GroupTree<number, EntityGroup>

	constructor(tree: EntityMap) {
		// Each value is guaranteed to have at least one entity, so take that
		this.start_tree = tree.mapKeys((_k, v) => {
			return (Object.values(v)[0] as Entity).timing.scroll_pos
		}, undefined);

		this.end_tree = new GroupTree(undefined)
		tree.forEachProp((ent, _timing, prop) => this.end_tree.setProp(ent.end_pos, prop, ent));
	}

	// -----------------------------------------------
	// MAIN FUNCTIONALITY
	// -----------------------------------------------

	addEntity(entity: UsedEntity): void {
		this.start_tree.setProp(entity.timing.scroll_pos, entity.key, entity);
		this.end_tree.setProp(entity.timing.scroll_pos, entity.key, entity);
	}

	deleteEntity(entity: UsedEntity): void {
		this.start_tree.deleteProp(entity.timing.scroll_pos, entity.key);
		this.end_tree.deleteProp(entity.timing.scroll_pos, entity.key);
	}

	forEachProp(fun: (e: Entity, k: number, p: keyof EntityGroup) => void): void {
		this.start_tree.forEachProp(fun);
	}

	initialIterators(): EntityRange {
		return bubbleUpUndefined({
			left: this.start_tree.startItr(),
			right: this.end_tree.startItr()
		});
	}

	floorIterator(key: number): EntityRange {
		return bubbleUpUndefined({
			left: this.end_tree.floorIterator(key),
			right: this.start_tree.floorIterator(key)
		});
	}

	entitiesInRange(initial_itrs: EntityRange, track_pos: { left: number, right: number }): Entity[] {
		if(initial_itrs === undefined) return [];
		// Get all entities whose end times are in the range
		const entries1 = this.entitiesUntilKey(initial_itrs.left, track_pos.right)[0];
		// Get the entities we missed - the ones whose start times are in range but their end times are late
		const entries2 = this.entitiesUntilKey(initial_itrs.right, track_pos.left)[0]
			.filter(e => e.end_timing !== undefined && 
				e.end_timing.scroll_pos < track_pos.left);
		return entries1.concat(entries2)
	}

	updateActiveRange(itrs: EntityRange, dir: UpdateDirection, track_pos: { left: number, right: number })
			: EntityRange {
		const data: Record<UpdateDirection, Range<["forward" | "backward", "activate" | "deactivate"]>> = {
			forward: { start: ["forward", "deactivate"], end: ["forward", "activate"]},
			backward: { start: ["backward", "activate"], end: ["backward", "deactivate"]},
			expand: { start: ["backward", "activate"], end: ["forward", "activate"]},
			contract: { start: ["forward", "deactivate"], end: ["backward", "deactivate"]},
		}
		const entry = data[dir];

		// If iterators are undefined (no entities), check again - if there are still no entities return
		if(itrs === undefined) {
			itrs = this.initialIterators();
			if(itrs === undefined) return undefined;
		}

		return {
			left: this.advanceIterator(
				itrs.left, entry.start[0], entry.start[1], track_pos.left),
			right: this.advanceIterator(
				itrs.right, entry.end[0], entry.end[1], track_pos.right)
		}
	}

	// -----------------------------------------------
	// HELPERS
	// -----------------------------------------------

	advanceIterator(itr: REC_Itr, dir: "forward" | "backward", 
			toggle: "activate" | "deactivate", pos: number): REC_Itr {
		const [to_toggle, new_itr] = this.entitiesUntilKey(itr, pos, dir)
		const toggle_fun = (toggle === "activate") ? (e:Entity) => e.activate() : (e:Entity) => e.deactivate()
		to_toggle.forEach(toggle_fun);
		return new_itr;
	}

	// Returns entries and new iterator
	entitiesUntilKey(itr: REC_Itr, key: number, dir: "forward" | "backward" = "forward")
			: [Entity[], REC_Itr] {
		const sofar = [];

		const cond = (dir === "forward") ? (itr: REC_Itr) => itr.key <= key : (itr: REC_Itr) => itr.key >= key
		const op = (dir === "forward") ? (itr: REC_Itr) => itr.next() : (itr: REC_Itr) => itr.prev()
			
		while(cond(itr)){
			sofar.push(itr.value);
			const result = op(itr);
			if(result === undefined) break;
			itr = result;
		}
		const entities = sofar.flatMap(group => Object.values(group));
		return [entities, itr];
	}
}

function bubbleUpUndefined(itrs: { left: REC_Itr | undefined, right: REC_Itr | undefined}): EntityRange {
	if(itrs.left === undefined || itrs.right === undefined) return undefined;
	// Doing it like this is needed for typescript
	return { left: itrs.left, right: itrs.right };
}