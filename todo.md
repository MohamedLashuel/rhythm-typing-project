FOR NEXT RELEASE:
- Make look nice:
	- Main menu
	- Song select
	- Results screen
	- Loading screens
- Make charts

BUGS:

MISSING FEATURES:
- Charting:
	- Move receptor
	- Group select and undo/redo in charting

CODE TASKS (low priority)
- Charting note field has too much responsibility, precluding automated testing with just logic and no note field/renderer
- Implement own red-black tree with iterators that hold their own value (not just next) and persistent through mutation - that way there's no need to use 2 different structures in charting/gameplay for entities
- Move phaser wrappers (keyboard, sound, event emitter) to own folder

NICE TO HAVE:
- Chart starts with delay if notes come right away (like stepmania)
- Decrease lag
- Rolls
- Autoplay
- Arrowvortex timing algorithm
- Beat lines
- More gimmicks: pause, stutter, accelerate/decelerate, expand
- Two modes of charting playback: Snap back to start OR keep position