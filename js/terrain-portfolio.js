Promise.all([
  import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js'),
  import('https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/math/ImprovedNoise.js')
]).then(([THREE, { ImprovedNoise }]) => {
  const canvas = document.querySelector('#terrain-canvas');
  const sectionCardElement = document.querySelector('#section-card');
  const sectionCardKicker = document.querySelector('#section-card-kicker');
  const sectionCardTitle = document.querySelector('#section-card-title');
  const sectionCardSummary = document.querySelector('#section-card-summary');
  const sectionCardList = document.querySelector('#section-card-list');
  const sectionCardAction = document.querySelector('#section-card-action');
  const themes = window.PORTFOLIO_THEMES || {};
  const themeStylesheet = document.querySelector('#theme-stylesheet');
  const themeToggle = document.querySelector('#theme-toggle');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const cardTargetNdc = new THREE.Vector3(0.68, 0.08, 0.58);
  const worldWidth = 256;
  const worldDepth = 256;
  const terrainSize = 7500;
  const terrainHalf = terrainSize / 2;
  const pathSpeed = 0.018;
  const sideSpeed = 260;
  const cameraHeight = 105;
  const lookAhead = 0.026;

  let camera;
  let scene;
  let renderer;
  let mesh;
  let texture;
  let path;
  let valleyTrail;
  let pathProgress = 0.18;
  let sideOffset = 0;
  let data;
  const storedThemeName = getStoredThemeName();
  let activeThemeName = themes[storedThemeName] ? storedThemeName : 'day';
  let activeTheme = themes[activeThemeName] || themes.day;
  const sectionMarkers = [];
  const clock = new THREE.Clock();
  const keys = new Set();
  const sections = [
    {
      title: 'PROJECTS',
      progress: 0.26,
      kicker: 'SECTION: PROJECTS',
      heading: 'Projects',
      summary: 'Selected builds and experiments from Android, automation, and web portfolio work.',
      lines: ['LittlePhone · Android finding app', 'Portfolio · interactive terrain site', 'ShareQuote · Python automation', 'AnimalX · injured animal tracking'],
      action: 'VIEW PROJECTS',
      href: '#'
    },
    {
      title: 'ABOUT',
      progress: 0.39,
      kicker: 'SECTION: ABOUT ME',
      heading: 'Jitender Singh Chhapola',
      summary: 'Software Developer with 3+ years of full-stack experience across Java, Spring Boot, Angular, Node.js, MongoDB, Kafka, and Docker.',
      lines: ['Backend-heavy full-stack developer', 'Builds scalable microservices', 'Comfortable across product and platform work'],
      action: 'CONTACT ME',
      href: 'mailto:niteshjitender@gmail.com?subject=Portfolio%20Opportunity%20for%20Jitender'
    },
    {
      title: 'ACHIEVEMENTS',
      progress: 0.54,
      kicker: 'SECTION: ACHIEVEMENTS',
      heading: 'Achievements',
      summary: 'Coding practice, certifications, and professional growth milestones.',
      lines: ['LeetCode 250+ problems', 'InterviewBit 6895+ score', 'Android, SQL, and Web Scraping certifications'],
      action: 'VIEW DETAILS',
      href: '#'
    },
    {
      title: 'EXTRACURRICULAR',
      progress: 0.68,
      kicker: 'SECTION: EXTRACURRICULAR',
      heading: 'Extracurricular',
      summary: 'Competitive events and activities beyond software engineering.',
      lines: ['KVS Science National participant', 'KVS National Sports Meet · Judo', 'Inter-NIT Sports Meet · High Jump'],
      action: 'SEE MORE',
      href: '#'
    },
    {
      title: 'CONTACT',
      progress: 0.82,
      kicker: 'SECTION: CONTACT',
      heading: 'Contact',
      summary: 'Reach out for roles, collaboration, or a quick technical conversation.',
      lines: ['niteshjitender@gmail.com', '+91-8901567825', 'LinkedIn · GitHub · X'],
      action: 'CONTACT ME',
      href: 'mailto:niteshjitender@gmail.com?subject=Portfolio%20Opportunity%20for%20Jitender'
    }
  ];

  initThemeControls();
  init();

  function initThemeControls() {
    applyThemeDocument();

    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
      const nextTheme = activeThemeName === 'night' ? 'day' : 'night';
      switchTheme(nextTheme);
    });
  }

  function switchTheme(themeName) {
    if (!themes[themeName] || themeName === activeThemeName) return;

    activeThemeName = themeName;
    activeTheme = themes[activeThemeName];
    storeThemeName(activeThemeName);
    applyThemeDocument();
    applyThemeToScene();
  }

  function applyThemeDocument() {
    if (!activeTheme) return;

    document.documentElement.dataset.theme = activeThemeName;

    if (themeStylesheet && themeStylesheet.getAttribute('href') !== activeTheme.css) {
      themeStylesheet.setAttribute('href', activeTheme.css);
    }

    if (metaTheme) {
      metaTheme.setAttribute('content', activeTheme.meta);
    }

    if (themeToggle) {
      const nextThemeLabel = activeThemeName === 'night' ? 'day' : 'night';
      themeToggle.textContent = nextThemeLabel.toUpperCase();
      themeToggle.setAttribute('aria-label', `Switch to ${nextThemeLabel} theme`);
    }
  }

  function applyThemeToScene() {
    if (!scene || !activeTheme) return;

    scene.background.setHex(activeTheme.sceneBg);
    scene.fog.color.setHex(activeTheme.fog);

    if (mesh && data) {
      replaceTerrainTexture();
    }

    applyValleyTrailTheme();

    sectionMarkers.forEach((item) => {
      applyMarkerTheme(item.marker);
      applyGlowTheme(item.glow);
      item.particles.material.color.setHex(activeTheme.marker.particle);
    });
  }

  function init() {
    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 1, 10000);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(activeTheme.sceneBg);
    scene.fog = new THREE.FogExp2(activeTheme.fog, 0.0025);

    data = generateHeight(worldWidth, worldDepth);

    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, worldWidth - 1, worldDepth - 1);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i += 1, j += 3) {
      vertices[j + 1] = data[i] * 10;
    }

    path = createCurvyTerrainPath();
    texture = createTerrainTexture();

    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
    scene.add(mesh);

    valleyTrail = createValleyTrail();
    scene.add(valleyTrail);
    createSectionMarkers();
    updateCameraAlongPath(0);

    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);

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
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
      keys.add(key);
    }
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function createCurvyTerrainPath() {
    const points = buildValleyPath();

    points.forEach((point) => {
      point.y = getTerrainHeight(point.x, point.z) + cameraHeight;
    });

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.42);
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

  function createValleyTrail() {
    const group = new THREE.Group();
    const glow = createTrailMesh(260, 7, activeTheme.trail.glow, activeTheme.trail.glowOpacity, THREE.AdditiveBlending);
    const surface = createTrailMesh(132, 10, activeTheme.trail.surface, activeTheme.trail.surfaceOpacity, THREE.NormalBlending);
    const highlight = createTrailMesh(42, 13, activeTheme.trail.edge, activeTheme.trail.edgeOpacity, THREE.AdditiveBlending);

    glow.renderOrder = 1;
    surface.renderOrder = 2;
    highlight.renderOrder = 3;
    group.add(glow, surface, highlight);
    group.userData.glow = glow;
    group.userData.surface = surface;
    group.userData.highlight = highlight;
    return group;
  }

  function createTrailMesh(width, heightOffset, color, opacity, blending) {
    const lengthSegments = 150;
    const widthSegments = 8;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let row = 0; row <= lengthSegments; row += 1) {
      const progress = row / lengthSegments;
      const center = path.getPointAt(progress);
      const tangent = path.getTangentAt(progress).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const taper = 0.5 + Math.sin(progress * Math.PI) * 0.5;
      const localWidth = width * (0.42 + taper * 0.58);

      for (let column = 0; column <= widthSegments; column += 1) {
        const lateral = (column / widthSegments - 0.5) * localWidth;
        const point = center.clone().addScaledVector(side, lateral);
        const edgeDistance = Math.abs(column / widthSegments - 0.5) * 2;
        const crown = (1 - edgeDistance) * 4;

        point.y = getTerrainHeight(point.x, point.z) + heightOffset + crown;
        positions.push(point.x, point.y, point.z);
        uvs.push(column / widthSegments, progress);
      }
    }

    for (let row = 0; row < lengthSegments; row += 1) {
      for (let column = 0; column < widthSegments; column += 1) {
        const vertexIndex = row * (widthSegments + 1) + column;
        indices.push(
          vertexIndex,
          vertexIndex + 1,
          vertexIndex + widthSegments + 1,
          vertexIndex + 1,
          vertexIndex + widthSegments + 2,
          vertexIndex + widthSegments + 1
        );
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      blending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    }));
  }

  function applyValleyTrailTheme() {
    if (!valleyTrail || !activeTheme.trail) return;

    valleyTrail.userData.glow.material.color.setHex(activeTheme.trail.glow);
    valleyTrail.userData.glow.material.opacity = activeTheme.trail.glowOpacity;
    valleyTrail.userData.surface.material.color.setHex(activeTheme.trail.surface);
    valleyTrail.userData.surface.material.opacity = activeTheme.trail.surfaceOpacity;
    valleyTrail.userData.highlight.material.color.setHex(activeTheme.trail.edge);
    valleyTrail.userData.highlight.material.opacity = activeTheme.trail.edgeOpacity;
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.04);
    updatePathMovement(delta);
    updateSectionMarkers(delta);
    renderer.render(scene, camera);
  }

  function updatePathMovement(delta) {
    const forward = keys.has('w') || keys.has('arrowup');
    const backward = keys.has('s') || keys.has('arrowdown');
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');

    if (forward) pathProgress += pathSpeed * delta;
    if (backward) pathProgress -= pathSpeed * delta;
    if (left) sideOffset -= sideSpeed * delta;
    if (right) sideOffset += sideSpeed * delta;

    pathProgress = THREE.MathUtils.clamp(pathProgress, 0, 1);
    sideOffset = THREE.MathUtils.clamp(sideOffset, -160, 160);
    sideOffset *= 1 - delta * 1.4;

    updateCameraAlongPath(delta);
  }

  function updateCameraAlongPath(delta) {
    const point = path.getPointAt(pathProgress);
    const tangent = path.getTangentAt(pathProgress).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const cameraPoint = point.clone().addScaledVector(side, sideOffset);
    cameraPoint.y = getTerrainHeight(cameraPoint.x, cameraPoint.z) + cameraHeight;

    const nextProgress = THREE.MathUtils.clamp(pathProgress + lookAhead, 0, 1);
    const lookPoint = path.getPointAt(nextProgress);
    lookPoint.y = getTerrainHeight(lookPoint.x, lookPoint.z) + cameraHeight * 0.72;

    if (delta === 0) {
      camera.position.copy(cameraPoint);
    } else {
      camera.position.lerp(cameraPoint, 1 - Math.pow(0.001, delta));
    }

    camera.lookAt(lookPoint);
  }

  function createSectionMarkers() {
    sections.forEach((section) => {
      const anchor = getPathPoint(section.progress);
      const marker = createLocationMarker(section.title);
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
      blending: THREE.AdditiveBlending
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: activeTheme.marker.halo,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
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
        blending: THREE.AdditiveBlending
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

    labelSprite.position.y = 2;
    labelSprite.position.z = 52;
    labelSprite.scale.set(74, 21, 1);
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
      blending: THREE.AdditiveBlending
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

    marker.userData.shards.forEach((shard) => {
      shard.mesh.material.color.copy(getShardColor(shard.brightness));
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

      if (item.state === 'idle' && distance < 125) {
        activateSectionMarker(item);
      }

      const dissolveProgress = item.state === 'idle' ? 0 : THREE.MathUtils.clamp(item.dissolveTime / 1.9, 0, 1);
      const visibleMarkerOpacity = markerOpacity * (1 - dissolveProgress);

      item.marker.visible = visibleMarkerOpacity > 0.02;
      item.glow.visible = visibleMarkerOpacity > 0.02;
      item.marker.lookAt(camera.position);
      item.marker.scale.setScalar(pulse * 0.72);
      updatePowerSphereIdle(item.marker, visibleMarkerOpacity, delta);

      item.marker.userData.fadeMaterials.forEach((material, index) => {
        const base = index === 1 ? 0.18 : index === 2 ? 0.07 : index === 3 ? 0.36 : 0.46;
        material.opacity = visibleMarkerOpacity * base;
      });
      item.glow.material.opacity = visibleMarkerOpacity * 0.28;

      if (item.state !== 'idle') {
        item.dissolveTime += delta;
        updatePowerSphereDissolve(item.marker, dissolveProgress, markerOpacity);
        updateDissolveParticles(item, dissolveProgress);
      }
    });
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
    marker.userData.orbitParticles.material.opacity = 0.36 * opacity * (1 - easedPosition);
  }

  function activateSectionMarker(item) {
    item.state = 'dissolving';
    item.dissolveTime = 0;
    item.cardShellStarted = false;
    item.cardMaterialized = false;
    item.cardContentShown = false;
    item.particles.visible = true;
    item.particles.material.opacity = 0.56;
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
    item.particles.material.opacity = Math.sin(progress * Math.PI) * 0.46 + Math.pow(1 - progress, 1.6) * 0.1;

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
    sectionCardKicker.textContent = section.kicker;
    sectionCardTitle.textContent = section.heading;
    sectionCardSummary.textContent = section.summary;
    sectionCardList.innerHTML = section.lines.map((line) => `<li>${line}</li>`).join('');
    sectionCardAction.textContent = section.action;
    sectionCardAction.href = section.href;
    sectionCardElement.classList.remove('is-building', 'is-materialized', 'is-content-visible');
    sectionCardElement.hidden = false;
    window.requestAnimationFrame(() => sectionCardElement.classList.add('is-building'));
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

  function clampByte(value) {
    return THREE.MathUtils.clamp(Math.round(value), 0, 255);
  }

  function generateTexture(heightData, width, height) {
    let context;
    let image;
    let imageData;
    let shade;

    const vector3 = new THREE.Vector3(0, 0, 0);
    const sun = new THREE.Vector3(1, 1, 1);
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

      let baseColor = getTerrainPaletteColor(heightData[j]);
      const shadow = THREE.MathUtils.clamp(shade, 0.18, 1);
      const light = 0.48 + shadow * 0.62;
      const haze = THREE.MathUtils.smoothstep(heightData[j] / 255, 0.42, 0.88) * 18;

      imageData[i] = clampByte(baseColor[0] * light + haze);
      imageData[i + 1] = clampByte(baseColor[1] * light + haze);
      imageData[i + 2] = clampByte(baseColor[2] * light + haze);
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

    for (let i = 0, l = imageData.length; i < l; i += 4) {
      const v = ~~(Math.random() * 5);

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
