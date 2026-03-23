# Videobook

Interactive 3D audiobook experience. Renders scenes from a book as navigable 3D environments synced to audiobook narration.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173/).

## Audio Setup

The audiobook audio is not included in the repo. To set up Chapter 13:

1. Place the `.m4b` audiobook file for *Critical Failures* by Robert Bevan somewhere accessible
2. Extract Chapter 13 audio using ffmpeg:
   ```bash
   ffmpeg -i "path/to/audiobook.m4b" -ss 16118.503719 -to 17710.556689 -c:a aac -b:a 128k -vn public/chapter13.m4a
   ```
3. The app will automatically load `public/chapter13.m4a` on startup

## Controls

| Input | Action |
|-------|--------|
| **W / S** | Move forward / backward |
| **A / D** | Strafe left / right |
| **Q / E** | Move down / up |
| **Mouse drag** | Orbit camera |
| **Scroll wheel** | Zoom in / out |
| **Right-click drag** | Pan camera |

### UI Buttons

- **Previous Scene / Next Scene** - Jump between scenes (also seeks audio to match)
- **Play Audio** - Start/pause audiobook narration; scenes auto-advance with the audio

## How It Works

1. **Scene JSON** (`scenes/chapter13.json`) - Describes each scene: objects, lights, particles, camera, animations, and audio timestamps
2. **Scene Builder** (`src/sceneBuilder.js`) - Converts JSON into Three.js objects. Supports shapes (lowpolyTree, campfire, rocks, bush, figure), PBR materials, and particle systems
3. **Animator** (`src/animator.js`) - Keyframe animation system synced to `audioElement.currentTime`. Objects move, fade, and rotate on cue with the narration
4. **Main** (`src/main.js`) - Renderer with bloom post-processing, orbit controls, WASD movement, fire/particle animation, and audio sync

## Adding New Scenes

Scene JSON format:
```json
{
  "title": "Scene Name",
  "narration": "Text shown at top of screen",
  "audioStart": 120,
  "background": "#0a0612",
  "fog": { "color": "#0e0820", "near": 8, "far": 30 },
  "camera": { "position": [3, 2.5, 5], "target": [0, 1, 1] },
  "bloom": { "strength": 0.8, "radius": 0.4, "threshold": 0.7 },
  "lights": [],
  "objects": [],
  "particles": []
}
```

Objects can have animation keyframes synced to audio time (relative to scene's `audioStart`):
```json
{
  "name": "character",
  "shape": "figure",
  "params": { "height": 1.7, "pose": "standing" },
  "position": [0, 0, 0],
  "animation": {
    "keyframes": [
      { "time": 0, "position": [5, 0, 6] },
      { "time": 10, "position": [2, 0, 2], "easing": "easeInOut" }
    ]
  }
}
```

## Tech Stack

- [Three.js](https://threejs.org/) - 3D rendering (MIT license)
- [Vite](https://vitejs.dev/) - Dev server and build tool
