import { GameObjects, Scene } from "phaser";
import * as u from '../helpers/utils';
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";
import RoundRectangle from "phaser3-rex-plugins/plugins/roundrectangle";

// If passed in an object with string keys, it will add elements to the sizer with their keys
export function makeSizer(scene: Scene, 
		game_objs: Record<string, GameObjects.GameObject> | GameObjects.GameObject[], 
		config: Sizer.IConfig = {}, add_config: Sizer.IAddConfig = {}): Sizer {
	const sizer = scene.rexUI.add.sizer( { 
		orientation: 'vertical',
		...config
	})
	if(Array.isArray(game_objs)){
		game_objs.forEach( obj => sizer.add(scene.add.existing(obj), {
			...add_config
		}))
	} else {
		u.objectForEach(game_objs, (obj, key) => {
			sizer.add(scene.add.existing(obj), {
				key: key,
				...add_config
			})
		})
	}
	// You have to do scene.add.existing when adding an object to a sizer, for some reason
	sizer.layout();
	return sizer;
}

export function makeBackground(scene: Scene, color: number): RoundRectangle {
	return scene.rexUI.add.roundRectangle({color: color}).setToBack()
}

// In some cases, Phaser accepts colors as a hex number, but other times it needs a formatted string
export function colorToString(color: number): string {
	return `#${color.toString(16)}`
}