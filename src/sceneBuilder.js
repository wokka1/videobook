import * as THREE from 'three';

const SHAPE_BUILDERS = {
  box(params) {
    return new THREE.BoxGeometry(
      params.width || 1, params.height || 1, params.depth || 1
    );
  },
  sphere(params) {
    return new THREE.SphereGeometry(params.radius || 0.5, 32, 32);
  },
  cylinder(params) {
    return new THREE.CylinderGeometry(
      params.radiusTop ?? params.radius ?? 0.5,
      params.radiusBottom ?? params.radius ?? 0.5,
      params.height || 1, params.segments || 32
    );
  },
  cone(params) {
    return new THREE.ConeGeometry(params.radius || 0.5, params.height || 1, params.segments || 32);
  },
  plane(params) {
    return new THREE.PlaneGeometry(
      params.width || 1, params.height || 1,
      params.widthSegments || 1, params.heightSegments || 1
    );
  },
  torus(params) {
    return new THREE.TorusGeometry(
      params.radius || 1, params.tube || 0.3, 16, 48
    );
  },
  // Low-poly tree: generates a stylized tree as a single merged geometry
  lowpolyTree(params) {
    const trunkH = params.trunkHeight || 3;
    const trunkR = params.trunkRadius || 0.2;
    const layers = params.layers || 3;
    const baseRadius = params.canopyRadius || 1.5;
    const layerHeight = params.layerHeight || 1.2;

    const group = new THREE.Group();

    // Trunk - slightly tapered
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(params.trunkColor || '#3d2b1f'),
      roughness: 0.9, metalness: 0
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Canopy layers - low-poly cones stacked
    for (let i = 0; i < layers; i++) {
      const r = baseRadius * (1 - i * 0.25);
      const h = layerHeight * (1.2 - i * 0.15);
      const coneGeo = new THREE.ConeGeometry(r, h, 6 + Math.floor(Math.random() * 3));
      const coneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(params.canopyColor || '#1a4a1a'),
        roughness: 0.8, metalness: 0,
        flatShading: true
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = trunkH + i * (layerHeight * 0.65);
      cone.rotation.y = Math.random() * Math.PI;
      cone.castShadow = true;
      group.add(cone);
    }

    group.userData.isGroup = true;
    return group;
  },
  // Rock cluster
  rocks(params) {
    const group = new THREE.Group();
    const count = params.count || 3;
    const spread = params.spread || 1;
    const baseSize = params.size || 0.3;
    const color = params.color || '#555555';

    for (let i = 0; i < count; i++) {
      const size = baseSize * (0.5 + Math.random() * 0.8);
      const geo = new THREE.DodecahedronGeometry(size, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.95, metalness: 0.05,
        flatShading: true
      });
      const rock = new THREE.Mesh(geo, mat);
      rock.position.set(
        (Math.random() - 0.5) * spread,
        size * 0.4,
        (Math.random() - 0.5) * spread
      );
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.scale.y = 0.5 + Math.random() * 0.3;
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);
    }
    group.userData.isGroup = true;
    return group;
  },
  // Bush / shrub
  bush(params) {
    const group = new THREE.Group();
    const count = params.count || 4;
    const size = params.size || 0.4;
    const color = params.color || '#1a3a1a';

    for (let i = 0; i < count; i++) {
      const s = size * (0.6 + Math.random() * 0.6);
      const geo = new THREE.DodecahedronGeometry(s, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.85, metalness: 0,
        flatShading: true
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(
        (Math.random() - 0.5) * size * 2,
        s * 0.6,
        (Math.random() - 0.5) * size * 2
      );
      sphere.castShadow = true;
      group.add(sphere);
    }
    group.userData.isGroup = true;
    return group;
  },
  // Campfire - multi-part fire with logs
  campfire(params) {
    const group = new THREE.Group();
    const ringRadius = params.radius || 0.8;

    // Stone ring
    const stoneCount = 10;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const geo = new THREE.DodecahedronGeometry(0.15, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#555555'),
        roughness: 0.95, flatShading: true
      });
      const stone = new THREE.Mesh(geo, mat);
      stone.position.set(
        Math.cos(angle) * ringRadius,
        0.08,
        Math.sin(angle) * ringRadius
      );
      stone.rotation.set(Math.random(), Math.random(), 0);
      stone.scale.y = 0.6;
      group.add(stone);
    }

    // Logs
    const logCount = params.logs || 4;
    for (let i = 0; i < logCount; i++) {
      const angle = (i / logCount) * Math.PI * 2 + 0.3;
      const geo = new THREE.CylinderGeometry(0.06, 0.08, ringRadius * 1.2, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(params.charred ? '#1a0a05' : '#3a2010'),
        roughness: 0.95, metalness: 0
      });
      const log = new THREE.Mesh(geo, mat);
      log.position.set(0, 0.1, 0);
      log.rotation.set(0, angle, Math.PI / 2 - 0.2);
      group.add(log);
    }

    // Flames - multiple cones for natural look
    const flameColors = ['#ff6600', '#ff8800', '#ffaa00', '#ff4400'];
    const flameCount = params.flames || 5;
    const flameHeight = params.flameHeight || 1.5;
    for (let i = 0; i < flameCount; i++) {
      const h = flameHeight * (0.5 + Math.random() * 0.6);
      const r = 0.1 + Math.random() * 0.2;
      const geo = new THREE.ConeGeometry(r, h, 5);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(flameColors[i % flameColors.length]),
        transparent: true,
        opacity: 0.85
      });
      const flame = new THREE.Mesh(geo, mat);
      flame.position.set(
        (Math.random() - 0.5) * 0.3,
        h / 2 + 0.15,
        (Math.random() - 0.5) * 0.3
      );
      flame.name = '_flame';
      flame.userData.baseY = flame.position.y;
      flame.userData.baseScale = 0.8 + Math.random() * 0.4;
      flame.userData.speed = 2 + Math.random() * 3;
      flame.userData.phase = Math.random() * Math.PI * 2;
      group.add(flame);
    }

    group.userData.isGroup = true;
    group.userData.isCampfire = true;
    return group;
  },
  // Character figure - more detailed humanoid
  figure(params) {
    const group = new THREE.Group();
    const height = params.height || 1.7;
    const skinColor = params.skinColor || '#c8a882';
    const clothColor = params.clothColor || '#5a4a30';
    const pose = params.pose || 'standing';

    // Torso
    const torsoH = height * 0.3;
    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.22, torsoH, 8);
    const clothMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(clothColor), roughness: 0.8, metalness: 0
    });
    const torso = new THREE.Mesh(torsoGeo, clothMat);
    torso.castShadow = true;

    // Head
    const headGeo = new THREE.SphereGeometry(height * 0.08, 8, 8);
    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinColor), roughness: 0.7, metalness: 0
    });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = torsoH / 2 + height * 0.05;
    head.castShadow = true;

    // Legs
    const legH = height * 0.35;
    const legGeo = new THREE.CylinderGeometry(0.07, 0.09, legH, 6);
    const legL = new THREE.Mesh(legGeo, clothMat);
    legL.position.set(-0.1, -torsoH / 2 - legH / 2, 0);
    const legR = new THREE.Mesh(legGeo.clone(), clothMat);
    legR.position.set(0.1, -torsoH / 2 - legH / 2, 0);

    // Arms
    const armH = height * 0.28;
    const armGeo = new THREE.CylinderGeometry(0.05, 0.06, armH, 6);
    const armL = new THREE.Mesh(armGeo, clothMat);
    armL.position.set(-0.28, 0, 0);
    armL.rotation.z = 0.15;
    const armR = new THREE.Mesh(armGeo.clone(), clothMat);
    armR.position.set(0.28, 0, 0);
    armR.rotation.z = -0.15;

    // Use an inner group so the y-offset isn't overwritten by scene position
    const inner = new THREE.Group();
    inner.add(torso, head, legL, legR, armL, armR);
    group.add(inner);

    if (pose === 'sitting') {
      legL.rotation.x = -Math.PI / 2;
      legL.position.set(-0.1, -torsoH / 2, legH / 2);
      legR.rotation.x = -Math.PI / 2;
      legR.position.set(0.1, -torsoH / 2, legH / 2);
      inner.position.y = torsoH / 2 + legH * 0.5;
    } else if (pose === 'lying') {
      inner.position.y = 0.3;
      inner.rotation.x = Math.PI / 2;
    } else {
      inner.position.y = torsoH / 2 + legH;
    }

    group.userData.isGroup = true;
    return group;
  }
};

function buildMaterial(matDef) {
  const color = new THREE.Color(matDef.color || '#888888');
  const opts = { color };

  if (matDef.opacity !== undefined) {
    opts.opacity = matDef.opacity;
    opts.transparent = true;
  }
  if (matDef.emissive) {
    opts.emissive = new THREE.Color(matDef.emissive);
    opts.emissiveIntensity = matDef.emissiveIntensity ?? 1;
  }
  if (matDef.wireframe) opts.wireframe = true;
  if (matDef.roughness !== undefined) opts.roughness = matDef.roughness;
  if (matDef.metalness !== undefined) opts.metalness = matDef.metalness;
  if (matDef.flatShading) opts.flatShading = true;

  const type = matDef.type || 'standard';
  switch (type) {
    case 'basic': return new THREE.MeshBasicMaterial(opts);
    case 'phong': return new THREE.MeshPhongMaterial(opts);
    case 'lambert': return new THREE.MeshLambertMaterial(opts);
    default: return new THREE.MeshStandardMaterial(opts);
  }
}

function buildObject(objDef) {
  const builder = SHAPE_BUILDERS[objDef.shape];
  if (!builder) {
    console.warn(`Unknown shape: ${objDef.shape}`);
    return null;
  }

  const result = builder(objDef.params || {});

  // Some builders return a Group directly
  if (result.isGroup || result.userData?.isGroup) {
    const group = result;
    if (objDef.position) group.position.set(...objDef.position);
    if (objDef.rotation) group.rotation.set(...objDef.rotation.map(d => d * Math.PI / 180));
    if (objDef.scale) {
      if (typeof objDef.scale === 'number') group.scale.setScalar(objDef.scale);
      else group.scale.set(...objDef.scale);
    }
    if (objDef.name) group.name = objDef.name;
    return group;
  }

  // Standard geometry path
  const geometry = result;
  const material = buildMaterial(objDef.material || {});
  const mesh = new THREE.Mesh(geometry, material);

  if (objDef.position) mesh.position.set(...objDef.position);
  if (objDef.rotation) mesh.rotation.set(...objDef.rotation.map(d => d * Math.PI / 180));
  if (objDef.scale) {
    if (typeof objDef.scale === 'number') mesh.scale.setScalar(objDef.scale);
    else mesh.scale.set(...objDef.scale);
  }
  if (objDef.castShadow) mesh.castShadow = true;
  if (objDef.receiveShadow) mesh.receiveShadow = true;
  if (objDef.name) mesh.name = objDef.name;

  return mesh;
}

function buildLight(lightDef) {
  let light;
  const color = new THREE.Color(lightDef.color || '#ffffff');
  const intensity = lightDef.intensity ?? 1;

  switch (lightDef.type) {
    case 'ambient':
      light = new THREE.AmbientLight(color, intensity);
      break;
    case 'directional':
      light = new THREE.DirectionalLight(color, intensity);
      if (lightDef.castShadow) {
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 50;
        light.shadow.camera.left = -15;
        light.shadow.camera.right = 15;
        light.shadow.camera.top = 15;
        light.shadow.camera.bottom = -15;
        light.shadow.bias = -0.001;
      }
      break;
    case 'point':
      light = new THREE.PointLight(color, intensity, lightDef.distance || 0, lightDef.decay ?? 1.5);
      if (lightDef.castShadow) {
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
      }
      // Tag for flickering animation
      if (lightDef.flicker) {
        light.userData.flicker = true;
        light.userData.baseIntensity = intensity;
        light.userData.flickerSpeed = lightDef.flickerSpeed || 5;
        light.userData.flickerAmount = lightDef.flickerAmount || 0.3;
      }
      break;
    case 'spot':
      light = new THREE.SpotLight(color, intensity);
      if (lightDef.angle) light.angle = lightDef.angle * Math.PI / 180;
      if (lightDef.penumbra !== undefined) light.penumbra = lightDef.penumbra;
      if (lightDef.castShadow) {
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
      }
      break;
    case 'hemisphere':
      light = new THREE.HemisphereLight(
        color, new THREE.Color(lightDef.groundColor || '#444444'), intensity
      );
      break;
    default:
      console.warn(`Unknown light type: ${lightDef.type}`);
      return null;
  }

  if (lightDef.position) light.position.set(...lightDef.position);
  if (lightDef.target) {
    light.target = new THREE.Object3D();
    light.target.position.set(...lightDef.target);
  }
  return light;
}

function buildParticles(particleDef) {
  const count = particleDef.count || 100;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const lifetimes = new Float32Array(count);
  const spread = particleDef.spread || [10, 10, 10];
  const offset = particleDef.offset || [0, 0, 0];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread[0] + offset[0];
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread[1] + offset[1];
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread[2] + offset[2];

    // Upward drift velocity
    velocities[i * 3] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 1] = 0.01 + Math.random() * 0.03;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

    lifetimes[i] = Math.random();
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(particleDef.color || '#ffffff'),
    size: particleDef.size || 0.1,
    transparent: true,
    opacity: particleDef.opacity ?? 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  if (particleDef.name) points.name = particleDef.name;

  // Store particle config for animation
  points.userData.particleConfig = {
    spread,
    offset,
    drift: particleDef.drift ?? true,
    driftSpeed: particleDef.driftSpeed || 1,
    twinkle: particleDef.twinkle ?? false,
  };

  return points;
}

export function buildScene(sceneDef, threeScene) {
  // Clear existing scene objects
  while (threeScene.children.length > 0) {
    const child = threeScene.children[0];
    threeScene.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
  }

  // Background / fog
  if (sceneDef.background) {
    threeScene.background = new THREE.Color(sceneDef.background);
  }
  if (sceneDef.fog) {
    threeScene.fog = new THREE.FogExp2
      ? new THREE.FogExp2(
          new THREE.Color(sceneDef.fog.color || sceneDef.background || '#000000'),
          sceneDef.fog.density || 0.035
        )
      : new THREE.Fog(
          new THREE.Color(sceneDef.fog.color || sceneDef.background || '#000000'),
          sceneDef.fog.near || 10,
          sceneDef.fog.far || 50
        );
    // Allow override back to linear fog
    if (sceneDef.fog.near !== undefined || sceneDef.fog.far !== undefined) {
      threeScene.fog = new THREE.Fog(
        new THREE.Color(sceneDef.fog.color || sceneDef.background || '#000000'),
        sceneDef.fog.near || 10,
        sceneDef.fog.far || 50
      );
    }
  }

  // Lights
  if (sceneDef.lights) {
    for (const lightDef of sceneDef.lights) {
      const light = buildLight(lightDef);
      if (light) {
        threeScene.add(light);
        if (light.target) threeScene.add(light.target);
      }
    }
  }

  // Objects
  if (sceneDef.objects) {
    for (const objDef of sceneDef.objects) {
      const obj = buildObject(objDef);
      if (obj) threeScene.add(obj);
    }
  }

  // Particles
  if (sceneDef.particles) {
    for (const pDef of sceneDef.particles) {
      const points = buildParticles(pDef);
      if (points) threeScene.add(points);
    }
  }

  return threeScene;
}
