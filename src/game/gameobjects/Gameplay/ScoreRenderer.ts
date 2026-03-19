import { GameObjects, Scene, Tweens } from "phaser";
import * as g from '../../graphics';
import { Judgment } from "../types";

export class ScoreRenderer {
	scene: Scene;
	judgment_text: GameObjects.Text;
	score_text: GameObjects.Text;
	score_update_tween?: Tweens.Tween;

	constructor(scene: Scene, score: number = 0){
		this.scene = scene;
		this.judgment_text = this.scene.add.text(g.JUDGMENT_TEXT_PT.x, g.JUDGMENT_TEXT_PT.y, "", 
			g.JUDGMENT_STYLE);
		this.score_text = this.scene.add.text(g.SCORE_TEXT_PT.x, g.SCORE_TEXT_PT.y, score.toString(),
			g.SCORE_STYLE);
		this.judgment_text.setOrigin(0.5);
		this.score_text.setOrigin(0.5)
	}

	onJudgmentMade(judgment: Judgment): void {
		this.judgment_text.setText(judgment.name)
			.setStyle( { stroke: g.NORMAL_JUDGMENT_PALETTE[judgment.name] ?? '#ffffff' } ) ;
	}

	onScoreChanged(to: number): void {
		if(this.score_update_tween !== undefined && this.score_update_tween.isPlaying()){
			this.score_update_tween.updateTo('value', to);
		} else {
			this.score_update_tween = this.scene.tweens.addCounter({
				from: Number(this.score_text.text),
				to: to,
				duration: g.SCORE_TWEEN_SPEED,
				ease: 'linear',
				onUpdate: (tween) => {
					const val = tween.getValue();
					if(val !== null) this.score_text.setText(Math.ceil(val).toString());
				}
			})
		}
	}
}