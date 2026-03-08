FOR NEXT RELEASE:
- Charting screens: Chart properties, song properties, display controls, chart list
- Song select
- Gameplay settings (scroll speed)
- Charting: Set song audio via filepath 

CODE TASKS:
- Refactor: Charts shouldn't store entity graphic objects, they should only store entity specs (such as the existing NoteSpec). NoteFields should create the graphic objects on construction

MISSING FEATURES:
- Gameplay:
	- Visualize bpm changes/scroll changes

- Charting:
	- Load song from file
	- Download chart file
	- Change playback rate
	- Move receptor
	- BPM/scroll changes

NICE TO HAVE:
- Decrease lag
- Rolls
- Autoplay
- Arrowvortex timing algorithm
- Beat lines
- Pause gimmicks
- Visual gimmicks which move note field (e.g. beat from ITG)
- Two modes of charting playback: Snap back to start OR keep position
- Group select in charting
- Undo/redo in charting