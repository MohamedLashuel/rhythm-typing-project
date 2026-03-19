import { Scene } from "phaser";
import * as u from '../helpers/utils';
import * as s from './shared';
import { PickableElement } from "./PickableElement";
import ScrollablePanel from "phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel";
import { NonEmptyArray } from "../helpers/types";
import { UITheme } from "./types";

export class ElementPickerList<T extends PickableElement<any>> {
	cursor: number;
	elements: NonEmptyArray<T>;
	panel: ScrollablePanel;

	constructor(scene: Scene, theme: UITheme, elements: NonEmptyArray<T>, 
			dir: "vertical" | "horizontal" = "vertical", config: Partial<ScrollablePanel.IConfig> = {}) {
		this.elements = elements;
		this.attachPointerEventListeners(elements);

		this.panel = new ScrollablePanel(scene, {
			...config,
			// Render from top-right corner as the panel is on the right edge
			originX: 1,
			originY: 0,
			background: s.makeBackground(scene, theme.colors.bg),
			panel: {
				child: s.makeSizer(scene, elements.map(e => e.game_obj), { orientation: dir })
			},
	        clampChildOY: true,
		}).layout();

		this.cursor = 0;
		this.elements.forEach(e => e.unhover());
		this.elements[0]?.hover();
	}

	// When pointer events happen to an element, the list has to be involved
	attachPointerEventListeners(elements: T[]) {
		elements.forEach( (e, i) => {
			// When an element is clicked, set the cursor to that element
			e.game_obj.on('pointerdown', () => {
				this.elements[this.cursor]?.unhover();
				this.cursor = i;
			})
			e.game_obj.on('pointerover', () => {
				this.elements[this.cursor]?.unhover();
				e.hover();
			})
			e.game_obj.on('pointerout', () => {
				if(this.cursor !== i) e.unhover();
				this.elements[this.cursor]?.hover();
			})
		});
	}

	// Move the cursor if the key was up arrow/down arrow, otherwise pass the event to the current element
	processKeyDownEvent(event: KeyboardEvent): void {
		if(event.key === "ArrowDown") this.moveCursor("down");
		else if (event.key === "ArrowUp") this.moveCursor("up");
		else {
			if(this.selectedElement().hovered) this.selectedElement().processKeyDownEvent(event);
		}
	}

	moveCursor(dir: "up" | "down"): void {
		const raw_new_pos = this.cursor + (dir === "up" ? -1 : 1);
		const new_pos = Phaser.Math.Clamp(raw_new_pos, 0, this.elements.length - 1);

		if(new_pos === this.cursor) return

		this.elements[this.cursor]?.unhover();
		this.elements[new_pos]?.hover();
		this.cursor = new_pos;
	}

	selectedElement(): T {
		const el = this.elements[this.cursor];
		u.shouldntBeUndefined(el, "Element picker list cursor out of range");
		return el;
	}

	unhoverAll(): void {
		this.elements.forEach(e => e.unhover());
	}
}