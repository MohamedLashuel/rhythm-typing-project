import { Boot } from './scenes/Boot';
import { Gameplay } from './scenes/Gameplay';
import { Results } from './scenes/Results';
import { Charting } from './scenes/Charting'
import { Precharting } from './scenes/Precharting'
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { WIDTH, HEIGHT } from './graphics';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: 'game-container',
    backgroundColor: '#028af8',
    dom: {
        createContainer: true
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Gameplay,
        Results,
        Charting,
        Precharting
    ],
    plugins: {
        scene: [{
            key: 'rexUI',
            plugin: UIPlugin,
            mapping: 'rexUI'
        }]
    }
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
