import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildScene } from './sceneBuilder.js';
import { SceneAnimator } from './animator.js';

// --- Renderer setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 2.5;
document.body.appendChild(renderer.domElement);

// --- Scene & Camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 5, 12);

// --- Post-processing ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength
  0.4,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// --- Orbit Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 2, 0);
controls.maxPolarAngle = Math.PI * 0.85;
controls.minDistance = 2;
controls.maxDistance = 30;

// --- Scene management ---
let scenes = [];
let currentSceneIndex = 0;
let audioElement = null;
const clock = new THREE.Clock();
const animator = new SceneAnimator();

async function loadScenes(url) {
  const res = await fetch(url);
  const data = await res.json();
  scenes = data.scenes || [data];
  goToScene(0);
}

function goToScene(index) {
  if (index < 0 || index >= scenes.length) return;
  currentSceneIndex = index;
  const sceneDef = scenes[currentSceneIndex];
  buildScene(sceneDef, scene);

  // Update camera if scene specifies it
  if (sceneDef.camera) {
    if (sceneDef.camera.position) camera.position.set(...sceneDef.camera.position);
    if (sceneDef.camera.target) controls.target.set(...sceneDef.camera.target);
  }

  // Bloom per scene
  if (sceneDef.bloom) {
    bloomPass.strength = sceneDef.bloom.strength ?? 0.8;
    bloomPass.radius = sceneDef.bloom.radius ?? 0.4;
    bloomPass.threshold = sceneDef.bloom.threshold ?? 0.85;
  }

  // Seek audio to match scene
  if (audioElement && sceneDef.audioStart !== undefined) {
    audioElement.currentTime = sceneDef.audioStart;
  }

  // Load animations for this scene
  animator.load(sceneDef, scene);

  // Update label
  const label = document.getElementById('scene-label');
  label.textContent = sceneDef.narration || sceneDef.title || `Scene ${index + 1}`;
}

// --- Audio ---
function initAudio(url) {
  audioElement = new Audio(url);
  audioElement.addEventListener('timeupdate', () => {
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (scenes[i].audioStart !== undefined && audioElement.currentTime >= scenes[i].audioStart) {
        if (currentSceneIndex !== i) goToScene(i);
        break;
      }
    }
  });
}

function toggleAudio() {
  if (!audioElement) return;
  const btn = document.getElementById('btn-play');
  if (audioElement.paused) {
    audioElement.play().then(() => {
      btn.textContent = 'Pause Audio';
    }).catch(err => {
      console.error('Audio play failed:', err);
    });
  } else {
    audioElement.pause();
    btn.textContent = 'Play Audio';
  }
}

// --- UI ---
document.getElementById('btn-prev').addEventListener('click', () => goToScene(currentSceneIndex - 1));
document.getElementById('btn-next').addEventListener('click', () => goToScene(currentSceneIndex + 1));
document.getElementById('btn-play').addEventListener('click', toggleAudio);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
function animateParticles(dt) {
  scene.traverse(child => {
    if (!child.isPoints || !child.userData.particleConfig) return;

    const config = child.userData.particleConfig;
    const positions = child.geometry.attributes.position;
    const velocities = child.geometry.attributes.velocity;
    if (!positions || !velocities) return;

    const arr = positions.array;
    const vel = velocities.array;
    const spread = config.spread;
    const offset = config.offset;
    const speed = config.driftSpeed;

    for (let i = 0; i < positions.count; i++) {
      // Drift upward
      arr[i * 3] += vel[i * 3] * speed;
      arr[i * 3 + 1] += vel[i * 3 + 1] * speed;
      arr[i * 3 + 2] += vel[i * 3 + 2] * speed;

      // Add gentle sway
      arr[i * 3] += Math.sin(clock.elapsedTime * 0.5 + i) * 0.003;

      // Respawn if out of bounds
      if (arr[i * 3 + 1] > offset[1] + spread[1] / 2) {
        arr[i * 3] = (Math.random() - 0.5) * spread[0] + offset[0];
        arr[i * 3 + 1] = offset[1] - spread[1] / 2;
        arr[i * 3 + 2] = (Math.random() - 0.5) * spread[2] + offset[2];
      }
    }
    positions.needsUpdate = true;

    // Twinkle opacity
    if (config.twinkle) {
      child.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 3) * 0.3;
    }
  });
}

function animateFireAndLights(time) {
  scene.traverse(child => {
    // Flickering point lights
    if (child.isLight && child.userData.flicker) {
      const base = child.userData.baseIntensity;
      const speed = child.userData.flickerSpeed;
      const amount = child.userData.flickerAmount;
      child.intensity = base + Math.sin(time * speed) * amount * base
        + Math.sin(time * speed * 2.3) * amount * base * 0.5
        + Math.random() * amount * base * 0.2;
    }

    // Animated flame cones inside campfire groups
    if (child.name === '_flame' && child.userData.baseY !== undefined) {
      const s = child.userData.baseScale;
      const spd = child.userData.speed;
      const phase = child.userData.phase;
      const flicker = 0.8 + Math.sin(time * spd + phase) * 0.2 + Math.random() * 0.1;
      child.scale.set(flicker * s, (0.85 + Math.sin(time * spd * 1.3 + phase) * 0.25) * s, flicker * s);
      child.position.y = child.userData.baseY + Math.sin(time * spd * 0.7 + phase) * 0.05;
      child.rotation.y = time * 0.5 + phase;
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const time = clock.elapsedTime;

  controls.update();
  animateParticles(dt);
  animateFireAndLights(time);

  // Update keyframe animations synced to audio
  if (audioElement && !audioElement.paused) {
    animator.update(audioElement.currentTime);
  }

  composer.render();
}

animate();

// --- Load chapter 13 with audio ---
loadScenes('/scenes/chapter13.json').then(() => {
  initAudio('/chapter13.m4a');
});
