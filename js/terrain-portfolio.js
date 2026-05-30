Promise.all([
  import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js'),
  import('https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/math/ImprovedNoise.js'),
  import('https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/loaders/GLTFLoader.js')
]).then(([THREE, { ImprovedNoise }, { GLTFLoader }]) => {
  const appViews = Array.from(document.querySelectorAll('.app-view'));
  const landingView = document.querySelector('#landing-view');
  const journeyView = document.querySelector('#journey-view');
  const profileView = document.querySelector('#profile-view');
  const canvas = document.querySelector('#terrain-canvas');
  const sectionCardElement = document.querySelector('#section-card');
  const sectionCardKicker = document.querySelector('#section-card-kicker');
  const sectionCardTitle = document.querySelector('#section-card-title');
  const sectionCardSummary = document.querySelector('#section-card-summary');
  const sectionCardList = document.querySelector('#section-card-list');
  const sectionCardAction = document.querySelector('#section-card-action');
  const themes = window.PORTFOLIO_THEMES || {};
  const content = window.PORTFOLIO_CONTENT || {};
  const themeStylesheet = document.querySelector('#theme-stylesheet');
  const themeToggle = document.querySelector('#theme-toggle');
  const freeRoamToggle = document.querySelector('#free-roam-toggle');
  const resetJourneyButton = document.querySelector('#reset-journey');
  const modeHelper = document.querySelector('#mode-helper');
  const journeyStepCount = document.querySelector('#journey-step-count');
  const journeyCurrentLabel = document.querySelector('#journey-current-label');
  const journeyStepTrack = document.querySelector('#journey-step-track');
  const mobileMarkerList = document.querySelector('#mobile-marker-list');
  const routeButtons = Array.from(document.querySelectorAll('[data-route]'));
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const journeyMarkers = content.journeyMarkers || [];
  const cardTargetNdc = new THREE.Vector3(0.68, 0.08, 0.58);
  const worldWidth = 256;
  const worldDepth = 256;
  const terrainSize = 7500;
  const terrainHalf = terrainSize / 2;
  const pathSpeed = 0.018;
  const sideSpeed = 260;
  const cameraHeight = 105;
  const lookAhead = 0.026;
  const journeyStartProgress = Math.max(0.03, (journeyMarkers[0]?.progress ?? 0.18) - 0.105);

  let camera;
  let scene;
  let renderer;
  let mesh;
  let texture;
  let path;
  let trailSamples = [];
  let pathProgress = journeyStartProgress;
  let sideOffset = 0;
  let freeRoamEnabled = false;
  let freeYaw = 0;
  const freePosition = new THREE.Vector3();
  let data;
  let celestialObjects;
  let starFieldGroup;
  let flowFogGroup;
  const flowFogSprites = [];
  const starLayers = [];
  let horsePivot;
  let horseModel;
  let horseMixer = null;
  let horseMaterials;
  let horseWalkingAudio = null;
  let horseAudioPlayPending = false;
  let horseAudioBlocked = false;
  let horseAudioWanted = false;
  const horseSteeringRig = {
    body: [],
    neck: [],
    head: [],
    baseQuaternions: new Map()
  };
  const rideMotion = {
    speed: 0,
    steer: 0,
    phase: 0
  };
  let currentView = 'landing';
  let currentMarkerIndex = 0;
  let rendererReady = false;
  const storedThemeName = getStoredThemeName();
  let activeThemeName = themes[storedThemeName] ? storedThemeName : 'night';
  let activeTheme = themes[activeThemeName] || themes.night;
  const sectionMarkers = [];
  const clock = new THREE.Clock();
  const keys = new Set();

  initThemeControls();
  initViewRouting();
  initJourneyControls();
  initJourneyProgress();
  initMobileJourneyFallback();
  init();
  renderRoute();

  // Debug hook (optional). Used by js/debug-theme-panel.js if included.
  // Safe to ignore/remove; no functional dependency.
  window.__PORTFOLIO_RUNTIME__ = {
    get themes() {
      return themes;
    },
    get activeThemeName() {
      return activeThemeName;
    },
    get activeTheme() {
      return activeTheme;
    },
    get horse() {
      return {
        loaded: Boolean(horseModel?.children.length),
        bodyBones: horseSteeringRig.body.length,
        neckBones: horseSteeringRig.neck.length,
        headBones: horseSteeringRig.head.length,
        speed: rideMotion.speed,
        steer: rideMotion.steer,
        audioReady: Boolean(horseWalkingAudio),
        audioPlaying: Boolean(horseWalkingAudio && !horseWalkingAudio.paused),
        audioLoop: Boolean(horseWalkingAudio?.loop),
        audioPlaybackRate: horseWalkingAudio?.playbackRate || 0,
        freeRoamEnabled
      };
    },
    refresh() {
      applyThemeDocument();
      applyThemeToScene();
    },
    setThemeValue(themeName, path, value) {
      if (!themes?.[themeName]) return;
      const parts = String(path).split('.').filter(Boolean);
      if (!parts.length) return;
      let target = themes[themeName];
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (!target || typeof target !== 'object') return;
        target = target[parts[i]];
      }
      const key = parts[parts.length - 1];
      if (!target || typeof target !== 'object') return;
      target[key] = value;

      if (themeName === activeThemeName) {
        activeTheme = themes[activeThemeName];
        applyThemeToScene();
        applyThemeDocument();
      }
    },
    syncVisualConfig() {
      if (typeof window.syncPortfolioThemesFromVisualConfig === 'function') {
        window.syncPortfolioThemesFromVisualConfig();
        activeTheme = themes[activeThemeName];
        applyThemeDocument();
        applyThemeToScene();
      }
    },
    switchTheme(themeName) {
      switchTheme(themeName);
    }
  };
  window.dispatchEvent(new Event('portfolio-runtime-ready'));
  function initThemeControls() {
    applyThemeDocument();

    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
      const nextTheme = activeThemeName === 'night' ? 'day' : 'night';
      switchTheme(nextTheme);
    });
  }

  function initViewRouting() {
    window.addEventListener('hashchange', renderRoute);

    routeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetRoute = button.dataset.route;
        if (targetRoute) window.location.hash = targetRoute;
      });
    });
  }

  function initJourneyControls() {
    if (freeRoamToggle) {
      freeRoamToggle.addEventListener('click', () => {
        setFreeRoamEnabled(!freeRoamEnabled);
      });
    }

    if (resetJourneyButton) {
      resetJourneyButton.addEventListener('click', () => {
        resetJourneyState();
      });
    }

    updateFreeRoamToggle();
  }

  function switchTheme(themeName) {
    if (!themes[themeName] || themeName === activeThemeName) return;

    activeThemeName = themeName;
    activeTheme = themes[activeThemeName];
    storeThemeName(activeThemeName);
    applyThemeDocument();
    applyThemeToScene();
  }

  function initJourneyProgress() {
    if (!journeyStepTrack || !journeyMarkers.length) return;

    journeyStepTrack.innerHTML = journeyMarkers.map((marker, index) => (
      `<button class="journey-step" type="button" data-marker-index="${index}" aria-label="Focus ${marker.title}"></button>`
    )).join('');

    journeyStepTrack.querySelectorAll('.journey-step').forEach((step) => {
      step.addEventListener('click', () => {
        const markerIndex = Number(step.dataset.markerIndex);
        const marker = journeyMarkers[markerIndex];
        if (!marker) return;

        window.location.hash = '#journey';
        moveToPathProgress(marker.progress);
      });
    });

    updateJourneyProgress();
  }

  function initMobileJourneyFallback() {
    if (!mobileMarkerList || !journeyMarkers.length) return;

    mobileMarkerList.innerHTML = journeyMarkers.map((marker, index) => (
      `<article class="mobile-marker-card">
        <h3>${index + 1}. ${marker.title}</h3>
        <p>${marker.description}</p>
        <a href="#${marker.fullProfileAnchor}">View Details</a>
      </article>`
    )).join('');
  }

  function moveToPathProgress(progress) {
    setFreeRoamEnabled(false, { preserveCamera: true });
    pathProgress = THREE.MathUtils.clamp(progress, 0, 1);
    sideOffset = 0;
    hideSectionCard();

    if (path) {
      sectionMarkers.forEach((item) => {
        if (Math.abs(item.section.progress - pathProgress) < 0.01) {
          resetSectionMarker(item);
        }
      });
      updateCameraAlongPath(0);
      updateJourneyProgress();
    }
  }

  function renderRoute() {
    const route = getRouteFromHash();

    showView(route.view);

    if (route.view === 'journey') {
      startJourneyLoop();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    stopJourneyLoop();

    if (route.view === 'profile') {
      window.requestAnimationFrame(() => scrollToProfileAnchor(route.anchor));
      return;
    }

    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }

  function getRouteFromHash() {
    const hash = window.location.hash.replace('#', '');

    if (hash === 'journey') {
      return { view: 'journey' };
    }

    if (hash.startsWith('profile')) {
      return { view: 'profile', anchor: hash };
    }

    return { view: 'landing' };
  }

  function showView(viewName) {
    const previousView = currentView;
    currentView = viewName;
    document.body.dataset.view = viewName;

    appViews.forEach((view) => {
      view.hidden = true;
    });

    if (viewName === 'journey') {
      journeyView.hidden = false;
      if (previousView !== 'journey') {
        resetJourneyState();
      }
      return;
    }

    if (viewName === 'profile') {
      profileView.hidden = false;
      return;
    }

    landingView.hidden = false;
  }

  function resetJourneyMarkers() {
    sectionMarkers.forEach((item) => resetSectionMarker(item));
    hideSectionCard();
    updateJourneyProgress();
  }

  function resetJourneyState() {
    setFreeRoamEnabled(false, { preserveCamera: true });
    keys.clear();
    rideMotion.speed = 0;
    rideMotion.steer = 0;
    sideOffset = 0;
    pathProgress = journeyStartProgress;
    resetJourneyMarkers();
    pauseHorseWalkingAudio();

    if (path) {
      updateCameraAlongPath(0);
      updateHorseRideMotion(0);
    }
  }

  function setFreeRoamEnabled(enabled, options = {}) {
    if (freeRoamEnabled === enabled) {
      updateFreeRoamToggle();
      return;
    }

    freeRoamEnabled = enabled;
    document.body.dataset.freeRoam = enabled ? 'true' : 'false';

    if (enabled) {
      enterFreeRoamFromPath();
    } else if (!options.preserveCamera && path && freePosition.lengthSq() > 0) {
      pathProgress = getNearestTrailProgress(freePosition.x, freePosition.z);
      sideOffset = 0;
      updateCameraAlongPath(0);
    }

    updateFreeRoamToggle();
  }

  function enterFreeRoamFromPath() {
    if (!path) return;

    const point = path.getPointAt(pathProgress);
    const tangent = path.getTangentAt(pathProgress).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    freePosition.copy(point).addScaledVector(side, sideOffset);
    freePosition.y = getTerrainHeight(freePosition.x, freePosition.z) + cameraHeight;
    freeYaw = Math.atan2(-tangent.x, -tangent.z);
    sideOffset = 0;
  }

  function updateFreeRoamToggle() {
    if (!freeRoamToggle) return;

    freeRoamToggle.textContent = freeRoamEnabled ? 'Trail Mode' : 'Free Roam';
    freeRoamToggle.setAttribute('aria-pressed', String(freeRoamEnabled));
    freeRoamToggle.classList.toggle('is-active', freeRoamEnabled);
    freeRoamToggle.title = freeRoamEnabled ? 'Return to guided trail movement' : 'Explore anywhere on the terrain';
  }

  function scrollToProfileAnchor(anchor) {
    const target = anchor ? document.querySelector(`#${anchor}`) : null;

    if (target) {
      target.scrollIntoView({ block: 'start' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function startJourneyLoop() {
    if (!renderer || !rendererReady) return;

    onWindowResize();
    clock.getDelta();
    renderer.setAnimationLoop(animate);
  }

  function stopJourneyLoop() {
    keys.clear();
    hideSectionCard();
    pauseHorseWalkingAudio();

    if (renderer) {
      renderer.setAnimationLoop(null);
    }
  }

  function applyThemeDocument() {
    if (!activeTheme) return;

    document.documentElement.dataset.theme = activeThemeName;

    if (themeStylesheet && themeStylesheet.getAttribute('href') !== activeTheme.css) {
      themeStylesheet.setAttribute('href', activeTheme.css);
    }

    if (activeTheme.cssVars) {
      Object.entries(activeTheme.cssVars).forEach(([property, value]) => {
        document.documentElement.style.setProperty(property, value);
      });
    }

    if (metaTheme) {
      metaTheme.setAttribute('content', activeTheme.meta);
    }

    if (themeToggle) {
      const nextTheme = activeThemeName === 'night' ? 'day' : 'night';
      const nextThemeLabel = themes[nextTheme]?.modeLabel || nextTheme;
      themeToggle.textContent = activeTheme.modeLabel || activeThemeName.toUpperCase();
      themeToggle.title = activeTheme.helperText || '';
      themeToggle.setAttribute('aria-label', `Switch to ${nextThemeLabel}`);
    }

    if (modeHelper) {
      modeHelper.textContent = activeTheme.helperText || '';
    }
  }

  function applyThemeToScene() {
    if (!scene || !activeTheme) return;

    scene.background.setHex(activeTheme.sceneBg);
    scene.fog.color.setHex(activeTheme.fog);
    scene.fog.density = activeTheme.fogDensity ?? 0.0016;
    applyCelestialTheme();
    applyStarFieldTheme();
    applyFlowFogTheme();
    applyHorseTheme();

    if (mesh && data) {
      replaceTerrainTexture();
    }

    sectionMarkers.forEach((item) => {
      applyMarkerTheme(item.marker);
      applyGlowTheme(item.glow);
      item.particles.material.color.setHex(activeTheme.marker.particle);
    });
  }

  function init() {
    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 1, 10000);
    createHorseRiderRig();

    scene = new THREE.Scene();
    scene.add(camera);
    scene.background = new THREE.Color(activeTheme.sceneBg);
    scene.fog = new THREE.FogExp2(activeTheme.fog, activeTheme.fogDensity ?? 0.0016);
    createCelestialObjects();
    createStarFieldObjects();

    data = generateHeight(worldWidth, worldDepth);

    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, worldWidth - 1, worldDepth - 1);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i += 1, j += 3) {
      vertices[j + 1] = data[i] * 10;
    }

    path = createCurvyTerrainPath();
    trailSamples = createTrailSamples();
    texture = createTerrainTexture();

    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
    scene.add(mesh);

    createFlowFogObjects();
    createSectionMarkers();
    updateCameraAlongPath(0);

    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererReady = true;

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onKeyDown(event) {
    if (currentView !== 'journey') return;

    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
      keys.add(key);
      horseAudioBlocked = false;

      if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
        startHorseWalkingAudio();
      }
    }
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());

    if (!keys.has('w') && !keys.has('s') && !keys.has('arrowup') && !keys.has('arrowdown')) {
      pauseHorseWalkingAudio();
    }
  }

  function createCurvyTerrainPath() {
    const points = buildValleyPath();

    points.forEach((point) => {
      point.y = getTerrainHeight(point.x, point.z) + cameraHeight;
    });

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.42);
  }

  function createTrailSamples() {
    const samples = [];
    const sampleCount = 180;

    for (let index = 0; index < sampleCount; index += 1) {
      const progress = index / (sampleCount - 1);
      const point = path.getPointAt(progress);
      samples.push({ x: point.x, z: point.z, progress });
    }

    return samples;
  }

  function getNearestTrailProgress(worldX, worldZ) {
    if (!trailSamples.length) return pathProgress;

    let nearest = trailSamples[0];
    let nearestDistanceSquared = Infinity;

    trailSamples.forEach((sample) => {
      const distanceX = worldX - sample.x;
      const distanceZ = worldZ - sample.z;
      const distanceSquared = distanceX * distanceX + distanceZ * distanceZ;

      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearest = sample;
      }
    });

    return nearest.progress;
  }

  function buildValleyPath() {
    const points = [];
    const zStart = 2350;
    const zEnd = -2450;
    const pointCount = 10;
    let preferredX = -700;

    for (let index = 0; index < pointCount; index += 1) {
      const progress = index / (pointCount - 1);
      const z = THREE.MathUtils.lerp(zStart, zEnd, progress);
      const targetX = Math.sin(progress * Math.PI * 2.35 - 0.8) * 760 + Math.sin(progress * Math.PI * 5.1) * 220;
      const searchCenter = THREE.MathUtils.lerp(preferredX, targetX, 0.58);
      const valleyX = findLowestNearbyX(searchCenter, z);

      preferredX = valleyX;
      points.push(new THREE.Vector3(valleyX, 0, z));
    }

    return points;
  }

  function findLowestNearbyX(centerX, z) {
    let bestX = centerX;
    let bestScore = Infinity;

    for (let step = -9; step <= 9; step += 1) {
      const x = THREE.MathUtils.clamp(centerX + step * 95, -2350, 2350);
      const centerHeight = getTerrainHeight(x, z);
      const leftHeight = getTerrainHeight(x - 260, z);
      const rightHeight = getTerrainHeight(x + 260, z);
      const forwardHeight = getTerrainHeight(x, z - 220);
      const backwardHeight = getTerrainHeight(x, z + 220);
      const surroundingRise = (leftHeight + rightHeight + forwardHeight + backwardHeight) / 4 - centerHeight;
      const score = centerHeight - surroundingRise * 0.85 + Math.abs(x - centerX) * 0.025;

      if (score < bestScore) {
        bestScore = score;
        bestX = x;
      }
    }

    return bestX;
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.04);
    updatePathMovement(delta);
    updateSectionMarkers(delta);
    updateJourneyProgress();
    updateCelestialObjects(delta);
    updateStarField(delta);
    updateFlowFog(delta);
    renderer.render(scene, camera);
  }

  function createCelestialObjects() {
    const glowTexture = createCelestialGlowTexture();

    celestialObjects = {
      sun: createCelestialBody(glowTexture, 'sun'),
      moon: createCelestialBody(glowTexture, 'moon')
    };

    scene.add(celestialObjects.sun.group);
    scene.add(celestialObjects.moon.group);
    applyCelestialTheme();
  }

  function createCelestialBody(glowTexture, type) {
    const group = new THREE.Group();
    const bodyMaterial = type === 'moon'
      ? createMoonMaterial()
      : new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 1,
        depthWrite: false,
        depthTest: true,
        fog: false
      });
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      depthTest: true,
      fog: false,
      blending: THREE.AdditiveBlending
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), bodyMaterial);
    const glow = new THREE.Sprite(glowMaterial);

    body.renderOrder = 3;
    glow.renderOrder = 2;
    group.add(glow, body);

    return { group, body, glow, bodyMaterial, glowMaterial };
  }

  function createMoonMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: false,
      uniforms: {
        baseColor: { value: new THREE.Color(0xe1e1df) },
        opacity: { value: 1 },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        uniform vec3 baseColor;
        uniform float opacity;
        uniform float time;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        void main() {
          vec3 moonColor = baseColor;
          float n = noise(vUv * 8.0 + time * 0.01) * 0.5;
          n += noise(vUv * 20.0) * 0.25;
          n += noise(vUv * 42.0) * 0.1;
          moonColor -= n * 0.12;

          float spots = 0.0;
          spots += smoothstep(0.35, 0.0, length(vUv - vec2(0.30, 0.60))) * 0.25;
          spots += smoothstep(0.20, 0.0, length(vUv - vec2(0.62, 0.42))) * 0.18;
          spots += smoothstep(0.15, 0.0, length(vUv - vec2(0.50, 0.70))) * 0.12;
          spots += smoothstep(0.10, 0.0, length(vUv - vec2(0.22, 0.32))) * 0.10;
          moonColor -= spots * vec3(0.52, 0.50, 0.46);

          float facing = max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          float limb = 1.0 - pow(1.0 - facing, 2.0);
          vec3 lightDir = normalize(vec3(-0.42, 0.58, 0.70));
          float diff = max(dot(vNormal, lightDir), 0.0);
          vec3 lit = moonColor * (0.72 + 0.28 * diff) * (0.78 + 0.22 * limb);

          gl_FragColor = vec4(lit, opacity);
        }
      `
    });
  }

  function createCelestialGlowTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    const context = textureCanvas.getContext('2d');
    const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 128);

    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.18, 'rgba(255,255,255,0.62)');
    gradient.addColorStop(0.52, 'rgba(255,255,255,0.16)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);

    const glowTexture = new THREE.CanvasTexture(textureCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
    return glowTexture;
  }

  function applyCelestialTheme() {
    if (!celestialObjects || !activeTheme?.celestial) return;

    applyCelestialBodyTheme(celestialObjects.sun, activeTheme.celestial.sun);
    applyCelestialBodyTheme(celestialObjects.moon, activeTheme.celestial.moon);
  }

  function applyCelestialBodyTheme(object, config) {
    if (!object || !config) return;

    object.group.visible = Boolean(config.enabled);
    object.body.scale.setScalar(config.size ?? 1);
    object.glow.scale.set(config.glowSize ?? 1, config.glowSize ?? 1, 1);
    if (object.bodyMaterial.uniforms?.baseColor) {
      object.bodyMaterial.uniforms.baseColor.value.setHex(config.color ?? 0xffffff);
      object.bodyMaterial.uniforms.opacity.value = config.opacity ?? 1;
    } else {
      object.bodyMaterial.color.setHex(config.color ?? 0xffffff);
      object.bodyMaterial.opacity = config.opacity ?? 1;
    }
    object.glowMaterial.color.setHex(config.glowColor ?? config.color ?? 0xffffff);
    object.glowMaterial.opacity = config.glowOpacity ?? 0.25;
    object.bodyMaterial.needsUpdate = true;
    object.glowMaterial.needsUpdate = true;
  }

  function updateCelestialObjects(delta) {
    if (!celestialObjects || !activeTheme?.celestial) return;

    Object.entries(celestialObjects).forEach(([name, object]) => {
      const config = activeTheme.celestial[name];
      if (!config?.enabled) return;
      const skyDirection = getSkyDirection(config);
      const skyRadius = config.skyRadius ?? 3600;

      object.group.position.copy(camera.position).addScaledVector(skyDirection, skyRadius);
      object.body.rotation.y += (config.spinSpeed ?? 0) * delta;
      if (object.bodyMaterial.uniforms?.time) {
        object.bodyMaterial.uniforms.time.value = clock.elapsedTime;
      }
      object.body.lookAt(camera.position);
      object.glow.lookAt(camera.position);
    });
  }

  function getSkyDirection(config) {
    if (Array.isArray(config.direction)) {
      return new THREE.Vector3(...config.direction).normalize();
    }

    const azimuth = THREE.MathUtils.degToRad(config.azimuth ?? 0);
    const elevation = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(config.elevation ?? 24, 0, 89));
    const horizontal = Math.cos(elevation);

    return new THREE.Vector3(
      Math.sin(azimuth) * horizontal,
      Math.sin(elevation),
      -Math.cos(azimuth) * horizontal
    ).normalize();
  }

  function createStarFieldObjects() {
    if (starFieldGroup) return;

    const starTexture = createStarTexture();
    starFieldGroup = new THREE.Group();
    starFieldGroup.name = 'night-sky-stars';

    [
      { capacity: 3600, ratio: 0.72, size: 1, opacity: 1, phase: 0.4, glow: false },
      { capacity: 1400, ratio: 0.28, size: 2.45, opacity: 0.38, phase: 2.1, glow: true }
    ].forEach((layer) => {
      const geometry = createStarGeometry(layer.capacity);
      const material = createStarMaterial(starTexture);
      const points = new THREE.Points(geometry, material);

      points.frustumCulled = false;
      starLayers.push({ points, material, ...layer, baseOpacity: 0 });
      starFieldGroup.add(points);
    });

    scene.add(starFieldGroup);
    applyStarFieldTheme();
  }

  function createStarGeometry(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const azimuth = Math.random() * Math.PI * 2;
      const vertical = THREE.MathUtils.lerp(-0.12, 0.98, Math.pow(Math.random(), 0.72));
      const horizontal = Math.sqrt(Math.max(0.01, 1 - vertical * vertical));
      const radiusJitter = 0.94 + Math.random() * 0.12;
      const offset = index * 3;

      positions[offset] = Math.sin(azimuth) * horizontal * radiusJitter;
      positions[offset + 1] = vertical * radiusJitter;
      positions[offset + 2] = -Math.cos(azimuth) * horizontal * radiusJitter;
      sizes[index] = 0.45 + Math.random() * 2.55;
      phases[index] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    return geometry;
  }

  function createStarMaterial(starTexture) {
    return new THREE.ShaderMaterial({
      uniforms: {
        starTexture: { value: starTexture },
        color: { value: new THREE.Color(0xffffff) },
        opacity: { value: 0 },
        baseSize: { value: 1 },
        time: { value: 0 },
        twinkle: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        varying float vPhase;

        uniform float baseSize;
        uniform float time;
        uniform float twinkle;

        void main() {
          vPhase = phase;
          float pulse = 1.0 + sin(time * 1.6 + phase) * twinkle * 0.18;
          gl_PointSize = size * baseSize * pulse;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vPhase;

        uniform sampler2D starTexture;
        uniform vec3 color;
        uniform float opacity;
        uniform float time;
        uniform float twinkle;

        void main() {
          vec4 texel = texture2D(starTexture, gl_PointCoord);
          float shimmer = 1.0 + sin(time * 2.2 + vPhase * 1.7) * twinkle * 0.16;
          gl_FragColor = vec4(color, texel.a * opacity * shimmer);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: false,
      blending: THREE.AdditiveBlending
    });
  }

  function createStarTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 64;
    textureCanvas.height = 64;
    const context = textureCanvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);

    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.18, 'rgba(255,255,255,0.92)');
    gradient.addColorStop(0.48, 'rgba(255,255,255,0.26)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function applyStarFieldTheme() {
    if (!starFieldGroup || !activeTheme?.stars) return;

    const config = activeTheme.stars;
    const visible = Boolean(config.enabled) && config.count > 0 && config.opacity > 0.01;
    const count = THREE.MathUtils.clamp(config.count ?? 0, 0, 5000);
    let allocated = 0;

    starFieldGroup.visible = visible;
    starFieldGroup.scale.setScalar(config.skyRadius ?? 3300);

    starLayers.forEach((layer, index) => {
      const isLast = index === starLayers.length - 1;
      const layerCount = isLast
        ? Math.max(0, count - allocated)
        : Math.min(layer.capacity, Math.round(count * layer.ratio));

      allocated += layerCount;
      layer.points.geometry.setDrawRange(0, Math.min(layer.capacity, layerCount));
      layer.material.uniforms.color.value.setHex(layer.glow ? config.glowColor : config.color);
      layer.material.uniforms.baseSize.value = (config.size ?? 1) * layer.size;
      layer.material.uniforms.twinkle.value = config.twinkle ?? 0;
      layer.baseOpacity = visible
        ? (config.opacity ?? 0) * layer.opacity * (layer.glow ? (config.glow ?? 0) : 1)
        : 0;
      layer.material.uniforms.opacity.value = layer.baseOpacity;
      layer.material.needsUpdate = true;
    });
  }

  function updateStarField() {
    if (!starFieldGroup || !activeTheme?.stars) return;

    starFieldGroup.position.copy(camera.position);

    if (!starFieldGroup.visible) return;

    const twinkle = THREE.MathUtils.clamp(activeTheme.stars.twinkle ?? 0, 0, 1);
    const elapsed = clock.elapsedTime;

    starLayers.forEach((layer, index) => {
      const wave = Math.sin(elapsed * (0.72 + index * 0.19) + layer.phase);
      const shimmer = Math.sin(elapsed * (1.28 + index * 0.22) + layer.phase * 1.7);
      layer.material.uniforms.time.value = elapsed;
      layer.material.uniforms.opacity.value = layer.baseOpacity * (1 + wave * twinkle * 0.12 + shimmer * twinkle * 0.06);
    });
  }

  function createFlowFogObjects() {
    if (!path || flowFogGroup) return;

    const fogTexture = createFlowFogTexture();
    flowFogGroup = new THREE.Group();
    flowFogGroup.name = 'valley-flowing-fog';

    for (let index = 0; index < 34; index += 1) {
      const material = new THREE.SpriteMaterial({
        map: fogTexture,
        color: activeTheme.fogFlow?.color ?? 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        fog: false,
        blending: THREE.NormalBlending
      });
      const sprite = new THREE.Sprite(material);

      sprite.renderOrder = 1;
      sprite.userData.progress = index / 34;
      sprite.userData.phase = Math.random() * Math.PI * 2;
      sprite.userData.lateral = (Math.random() - 0.5) * 0.9;
      sprite.userData.scale = 0.72 + Math.random() * 0.56;
      flowFogSprites.push(sprite);
      flowFogGroup.add(sprite);
    }

    scene.add(flowFogGroup);
    applyFlowFogTheme();
    updateFlowFog(0);
  }

  function createFlowFogTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 512;
    textureCanvas.height = 128;
    const context = textureCanvas.getContext('2d');
    const gradient = context.createRadialGradient(256, 64, 8, 256, 64, 250);

    gradient.addColorStop(0, 'rgba(255,255,255,0.62)');
    gradient.addColorStop(0.22, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.58, 'rgba(255,255,255,0.08)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function applyFlowFogTheme() {
    if (!flowFogSprites.length || !activeTheme?.fogFlow) return;

    const blending = activeThemeName === 'night' ? THREE.AdditiveBlending : THREE.NormalBlending;

    flowFogSprites.forEach((sprite) => {
      sprite.material.color.setHex(activeTheme.fogFlow.color ?? 0xffffff);
      sprite.material.blending = blending;
      sprite.material.needsUpdate = true;
    });
  }

  function updateFlowFog(delta) {
    if (!flowFogGroup || !activeTheme?.fogFlow || !path) return;

    const config = activeTheme.fogFlow;
    const density = THREE.MathUtils.clamp(config.density ?? 0, 0, 1);
    const visibleCount = Math.round(flowFogSprites.length * density);
    const elapsed = clock.elapsedTime;
    const speed = (config.speed ?? 0) * 0.022;
    const baseOpacity = (config.opacity ?? 0) * (0.34 + (config.glow ?? 0) * 0.54);

    flowFogSprites.forEach((sprite, index) => {
      const shouldShow = index < visibleCount && baseOpacity > 0.005;
      sprite.visible = shouldShow;

      if (!shouldShow) {
        sprite.material.opacity = 0;
        return;
      }

      const progress = (sprite.userData.progress + elapsed * speed) % 1;
      const point = path.getPointAt(progress);
      const tangent = path.getTangentAt(progress).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const phase = sprite.userData.phase;
      const wave = Math.sin(elapsed * 0.55 + phase + progress * Math.PI * 4);
      const lateral = (sprite.userData.lateral * 0.42 + wave * 0.1) * (config.spread ?? 300);
      const fade = Math.sin(progress * Math.PI);
      const fogHeight = (config.height ?? 26) + Math.sin(elapsed * 0.42 + phase) * 9;

      sprite.position.copy(point).addScaledVector(side, lateral);
      sprite.position.y = getTerrainHeight(sprite.position.x, sprite.position.z) + fogHeight;
      sprite.scale.set(
        (config.spread ?? 300) * sprite.userData.scale,
        (config.spread ?? 300) * (0.14 + (config.glow ?? 0) * 0.05),
        1
      );
      sprite.material.opacity = baseOpacity * (0.18 + fade * 0.82);
      sprite.material.rotation = wave * 0.18;
    });
  }

  function updateJourneyProgress() {
    if (!journeyMarkers.length) return;

    let activeIndex = 0;
    let closestDistance = Infinity;

    journeyMarkers.forEach((marker, index) => {
      const distance = Math.abs(pathProgress - marker.progress);

      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    currentMarkerIndex = activeIndex;

    if (journeyStepCount) {
      journeyStepCount.textContent = `${activeIndex + 1} / ${journeyMarkers.length}`;
    }

    if (journeyCurrentLabel) {
      journeyCurrentLabel.textContent = journeyMarkers[activeIndex].title;
    }

    if (!journeyStepTrack) return;

    journeyStepTrack.querySelectorAll('.journey-step').forEach((step, index) => {
      step.classList.toggle('is-active', index === activeIndex);
      step.classList.toggle('is-complete', index < activeIndex);
    });
  }

  function updatePathMovement(delta) {
    const forward = keys.has('w') || keys.has('arrowup');
    const backward = keys.has('s') || keys.has('arrowdown');
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');
    const speedTarget = forward ? 1 : backward ? -0.62 : 0;
    const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
    const speedSmoothing = speedTarget === 0 ? 1.8 : 5.8;

    rideMotion.speed = damp(rideMotion.speed, speedTarget, speedSmoothing, delta);
    rideMotion.steer = damp(rideMotion.steer, steerTarget, 8.5, delta);
    rideMotion.phase += (2.4 + Math.abs(rideMotion.speed) * 8.8) * delta;

    if (freeRoamEnabled) {
      updateFreeRoamMovement(delta);
      updateHorseRideMotion(delta);
      return;
    }

    pathProgress += pathSpeed * rideMotion.speed * delta;
    sideOffset -= rideMotion.steer * sideSpeed * delta;

    pathProgress = THREE.MathUtils.clamp(pathProgress, 0, 1);
    sideOffset = THREE.MathUtils.clamp(sideOffset, -160, 160);
    if (!left && !right) {
      sideOffset *= 1 - delta * 1.35;
    }

    updateCameraAlongPath(delta);
    updateHorseRideMotion(delta);
  }

  function updateFreeRoamMovement(delta) {
    const speed01 = THREE.MathUtils.clamp(Math.abs(rideMotion.speed), 0, 1);
    const turnSpeed = 1.15 + speed01 * 0.55;
    const freeMoveSpeed = 780;
    const speedDirection = rideMotion.speed >= -0.04 ? 1 : -0.72;

    freeYaw += rideMotion.steer * turnSpeed * speedDirection * delta;

    const forwardVector = new THREE.Vector3(-Math.sin(freeYaw), 0, -Math.cos(freeYaw));
    freePosition.addScaledVector(forwardVector, freeMoveSpeed * rideMotion.speed * delta);
    freePosition.x = THREE.MathUtils.clamp(freePosition.x, -terrainHalf + 90, terrainHalf - 90);
    freePosition.z = THREE.MathUtils.clamp(freePosition.z, -terrainHalf + 90, terrainHalf - 90);
    pathProgress = getNearestTrailProgress(freePosition.x, freePosition.z);

    updateCameraFreeRoam(delta);
  }

  function updateCameraAlongPath(delta) {
    const point = path.getPointAt(pathProgress);
    const tangent = path.getTangentAt(pathProgress).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const cameraPoint = point.clone().addScaledVector(side, sideOffset);
    const speed01 = THREE.MathUtils.clamp(Math.abs(rideMotion.speed), 0, 1);
    const gaitBob = Math.sin(rideMotion.phase * 2.05) * speed01 * 7.2;
    const canterLift = Math.sin(rideMotion.phase * 4.1) * speed01 * 1.8;
    const saddleSway = Math.sin(rideMotion.phase * 0.92) * speed01 * 5.2;

    cameraPoint.addScaledVector(side, saddleSway);
    cameraPoint.y = getTerrainHeight(cameraPoint.x, cameraPoint.z) + cameraHeight;
    cameraPoint.y += gaitBob + canterLift;

    const nextProgress = THREE.MathUtils.clamp(pathProgress + lookAhead, 0, 1);
    const lookPoint = path.getPointAt(nextProgress);
    lookPoint.addScaledVector(side, sideOffset * 0.16 - rideMotion.steer * 64);
    lookPoint.y = getTerrainHeight(lookPoint.x, lookPoint.z) + cameraHeight * 0.72;
    lookPoint.y += Math.sin(rideMotion.phase * 1.2) * speed01 * 3.4;

    if (delta === 0) {
      camera.position.copy(cameraPoint);
    } else {
      camera.position.lerp(cameraPoint, 1 - Math.pow(0.001, delta));
    }

    camera.lookAt(lookPoint);
    camera.rotateZ(-rideMotion.steer * 0.055 + Math.sin(rideMotion.phase) * speed01 * 0.014);
  }

  function updateCameraFreeRoam(delta) {
    const speed01 = THREE.MathUtils.clamp(Math.abs(rideMotion.speed), 0, 1);
    const forwardVector = new THREE.Vector3(-Math.sin(freeYaw), 0, -Math.cos(freeYaw));
    const side = new THREE.Vector3(-forwardVector.z, 0, forwardVector.x).normalize();
    const gaitBob = Math.sin(rideMotion.phase * 2.05) * speed01 * 7.2;
    const canterLift = Math.sin(rideMotion.phase * 4.1) * speed01 * 1.8;
    const saddleSway = Math.sin(rideMotion.phase * 0.92) * speed01 * 5.2;
    const cameraPoint = freePosition.clone().addScaledVector(side, saddleSway);

    cameraPoint.y = getTerrainHeight(cameraPoint.x, cameraPoint.z) + cameraHeight + gaitBob + canterLift;
    freePosition.y = cameraPoint.y;

    const lookPoint = freePosition.clone()
      .addScaledVector(forwardVector, 760)
      .addScaledVector(side, -rideMotion.steer * 72);
    lookPoint.y = getTerrainHeight(lookPoint.x, lookPoint.z) + cameraHeight * 0.72;
    lookPoint.y += Math.sin(rideMotion.phase * 1.2) * speed01 * 3.4;

    if (delta === 0) {
      camera.position.copy(cameraPoint);
    } else {
      camera.position.lerp(cameraPoint, 1 - Math.pow(0.001, delta));
    }

    camera.lookAt(lookPoint);
    camera.rotateZ(-rideMotion.steer * 0.06 + Math.sin(rideMotion.phase) * speed01 * 0.014);
  }

  function updateHorseRideMotion(delta) {
    if (!horsePivot) return;

    const speed01 = THREE.MathUtils.clamp(Math.abs(rideMotion.speed), 0, 1);
    const walkBounce = Math.sin(rideMotion.phase * 2.05) * speed01;
    const hasStrideInput = keys.has('w') || keys.has('s') || keys.has('arrowup') || keys.has('arrowdown');
    const isWalking = currentView === 'journey' && hasStrideInput && speed01 > 0.055;

    if (horseMixer && isWalking) {
      const animationRate = 0.24 + speed01 * 1.42;
      horseMixer.update(delta * animationRate);
    }

    horsePivot.position.set(
      Math.sin(rideMotion.phase * 0.5) * speed01 * 1.8,
      (activeTheme.horse?.screenYOffset ?? -132) + walkBounce * 1.8,
      (activeTheme.horse?.screenZOffset ?? -176) - speed01 * 8
    );
    horsePivot.rotation.order = 'YXZ';
    horsePivot.rotation.y = -rideMotion.steer * 0.34 + Math.sin(rideMotion.phase * 0.42) * speed01 * 0.018;
    horsePivot.rotation.x = 0.04 + Math.sin(rideMotion.phase * 1.86) * (0.018 + speed01 * 0.045);
    horsePivot.rotation.z = -rideMotion.steer * 0.085 + Math.sin(rideMotion.phase) * speed01 * 0.012;

    applyHorseSteeringPose(speed01);
    syncHorseWalkingAudio(isWalking, speed01);
  }

  function applyHorseTheme() {
    if (horseMaterials) {
      horseMaterials.silhouetteMaterial.color.setHex(activeTheme.horse?.silhouette ?? 0x020509);
      horseMaterials.tackMaterial.color.setHex(activeTheme.horse?.tack ?? 0x101927);
    }

    const forwardGroup = horseModel?.children?.[0];
    const root = forwardGroup?.children?.[0];
    if (!root?.userData?.baseSize) return;

    const baseSize = root.userData.baseSize;
    const targetLength = activeTheme.horse?.scaleLength ?? 148;
    const scale = targetLength / Math.max(baseSize.x, baseSize.y, baseSize.z, 1);
    root.scale.setScalar(scale);
  }

  function createSectionMarkers() {
    journeyMarkers.forEach((section) => {
      const anchor = getPathPoint(section.progress);
      const marker = createLocationMarker(section.markerLabel || section.title);
      const glow = createGlowSprite(260);
      const particles = createDissolveParticles();

      marker.position.copy(anchor).add(new THREE.Vector3(0, 62, 0));
      glow.position.copy(anchor).add(new THREE.Vector3(0, 8, 0));
      particles.position.copy(marker.position);
      glow.rotation.x = -Math.PI / 2;

      marker.visible = false;
      glow.visible = false;
      particles.visible = false;

      scene.add(glow);
      scene.add(marker);
      scene.add(particles);
      sectionMarkers.push({
        section,
        marker,
        glow,
        particles,
        anchor,
        state: 'idle',
        dissolveTime: 0,
        cardShellStarted: false,
        cardMaterialized: false,
        cardContentShown: false
      });
    });
  }

  function createHorseRiderRig() {
    horsePivot = new THREE.Group();
    horseModel = new THREE.Group();

    horsePivot.name = 'first-person-horse-rig';
    horseModel.name = 'first-person-horse-glb';
    horsePivot.rotation.order = 'YXZ';
    camera.add(horsePivot);
    horsePivot.add(horseModel);
    loadHorseModel();
  }

  function loadHorseModel() {
    const loader = new GLTFLoader();

    loader.load(
      'assets/horse/animated_rigged_horse_with_saddle.glb',
      (gltf) => {
        const object = gltf.scene;
        const silhouetteMaterial = new THREE.MeshBasicMaterial({
          color: activeTheme.horse?.silhouette ?? 0x020509,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false
        });
        const tackMaterial = new THREE.MeshBasicMaterial({
          color: activeTheme.horse?.tack ?? 0x101927,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false
        });
        const tackMaterialNames = new Set(['Material', 'Material.008', 'Material.001']);

        object.traverse((child) => {
          if (!child.isMesh) return;
          const originalMaterials = Array.isArray(child.material) ? child.material : [child.material];
          const isTackMesh = originalMaterials.some((material) => tackMaterialNames.has(material?.name));

          child.frustumCulled = false;
          child.castShadow = false;
          child.receiveShadow = false;
          child.renderOrder = isTackMesh ? 43 : 42;
          child.material = isTackMesh ? tackMaterial : silhouetteMaterial;
          child.geometry?.computeVertexNormals?.();
        });

        const box = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        object.position.sub(center);
        object.userData.baseSize = size.clone();
        horseMaterials = { silhouetteMaterial, tackMaterial };

        const targetLength = activeTheme.horse?.scaleLength ?? 148;
        const scale = targetLength / Math.max(size.x, size.y, size.z, 1);
        object.scale.setScalar(scale);
        object.rotation.set(0, Math.PI, 0);
        object.position.set(0, -12, -8);

        const forwardGroup = new THREE.Group();
        forwardGroup.rotation.y = Math.PI / 2;
        forwardGroup.add(object);

        horseModel.clear();
        horseModel.add(forwardGroup);

        if (gltf.animations?.length) {
          horseMixer = new THREE.AnimationMixer(object);
          gltf.animations.forEach((clip) => {
            horseMixer.clipAction(clip).play();
          });
        }

        setupHorseSteeringRig(object);
        applyHorseTheme();
      },
      undefined,
      (error) => {
        console.error('Horse GLB failed to load:', error);
      }
    );
  }

  function setupHorseSteeringRig(object) {
    horseSteeringRig.body = ['spine.008_50', 'spine.009_48']
      .map((name) => object.getObjectByName(name))
      .filter(Boolean);
    horseSteeringRig.neck = ['spine.010_34', 'spine.011_31', 'spine.012_28', 'spine.014_25', 'spine.015_22']
      .map((name) => object.getObjectByName(name))
      .filter(Boolean);
    horseSteeringRig.head = ['spine.016_17', 'skull_6']
      .map((name) => object.getObjectByName(name))
      .filter(Boolean);
    horseSteeringRig.baseQuaternions.clear();

    [...horseSteeringRig.body, ...horseSteeringRig.neck, ...horseSteeringRig.head].forEach((bone) => {
      horseSteeringRig.baseQuaternions.set(bone, bone.quaternion.clone());
    });
  }

  function applyHorseSteeringPose(speed01) {
    const steer = rideMotion.steer;
    const walkNod = Math.sin(rideMotion.phase * 1.72) * speed01;
    const steerIntensity = THREE.MathUtils.clamp(Math.abs(steer), 0, 1);

    horseSteeringRig.body.forEach((bone, index) => {
      setHorseBonePose(
        bone,
        walkNod * 0.012,
        -steer * (0.018 + index * 0.018),
        -steer * (0.038 + index * 0.024)
      );
    });

    horseSteeringRig.neck.forEach((bone, index) => {
      const progress = (index + 1) / horseSteeringRig.neck.length;
      setHorseBonePose(
        bone,
        0.025 + walkNod * 0.018 * progress,
        -steer * (0.018 + progress * 0.03),
        -steer * (0.055 + progress * 0.11)
      );
    });

    horseSteeringRig.head.forEach((bone, index) => {
      setHorseBonePose(
        bone,
        walkNod * 0.024,
        -steer * (0.045 + index * 0.02),
        -steer * (0.16 + index * 0.055) - steer * steerIntensity * 0.035
      );
    });
  }

  function setHorseBonePose(bone, pitch, twist, turn) {
    const baseQuaternion = horseSteeringRig.baseQuaternions.get(bone);
    if (!baseQuaternion) return;

    const turnQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, twist, turn, 'XYZ'));
    bone.quaternion.copy(baseQuaternion).multiply(turnQuaternion);
  }

  function initHorseWalkingAudio() {
    if (horseWalkingAudio) return;

    horseWalkingAudio = new Audio('assets/horse/HorseWalking.mp3');
    horseWalkingAudio.loop = true;
    horseWalkingAudio.preload = 'auto';
    horseWalkingAudio.volume = 0.38;
    horseWalkingAudio.addEventListener('ended', () => {
      horseWalkingAudio.currentTime = 0;
      if (!horseWalkingAudio.paused) return;
      startHorseWalkingAudio();
    });
  }

  function startHorseWalkingAudio() {
    initHorseWalkingAudio();
    horseAudioWanted = true;

    if (!horseWalkingAudio || horseAudioPlayPending || horseAudioBlocked || currentView !== 'journey') return;
    if (!horseWalkingAudio.paused) return;

    horseAudioPlayPending = true;
    horseWalkingAudio.play()
      .then(() => {
        horseAudioBlocked = false;
        if (!horseAudioWanted) {
          pauseHorseWalkingAudio();
        }
      })
      .catch(() => {
        horseAudioBlocked = true;
      })
      .finally(() => {
        horseAudioPlayPending = false;
      });
  }

  function pauseHorseWalkingAudio() {
    horseAudioWanted = false;
    if (!horseWalkingAudio) return;

    horseWalkingAudio.pause();
  }

  function syncHorseWalkingAudio(isWalking, speed01) {
    if (isWalking) {
      initHorseWalkingAudio();
      horseWalkingAudio.playbackRate = THREE.MathUtils.lerp(0.82, 1.12, speed01);
      startHorseWalkingAudio();
      return;
    }

    pauseHorseWalkingAudio();
  }

  function createLocationMarker(label) {
    const group = new THREE.Group();
    const sphereGroup = new THREE.Group();
    const shardData = [];
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: activeTheme.marker.core,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      blending: getThemeBlending(activeTheme.marker.blending)
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: activeTheme.marker.halo,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      blending: getThemeBlending(activeTheme.marker.blending)
    });
    const orbitParticles = createOrbitParticles();

    for (let index = 0; index < 96; index += 1) {
      const phi = Math.acos(1 - 2 * (index + 0.5) / 96);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = 44 + Math.random() * 10;
      const origin = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.sin(phi) * Math.sin(theta) * radius,
        Math.cos(phi) * radius
      );
      const brightness = 0.64 + Math.random() * 0.24;
      const material = new THREE.MeshBasicMaterial({
        color: getShardColor(brightness),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: getThemeBlending(activeTheme.marker.blending)
      });
      const shard = new THREE.Mesh(createShardGeometry(), material);

      shard.position.copy(origin);
      shard.lookAt(0, 0, 0);
      shard.rotateZ(Math.random() * Math.PI * 2);
      sphereGroup.add(shard);

      const explodeDirection = origin.clone().normalize();
      explodeDirection.x += (Math.random() - 0.5) * 0.88;
      explodeDirection.y += (Math.random() - 0.5) * 0.58;
      explodeDirection.z += (Math.random() - 0.5) * 0.88;
      explodeDirection.normalize();

      shardData.push({
        mesh: shard,
        origin,
        originRotation: shard.rotation.clone(),
        originOpacity: 0.38 + Math.random() * 0.26,
        explodeDirection,
        explodeDistance: 220 + Math.random() * 420,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        delay: Math.random() * 0.34,
        brightness
      });
    }

    sphereGroup.add(new THREE.Mesh(new THREE.SphereGeometry(34, 24, 24), coreMaterial));
    sphereGroup.add(new THREE.Mesh(new THREE.SphereGeometry(86, 32, 32), haloMaterial));
    sphereGroup.add(orbitParticles);

    const labelSprite = createTextSprite(label, {
      width: 420,
      height: 120,
      fontSize: 38,
      fontWeight: 900,
      textColor: activeTheme.marker.labelText,
      background: activeTheme.marker.labelBackground
    });

    labelSprite.position.y = 132;
    labelSprite.position.z = 0;
    labelSprite.scale.set(84, 24, 1);
    labelSprite.renderOrder = 20;
    group.add(sphereGroup, labelSprite);
    group.userData.fadeMaterials = [labelSprite.material, coreMaterial, haloMaterial, orbitParticles.material];
    group.userData.sphereGroup = sphereGroup;
    group.userData.shards = shardData;
    group.userData.coreMaterial = coreMaterial;
    group.userData.haloMaterial = haloMaterial;
    group.userData.orbitParticles = orbitParticles;
    group.userData.labelSprite = labelSprite;
    group.userData.labelText = label;
    return group;
  }

  function createShardGeometry() {
    const sides = 3 + Math.floor(Math.random() * 3);
    const radius = 10 + Math.random() * 14;
    const points = [];
    const vertices = [];

    for (let index = 0; index < sides; index += 1) {
      const angle = index / sides * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      points.push(
        Math.cos(angle) * radius * (0.7 + Math.random() * 0.6),
        Math.sin(angle) * radius * (0.7 + Math.random() * 0.6),
        (Math.random() - 0.5) * 4
      );
    }

    for (let index = 1; index < sides - 1; index += 1) {
      vertices.push(
        points[0], points[1], points[2],
        points[index * 3], points[index * 3 + 1], points[index * 3 + 2],
        points[(index + 1) * 3], points[(index + 1) * 3 + 1], points[(index + 1) * 3 + 2]
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  function createOrbitParticles() {
    const count = 90;
    const positions = new Float32Array(count * 3);
    const angles = [];
    const elevations = [];
    const radii = [];
    const speeds = [];

    for (let index = 0; index < count; index += 1) {
      angles.push(Math.random() * Math.PI * 2);
      elevations.push((Math.random() - 0.5) * Math.PI * 0.72);
      radii.push(86 + Math.random() * 80);
      speeds.push((Math.random() - 0.5) * 0.9);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: activeTheme.marker.orbit,
      size: 3,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: getThemeBlending(activeTheme.marker.blending)
    });
    const particles = new THREE.Points(geometry, material);
    particles.userData.angles = angles;
    particles.userData.elevations = elevations;
    particles.userData.radii = radii;
    particles.userData.speeds = speeds;
    return particles;
  }

  function createGlowSprite(size) {
    const glowTexture = createGlowTexture();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    glow.scale.set(size, size, 1);
    return glow;
  }

  function createGlowTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    const context = textureCanvas.getContext('2d');
    const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 128);
    activeTheme.marker.glowStops.forEach((stop, index) => {
      gradient.addColorStop(index === 0 ? 0 : index === 1 ? 0.28 : 1, stop);
    });
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);

    const glowTexture = new THREE.CanvasTexture(textureCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
    return glowTexture;
  }

  function createDissolveParticles() {
    const count = 520;
    const positions = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const i = index * 3;
      const radius = 28 + Math.random() * 56;
      const theta = Math.random() * Math.PI * 2;
      const y = -80 + Math.random() * 165;

      basePositions[i] = Math.cos(theta) * radius;
      basePositions[i + 1] = y;
      basePositions[i + 2] = Math.sin(theta) * radius;
      positions[i] = basePositions[i];
      positions[i + 1] = basePositions[i + 1];
      positions[i + 2] = basePositions[i + 2];

      velocities[i] = 120 + Math.random() * 360;
      velocities[i + 1] = -28 + Math.random() * 190;
      velocities[i + 2] = -180 + Math.random() * 360;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: activeTheme.marker.particle,
      size: 4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const particles = new THREE.Points(geometry, material);
    particles.userData.basePositions = basePositions;
    particles.userData.velocities = velocities;
    return particles;
  }

  function createTextSprite(text, options) {
    const textTexture = createTextTexture(text, options);
    return new THREE.Sprite(new THREE.SpriteMaterial({
      map: textTexture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false
    }));
  }

  function createTextTexture(text, options) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = options.width;
    textureCanvas.height = options.height;
    const context = textureCanvas.getContext('2d');
    context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    context.fillStyle = options.background;
    roundedRect(context, 16, 20, textureCanvas.width - 32, textureCanvas.height - 40, 24);
    context.fill();
    context.fillStyle = options.textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${options.fontWeight} ${options.fontSize}px Inter, Arial, sans-serif`;
    context.fillText(text, textureCanvas.width / 2, textureCanvas.height / 2 + 4);

    const textTexture = new THREE.CanvasTexture(textureCanvas);
    textTexture.colorSpace = THREE.SRGBColorSpace;
    return textTexture;
  }

  function applyMarkerTheme(marker) {
    marker.userData.coreMaterial.color.setHex(activeTheme.marker.core);
    marker.userData.haloMaterial.color.setHex(activeTheme.marker.halo);
    marker.userData.orbitParticles.material.color.setHex(activeTheme.marker.orbit);

    const blending = getThemeBlending(activeTheme.marker.blending);
    setMaterialBlending(marker.userData.coreMaterial, blending);
    setMaterialBlending(marker.userData.haloMaterial, blending);
    setMaterialBlending(marker.userData.orbitParticles.material, blending);

    marker.userData.shards.forEach((shard) => {
      shard.mesh.material.color.copy(getShardColor(shard.brightness));
      setMaterialBlending(shard.mesh.material, blending);
    });

    const labelTexture = createTextTexture(marker.userData.labelText, {
      width: 420,
      height: 120,
      fontSize: 38,
      fontWeight: 900,
      textColor: activeTheme.marker.labelText,
      background: activeTheme.marker.labelBackground
    });
    const previousTexture = marker.userData.labelSprite.material.map;
    marker.userData.labelSprite.material.map = labelTexture;
    marker.userData.labelSprite.material.needsUpdate = true;
    previousTexture.dispose();
  }

  function getThemeBlending(blendingName) {
    return blendingName === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
  }

  function setMaterialBlending(material, blending) {
    if (material.blending === blending) return;

    material.blending = blending;
    material.needsUpdate = true;
  }

  function applyGlowTheme(glow) {
    const previousTexture = glow.material.map;
    glow.material.map = createGlowTexture();
    glow.material.needsUpdate = true;
    previousTexture.dispose();
  }

  function getShardColor(brightness) {
    const [red, green, blue] = activeTheme.marker.shard;

    return new THREE.Color(
      THREE.MathUtils.clamp(red * brightness, 0, 1),
      THREE.MathUtils.clamp(green * brightness, 0, 1),
      THREE.MathUtils.clamp(blue * brightness, 0, 1)
    );
  }

  function updateSectionMarkers(delta) {
    sectionMarkers.forEach((item) => {
      const distance = camera.position.distanceTo(item.anchor);
      const markerOpacity = THREE.MathUtils.clamp(1 - (distance - 360) / 1250, 0.08, 1);
      const pulse = 0.94 + Math.sin(clock.elapsedTime * 2.6 + item.section.progress * 12) * 0.06;

      if (item.state === 'dissolved' && distance > 320) {
        resetSectionMarker(item);
      }

      if (item.state === 'idle' && distance < 125) {
        activateSectionMarker(item);
      }

      const dissolveProgress = item.state === 'idle' ? 0 : THREE.MathUtils.clamp(item.dissolveTime / 1.9, 0, 1);
      const visibleMarkerOpacity = markerOpacity * (1 - dissolveProgress);
      const themedMarkerOpacity = visibleMarkerOpacity * (activeTheme.marker.opacityFactor ?? 1);

      item.marker.visible = visibleMarkerOpacity > 0.02;
      item.glow.visible = visibleMarkerOpacity > 0.02;
      item.marker.lookAt(camera.position);
      item.marker.scale.setScalar(pulse * 0.72);
      updatePowerSphereIdle(item.marker, themedMarkerOpacity, delta);

      item.marker.userData.fadeMaterials.forEach((material, index) => {
        const base = index === 0 ? 0.82 : index === 1 ? 0.18 : index === 2 ? 0.07 : 0.36;
        const modeFactor = index === 3 ? activeTheme.marker.orbitFactor ?? 1 : 1;
        material.opacity = themedMarkerOpacity * base * modeFactor;
      });
      item.glow.material.opacity = themedMarkerOpacity * 0.28 * (activeTheme.marker.glowFactor ?? 1);

      if (item.state !== 'idle') {
        item.dissolveTime += delta;
        updatePowerSphereDissolve(item.marker, dissolveProgress, markerOpacity * (activeTheme.marker.opacityFactor ?? 1));
        updateDissolveParticles(item, dissolveProgress);
      }
    });
  }

  function resetSectionMarker(item) {
    item.state = 'idle';
    item.dissolveTime = 0;
    item.cardShellStarted = false;
    item.cardMaterialized = false;
    item.cardContentShown = false;
    item.particles.visible = false;
  }

  function updatePowerSphereIdle(marker, opacity, delta) {
    const sphereGroup = marker.userData.sphereGroup;
    const orbitParticles = marker.userData.orbitParticles;
    const positions = orbitParticles.geometry.attributes.position.array;
    const { angles, elevations, radii, speeds } = orbitParticles.userData;

    sphereGroup.rotation.y += delta * 0.38;
    sphereGroup.rotation.x = Math.sin(clock.elapsedTime * 0.48) * 0.12;

    marker.userData.shards.forEach((shard) => {
      shard.mesh.position.copy(shard.origin);
      shard.mesh.rotation.copy(shard.originRotation);
      shard.mesh.material.opacity = shard.originOpacity * opacity;
    });

    for (let index = 0; index < angles.length; index += 1) {
      angles[index] += speeds[index] * delta;
      positions[index * 3] = Math.cos(angles[index]) * Math.cos(elevations[index]) * radii[index];
      positions[index * 3 + 1] = Math.sin(elevations[index]) * radii[index];
      positions[index * 3 + 2] = Math.sin(angles[index]) * Math.cos(elevations[index]) * radii[index];
    }
    orbitParticles.geometry.attributes.position.needsUpdate = true;
  }

  function updatePowerSphereDissolve(marker, progress, opacity) {
    const easedPosition = progress * progress * progress;
    const easedOpacity = 1 - Math.pow(1 - progress, 3);

    marker.userData.shards.forEach((shard) => {
      const localProgress = THREE.MathUtils.clamp((progress - shard.delay) / (1 - shard.delay), 0, 1);
      const localPosition = localProgress * localProgress * localProgress;
      const localOpacity = 1 - Math.pow(1 - localProgress, 3);
      shard.mesh.position.copy(shard.origin).addScaledVector(shard.explodeDirection, shard.explodeDistance * localPosition);
      shard.mesh.position.x += localPosition * 150;
      shard.mesh.rotation.set(
        shard.originRotation.x + shard.spin.x * localPosition,
        shard.originRotation.y + shard.spin.y * localPosition,
        shard.originRotation.z + shard.spin.z * localPosition
      );
      shard.mesh.material.opacity = shard.originOpacity * opacity * (1 - localOpacity);
    });

    marker.userData.coreMaterial.opacity = 0.18 * opacity * (1 - easedOpacity);
    marker.userData.haloMaterial.opacity = 0.07 * opacity * (1 - easedOpacity);
    marker.userData.orbitParticles.material.opacity = 0.36 * opacity * (1 - easedPosition) * (activeTheme.marker.orbitFactor ?? 1);
  }

  function activateSectionMarker(item) {
    item.state = 'dissolving';
    item.dissolveTime = 0;
    item.cardShellStarted = false;
    item.cardMaterialized = false;
    item.cardContentShown = false;
    item.particles.visible = true;
    item.particles.material.opacity = 0.56 * (activeTheme.marker.opacityFactor ?? 1) * (activeTheme.marker.particleFactor ?? 1);
  }

  function updateDissolveParticles(item, progress) {
    const positions = item.particles.geometry.attributes.position.array;
    const base = item.particles.userData.basePositions;
    const velocities = item.particles.userData.velocities;
    const windCurve = Math.sin(progress * Math.PI);
    const cardProgress = THREE.MathUtils.smoothstep(progress, 0.28, 1);
    const cardWorld = screenTargetToWorld(cardTargetNdc);
    const cardLocal = item.particles.worldToLocal(cardWorld.clone());
    const time = progress * 1.5;

    for (let index = 0; index < positions.length; index += 3) {
      const burstX = base[index] + velocities[index] * time + windCurve * 80;
      const burstY = base[index + 1] + velocities[index + 1] * time + Math.sin(progress * 8 + index) * 26;
      const burstZ = base[index + 2] + velocities[index + 2] * time + Math.cos(progress * 7 + index) * 24;
      const particleDelay = (index % 17) / 17 * 0.18;
      const localCardProgress = THREE.MathUtils.clamp((cardProgress - particleDelay) / (1 - particleDelay), 0, 1);

      positions[index] = THREE.MathUtils.lerp(burstX, cardLocal.x, localCardProgress);
      positions[index + 1] = THREE.MathUtils.lerp(burstY, cardLocal.y, localCardProgress);
      positions[index + 2] = THREE.MathUtils.lerp(burstZ, cardLocal.z, localCardProgress);
    }

    item.particles.geometry.attributes.position.needsUpdate = true;
    item.particles.material.opacity = (
      Math.sin(progress * Math.PI) * 0.46 + Math.pow(1 - progress, 1.6) * 0.1
    ) * (activeTheme.marker.opacityFactor ?? 1) * (activeTheme.marker.particleFactor ?? 1);

    if (!item.cardShellStarted && progress > 0.34) {
      item.cardShellStarted = true;
      prepareSectionCard(item.section);
    }

    if (!item.cardMaterialized && progress > 0.62) {
      item.cardMaterialized = true;
      materializeSectionCard();
    }

    if (!item.cardContentShown && progress > 0.78) {
      item.cardContentShown = true;
      revealSectionCardContent();
    }

    if (progress >= 1) {
      item.state = 'dissolved';
      item.marker.visible = false;
      item.glow.visible = false;
      item.particles.visible = false;
    }
  }

  function prepareSectionCard(section) {
    const markerIndex = Math.max(journeyMarkers.findIndex((marker) => marker.id === section.id), 0);
    sectionCardKicker.textContent = `STEP ${markerIndex + 1} / ${journeyMarkers.length}`;
    sectionCardTitle.textContent = section.heading;
    sectionCardSummary.textContent = section.description;
    sectionCardList.innerHTML = section.bullets.map((line) => `<li>${line}</li>`).join('');
    sectionCardAction.textContent = 'View Details';
    sectionCardAction.href = `#${section.fullProfileAnchor}`;
    sectionCardElement.classList.remove('is-building', 'is-materialized', 'is-content-visible');
    sectionCardElement.hidden = false;
    window.requestAnimationFrame(() => sectionCardElement.classList.add('is-building'));
  }

  function hideSectionCard() {
    if (!sectionCardElement) return;

    sectionCardElement.classList.remove('is-building', 'is-materialized', 'is-content-visible');
    sectionCardElement.hidden = true;
  }

  function materializeSectionCard() {
    sectionCardElement.classList.add('is-materialized');
  }

  function revealSectionCardContent() {
    sectionCardElement.classList.add('is-content-visible');
  }

  function screenTargetToWorld(targetNdc) {
    const world = targetNdc.clone().unproject(camera);
    return world;
  }

  function getPathPoint(progress) {
    const point = path.getPointAt(progress);
    const anchor = point.clone();
    anchor.y = getTerrainHeight(anchor.x, anchor.z);
    return anchor;
  }

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function getTerrainHeight(worldX, worldZ) {
    const gridX = THREE.MathUtils.clamp(((worldX + terrainHalf) / terrainSize) * (worldWidth - 1), 0, worldWidth - 1);
    const gridZ = THREE.MathUtils.clamp(((worldZ + terrainHalf) / terrainSize) * (worldDepth - 1), 0, worldDepth - 1);
    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(x0 + 1, worldWidth - 1);
    const z1 = Math.min(z0 + 1, worldDepth - 1);
    const tx = gridX - x0;
    const tz = gridZ - z0;
    const h00 = data[z0 * worldWidth + x0] * 10;
    const h10 = data[z0 * worldWidth + x1] * 10;
    const h01 = data[z1 * worldWidth + x0] * 10;
    const h11 = data[z1 * worldWidth + x1] * 10;

    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(h00, h10, tx),
      THREE.MathUtils.lerp(h01, h11, tx),
      tz
    );
  }

  function generateHeight(width, height) {
    let seed = Math.PI / 4;

    window.Math.random = function () {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const size = width * height;
    const heightData = new Uint8Array(size);
    const perlin = new ImprovedNoise();
    const z = Math.random() * 100;

    let quality = 1;

    for (let j = 0; j < 4; j += 1) {
      for (let i = 0; i < size; i += 1) {
        const x = i % width;
        const y = ~~(i / width);

        heightData[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);
      }

      quality *= 5;
    }

    return heightData;
  }

  function createTerrainTexture() {
    const terrainTexture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
    terrainTexture.wrapS = THREE.ClampToEdgeWrapping;
    terrainTexture.wrapT = THREE.ClampToEdgeWrapping;
    terrainTexture.colorSpace = THREE.SRGBColorSpace;
    return terrainTexture;
  }

  function replaceTerrainTexture() {
    const nextTexture = createTerrainTexture();
    texture.dispose();
    texture = nextTexture;
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
  }

  function getTerrainPaletteColor(heightValue) {
    if (activeTheme.terrain?.paletteStops?.length) {
      const heightNorm = THREE.MathUtils.clamp(heightValue / 255, 0, 1);
      const stops = activeTheme.terrain.paletteStops;

      for (let index = 1; index < stops.length; index += 1) {
        const previous = stops[index - 1];
        const next = stops[index];

        if (heightNorm <= next.at) {
          const alpha = THREE.MathUtils.smoothstep(heightNorm, previous.at, next.at);
          return mixPaletteColor(previous.color, next.color, alpha);
        }
      }

      return stops[stops.length - 1].color;
    }

    const { shadow, mid, high, snow } = activeTheme.terrain;
    const heightNorm = THREE.MathUtils.clamp(heightValue / 255, 0, 1);

    if (heightNorm < 0.58) {
      return mixPaletteColor(shadow, mid, THREE.MathUtils.smoothstep(heightNorm, 0.08, 0.58));
    }

    if (heightNorm < 0.84) {
      return mixPaletteColor(mid, high, THREE.MathUtils.smoothstep(heightNorm, 0.58, 0.84));
    }

    return mixPaletteColor(high, snow, THREE.MathUtils.smoothstep(heightNorm, 0.84, 1));
  }

  function mixPaletteColor(from, to, alpha) {
    return [
      THREE.MathUtils.lerp(from[0], to[0], alpha),
      THREE.MathUtils.lerp(from[1], to[1], alpha),
      THREE.MathUtils.lerp(from[2], to[2], alpha)
    ];
  }

  function getTrailBlend(worldX, worldZ) {
    if (!trailSamples.length || !activeTheme.trail) {
      return { core: 0, edge: 0, total: 0 };
    }

    let nearestDistanceSquared = Infinity;

    trailSamples.forEach((sample) => {
      const distanceX = worldX - sample.x;
      const distanceZ = worldZ - sample.z;
      const distanceSquared = distanceX * distanceX + distanceZ * distanceZ;

      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
      }
    });

    const distance = Math.sqrt(nearestDistanceSquared);
    const { width: trailWidth, falloff, coreRatio = 0.42 } = activeTheme.trail;

    if (distance > falloff) {
      return { core: 0, edge: 0, total: 0 };
    }

    const core = 1 - THREE.MathUtils.smoothstep(distance, trailWidth * coreRatio, trailWidth);
    const shoulder = 1 - THREE.MathUtils.smoothstep(distance, trailWidth, falloff);
    const edge = shoulder * (1 - core);

    return {
      core,
      edge,
      total: Math.max(core, edge)
    };
  }

  function clampByte(value) {
    return THREE.MathUtils.clamp(Math.round(value), 0, 255);
  }

  function damp(value, target, smoothing, delta) {
    return THREE.MathUtils.lerp(value, target, 1 - Math.exp(-smoothing * delta));
  }

  function generateTexture(heightData, width, height) {
    let context;
    let image;
    let imageData;
    let shade;

    const vector3 = new THREE.Vector3(0, 0, 0);
    const lighting = activeTheme.terrain?.lighting || {};
    const sunDirection = lighting.sunDirection || [1, 1, 1];
    const sun = new THREE.Vector3(...sunDirection);
    sun.normalize();

    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = width;
    textureCanvas.height = height;

    context = textureCanvas.getContext('2d');
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);

    image = context.getImageData(0, 0, textureCanvas.width, textureCanvas.height);
    imageData = image.data;

    for (let i = 0, j = 0, l = imageData.length; i < l; i += 4, j += 1) {
      const leftHeight = heightData[Math.max(j - 2, 0)];
      const rightHeight = heightData[Math.min(j + 2, heightData.length - 1)];
      const nearHeight = heightData[Math.max(j - width * 2, 0)];
      const farHeight = heightData[Math.min(j + width * 2, heightData.length - 1)];

      vector3.x = leftHeight - rightHeight;
      vector3.y = 2;
      vector3.z = nearHeight - farHeight;
      vector3.normalize();

      shade = vector3.dot(sun);

      const terrainX = j % width;
      const terrainZ = ~~(j / width);
      const worldX = terrainX / (width - 1) * terrainSize - terrainHalf;
      const worldZ = terrainZ / (height - 1) * terrainSize - terrainHalf;
      const trailBlend = getTrailBlend(worldX, worldZ);
      const baseColor = getTerrainPaletteColor(heightData[j]);
      const shadowFloor = lighting.shadowFloor ?? (activeThemeName === 'night' ? 0.27 : 0.42);
      const shadow = THREE.MathUtils.clamp(shade, shadowFloor, 1);
      const light = (lighting.lightBase ?? 0.6) + shadow * (lighting.lightStrength ?? 0.5);
      const haze = THREE.MathUtils.smoothstep(
        heightData[j] / 255,
        lighting.hazeStart ?? 0.42,
        lighting.hazeEnd ?? 0.88
      ) * (lighting.hazeAmount ?? 8);
      let litColor = [
        baseColor[0] * light + haze,
        baseColor[1] * light + haze,
        baseColor[2] * light + haze
      ];

      if (trailBlend.total > 0) {
        const centerStrength = trailBlend.core * activeTheme.trail.strength;
        const edgeStrength = trailBlend.edge * (activeTheme.trail.edgeStrength ?? activeTheme.trail.strength * 0.5);

        litColor = mixPaletteColor(litColor, activeTheme.trail.surface, centerStrength);

        if (activeTheme.trail.edge) {
          litColor = mixPaletteColor(litColor, activeTheme.trail.edge, edgeStrength);
        }
      }

      imageData[i] = clampByte(litColor[0]);
      imageData[i + 1] = clampByte(litColor[1]);
      imageData[i + 2] = clampByte(litColor[2]);
    }

    context.putImageData(image, 0, 0);

    const canvasScaled = document.createElement('canvas');
    canvasScaled.width = width * 4;
    canvasScaled.height = height * 4;

    context = canvasScaled.getContext('2d');
    context.scale(4, 4);
    context.drawImage(textureCanvas, 0, 0);

    image = context.getImageData(0, 0, canvasScaled.width, canvasScaled.height);
    imageData = image.data;

    const surfaceNoise = activeTheme.terrain?.lighting?.surfaceNoise ?? 5;

    for (let i = 0, l = imageData.length; i < l; i += 4) {
      const v = ~~(Math.random() * surfaceNoise);

      imageData[i] += v;
      imageData[i + 1] += v;
      imageData[i + 2] += v;
    }

    context.putImageData(image, 0, 0);

    return canvasScaled;
  }

  function getStoredThemeName() {
    try {
      return window.localStorage.getItem('portfolio-theme');
    } catch (error) {
      return null;
    }
  }

  function storeThemeName(themeName) {
    try {
      window.localStorage.setItem('portfolio-theme', themeName);
    } catch (error) {
      return null;
    }
  }
}).catch((error) => {
  console.error('Unable to load the 3D terrain engine.', error);
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div class="load-error" role="alert"><strong>3D terrain could not load.</strong><br>Please check your internet connection or run this site from a local server.</div>'
  );
});
