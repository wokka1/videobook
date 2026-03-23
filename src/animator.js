import * as THREE from 'three';

// Easing functions
const EASINGS = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};

// Interpolate between two values (number, array, or THREE.Vector3-like)
function lerp(a, b, t) {
  if (typeof a === 'number') return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((v, i) => v + (b[i] - v) * t);
  return a;
}

/**
 * Scene animation controller.
 *
 * Each scene object can have an "animation" field:
 * {
 *   "keyframes": [
 *     { "time": 0, "position": [x,y,z], "rotation": [rx,ry,rz], "scale": [sx,sy,sz], "opacity": 1 },
 *     { "time": 3, "position": [x2,y2,z2], "easing": "easeInOut" },
 *     ...
 *   ],
 *   "loop": false
 * }
 *
 * "time" is in seconds relative to the scene's audioStart.
 * Only properties present in a keyframe are animated (others hold previous value).
 */
export class SceneAnimator {
  constructor() {
    this.animations = []; // { object3d, keyframes, loop, sceneAudioStart }
    this.sceneStartTime = 0; // audioStart of current scene
  }

  /**
   * Load animations from scene definition and link to Three.js objects.
   */
  load(sceneDef, threeScene) {
    this.animations = [];
    this.sceneStartTime = sceneDef.audioStart || 0;

    if (!sceneDef.objects) return;

    for (const objDef of sceneDef.objects) {
      if (!objDef.animation || !objDef.name) continue;

      const object3d = threeScene.getObjectByName(objDef.name);
      if (!object3d) {
        console.warn(`Animation target not found: ${objDef.name}`);
        continue;
      }

      const anim = objDef.animation;
      const keyframes = (anim.keyframes || []).map(kf => ({
        ...kf,
        // Convert rotation degrees to radians in keyframe data
        rotation: kf.rotation ? kf.rotation.map(d => d * Math.PI / 180) : undefined,
      }));

      // Sort by time
      keyframes.sort((a, b) => a.time - b.time);

      // Store initial state from the first keyframe or current object state
      const initial = {
        position: keyframes[0]?.position
          ? [...keyframes[0].position]
          : [object3d.position.x, object3d.position.y, object3d.position.z],
        rotation: keyframes[0]?.rotation
          ? [...keyframes[0].rotation]
          : [object3d.rotation.x, object3d.rotation.y, object3d.rotation.z],
        scale: keyframes[0]?.scale
          ? [...keyframes[0].scale]
          : [object3d.scale.x, object3d.scale.y, object3d.scale.z],
        opacity: keyframes[0]?.opacity ?? 1,
      };

      this.animations.push({
        object3d,
        keyframes,
        loop: anim.loop || false,
        initial,
      });
    }
  }

  /**
   * Update all animations based on current audio time.
   * @param {number} audioTime - current audioElement.currentTime
   */
  update(audioTime) {
    const sceneTime = audioTime - this.sceneStartTime;

    for (const anim of this.animations) {
      const { object3d, keyframes, loop, initial } = anim;
      if (keyframes.length === 0) continue;

      const totalDuration = keyframes[keyframes.length - 1].time;
      let t = sceneTime;

      if (loop && totalDuration > 0) {
        t = t % totalDuration;
      } else {
        t = Math.max(0, Math.min(t, totalDuration));
      }

      // Find surrounding keyframes
      let kfBefore = keyframes[0];
      let kfAfter = keyframes[0];

      for (let i = 0; i < keyframes.length - 1; i++) {
        if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
          kfBefore = keyframes[i];
          kfAfter = keyframes[i + 1];
          break;
        }
        if (t > keyframes[i].time) {
          kfBefore = keyframes[i];
          kfAfter = keyframes[Math.min(i + 1, keyframes.length - 1)];
        }
      }

      // If past last keyframe, hold final values
      if (t >= totalDuration) {
        kfBefore = keyframes[keyframes.length - 1];
        kfAfter = kfBefore;
      }

      // Calculate interpolation factor
      const segDuration = kfAfter.time - kfBefore.time;
      const rawT = segDuration > 0 ? (t - kfBefore.time) / segDuration : 1;
      const easing = EASINGS[kfAfter.easing || 'easeInOut'] || EASINGS.easeInOut;
      const easedT = easing(rawT);

      // Interpolate position
      const posA = kfBefore.position || this._lastPos(anim, kfBefore) || initial.position;
      const posB = kfAfter.position || posA;
      const pos = lerp(posA, posB, easedT);
      object3d.position.set(pos[0], pos[1], pos[2]);

      // Interpolate rotation
      const rotA = kfBefore.rotation || this._lastRot(anim, kfBefore) || initial.rotation;
      const rotB = kfAfter.rotation || rotA;
      const rot = lerp(rotA, rotB, easedT);
      object3d.rotation.set(rot[0], rot[1], rot[2]);

      // Interpolate scale
      const scaA = kfBefore.scale || this._lastScale(anim, kfBefore) || initial.scale;
      const scaB = kfAfter.scale || scaA;
      const sca = lerp(scaA, scaB, easedT);
      object3d.scale.set(sca[0], sca[1], sca[2]);

      // Interpolate opacity (if object has material)
      if (kfBefore.opacity !== undefined || kfAfter.opacity !== undefined) {
        const opA = kfBefore.opacity ?? initial.opacity;
        const opB = kfAfter.opacity ?? opA;
        const op = lerp(opA, opB, easedT);
        object3d.traverse(child => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = op;
          }
        });
      }
    }
  }

  // Find the last keyframe before `kf` that had a position
  _lastPos(anim, kf) {
    for (let i = anim.keyframes.indexOf(kf) - 1; i >= 0; i--) {
      if (anim.keyframes[i].position) return anim.keyframes[i].position;
    }
    return null;
  }

  _lastRot(anim, kf) {
    for (let i = anim.keyframes.indexOf(kf) - 1; i >= 0; i--) {
      if (anim.keyframes[i].rotation) return anim.keyframes[i].rotation;
    }
    return null;
  }

  _lastScale(anim, kf) {
    for (let i = anim.keyframes.indexOf(kf) - 1; i >= 0; i--) {
      if (anim.keyframes[i].scale) return anim.keyframes[i].scale;
    }
    return null;
  }
}
