(() => {
  const config = window.PORTFOLIO_VISUAL_THEME_CONFIG;

  if (!config?.themes) {
    console.error('Missing PORTFOLIO_VISUAL_THEME_CONFIG. Load js/visual-theme-config.js before js/theme-palettes.js.');
    window.PORTFOLIO_THEMES = {};
    return;
  }

  const SKY_RADIUS = 3600;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
  }

  function normalizeHex(hex) {
    const raw = String(hex || '#000000').trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
    if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toUpperCase();
    return '#000000';
  }

  function hexToInt(hex) {
    return parseInt(normalizeHex(hex).replace('#', ''), 16);
  }

  function hexToRgb(hex) {
    const raw = normalizeHex(hex).replace('#', '');
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16)
    ];
  }

  function hexToUnitRgb(hex) {
    return hexToRgb(hex).map((value) => value / 255);
  }

  function rgbToHex(rgb) {
    return `#${rgb.map((value) => clampByte(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }

  function rgbToHsl(rgb) {
    let [red, green, blue] = rgb.map((value) => value / 255);
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    let hue = 0;
    let saturation = 0;
    const lightness = (max + min) / 2;

    if (max !== min) {
      const delta = max - min;
      saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

      if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
      if (max === green) hue = (blue - red) / delta + 2;
      if (max === blue) hue = (red - green) / delta + 4;
      hue /= 6;
    }

    return [hue, saturation, lightness];
  }

  function hueToRgb(p, q, t) {
    let next = t;
    if (next < 0) next += 1;
    if (next > 1) next -= 1;
    if (next < 1 / 6) return p + (q - p) * 6 * next;
    if (next < 1 / 2) return q;
    if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
    return p;
  }

  function hslToRgb(hsl) {
    const [hue, saturation, lightness] = hsl;

    if (saturation === 0) {
      const value = clampByte(lightness * 255);
      return [value, value, value];
    }

    const q = lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;

    return [
      clampByte(hueToRgb(p, q, hue + 1 / 3) * 255),
      clampByte(hueToRgb(p, q, hue) * 255),
      clampByte(hueToRgb(p, q, hue - 1 / 3) * 255)
    ];
  }

  function gradeRgb(rgb, options = {}) {
    const [hue, saturation, lightness] = rgbToHsl(rgb);
    const saturationFactor = 0.45 + clamp(options.saturation ?? 0.6, 0, 1.5);
    const contrastFactor = 1 + clamp(options.contrast ?? 0.4, 0, 1.5) * 0.34;
    const nextSaturation = clamp(saturation * saturationFactor, 0, 1);
    const nextLightness = clamp(0.5 + (lightness - 0.5) * contrastFactor + (options.lightnessShift ?? 0), 0.01, 0.99);
    return hslToRgb([hue, nextSaturation, nextLightness]);
  }

  function mixRgb(from, to, alpha) {
    const amount = clamp(alpha);
    return [
      from[0] + (to[0] - from[0]) * amount,
      from[1] + (to[1] - from[1]) * amount,
      from[2] + (to[2] - from[2]) * amount
    ];
  }

  function rgbaFromHex(hex, alpha) {
    const [red, green, blue] = hexToRgb(hex);
    return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
  }

  function rgbaFromRgb(rgb, alpha) {
    return `rgba(${clampByte(rgb[0])}, ${clampByte(rgb[1])}, ${clampByte(rgb[2])}, ${clamp(alpha, 0, 1)})`;
  }

  function directionFromAngles(azimuth, elevation) {
    const azimuthRad = THREELike.degToRad(Number(azimuth) || 0);
    const elevationRad = THREELike.degToRad(clamp(Number(elevation) || 0, 0, 89));
    const horizontal = Math.cos(elevationRad);

    return [
      Math.sin(azimuthRad) * horizontal,
      Math.sin(elevationRad),
      -Math.cos(azimuthRad) * horizontal
    ];
  }

  const THREELike = {
    degToRad(degrees) {
      return degrees * Math.PI / 180;
    }
  };

  function activeSourceName(theme) {
    return theme.lightSource?.type === 'moon' ? 'moon' : 'sun';
  }

  function celestialFallback(sourceName) {
    return sourceName === 'sun'
      ? { color: '#FFF3C7', azimuth: 245, elevation: 22, size: 72, glow: 0.18, intensity: 0.8 }
      : { color: '#FFECC1', azimuth: 32, elevation: 32, size: 66, glow: 0.18, intensity: 0.26 };
  }

  function getCelestialConfig(theme, sourceName) {
    return theme[sourceName] || (
      theme.lightSource?.type === sourceName
        ? theme.lightSource
        : celestialFallback(sourceName)
    );
  }

  function getActiveCelestialConfig(theme) {
    return getCelestialConfig(theme, activeSourceName(theme));
  }

  function deepAssign(target, source) {
    Object.keys(target).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        delete target[key];
      }
    });

    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
          target[key] = {};
        }
        deepAssign(target[key], value);
        return;
      }

      target[key] = Array.isArray(value) ? [...value] : value;
    });
  }

  function buildStageOverlay(theme) {
    const activeSource = getActiveCelestialConfig(theme);
    const surfaceRgb = hexToRgb(theme.ui.surfaceColor);
    const accentRgb = hexToRgb(theme.ui.accentColor);
    const topRgb = gradeRgb(surfaceRgb, {
      contrast: theme.ui.contrast,
      saturation: theme.ui.saturation,
      lightnessShift: activeSourceName(theme) === 'sun' ? 0.03 : -0.08
    });
    const bottomRgb = gradeRgb(surfaceRgb, {
      contrast: theme.ui.contrast,
      saturation: theme.ui.saturation,
      lightnessShift: activeSourceName(theme) === 'sun' ? -0.06 : -0.16
    });

    return [
      `linear-gradient(180deg, ${rgbaFromRgb(topRgb, 0.18)}, transparent 36%, ${rgbaFromRgb(bottomRgb, 0.12)})`,
      `radial-gradient(circle at 48% 20%, ${rgbaFromRgb(accentRgb, activeSource.glow * 0.08)}, transparent 16%)`
    ].join(', ');
  }

  function cssVars(theme) {
    const accent = theme.ui.accentColor;
    const secondaryAccent = theme.ui.secondaryAccentColor;
    const surface = theme.ui.surfaceColor;
    const text = theme.ui.textColor;
    const glassOpacity = clamp(theme.ui.glassOpacity, 0, 1);
    const borderOpacity = clamp(theme.ui.borderOpacity, 0, 1);
    const contrast = clamp(theme.ui.contrast, 0, 1);
    const shadowAlpha = activeSourceName(theme) === 'moon' ? 0.38 + contrast * 0.28 : 0.12 + contrast * 0.18;

    return {
      '--ink': text,
      '--muted': rgbaFromHex(text, 0.68),
      '--glass': rgbaFromHex(surface, glassOpacity),
      '--glass-strong': rgbaFromHex(surface, Math.min(0.96, glassOpacity + 0.14)),
      '--stage-bg': theme.ui.surfaceColor,
      '--stage-overlay': buildStageOverlay(theme),
      '--panel-border': rgbaFromHex(accent, borderOpacity),
      '--nav-bg': `linear-gradient(135deg, ${rgbaFromHex(surface, Math.min(0.95, glassOpacity + 0.08))}, ${rgbaFromHex(surface, Math.max(0.36, glassOpacity - 0.18))})`,
      '--panel-shadow': `0 20px 52px rgba(0, 0, 0, ${shadowAlpha})`,
      '--toggle-glow': rgbaFromHex(accent, 0.22 + contrast * 0.28),
      '--card-shell-border': accent,
      '--card-shell-fill': rgbaFromHex(accent, 0.08 + contrast * 0.06),
      '--card-shell-beam': rgbaFromHex(accent, 0.32 + contrast * 0.22),
      '--card-shell-glow': rgbaFromHex(accent, 0.22 + contrast * 0.28),
      '--card-shell-inset': rgbaFromHex(surface, glassOpacity),
      '--card-material-bg': rgbaFromHex(surface, Math.min(0.96, glassOpacity + 0.1)),
      '--card-material-border': rgbaFromHex(accent, Math.min(0.72, borderOpacity + 0.14)),
      '--card-shadow': `0 26px 70px rgba(0, 0, 0, ${shadowAlpha})`,
      '--accent': accent,
      '--link-accent': secondaryAccent,
      '--sweep': rgbaFromHex(accent, 0.34 + contrast * 0.2)
    };
  }

  function buildMountainPalette(theme) {
    const mountain = theme.mountains;
    const base = hexToRgb(mountain.baseColor);
    const ice = clamp(mountain.iceStrength, 0, 1);
    const contrast = clamp(mountain.contrast, 0, 1.5);
    const saturation = clamp(mountain.saturation, 0, 1.5);
    const shadowStrength = clamp(mountain.shadowStrength, 0, 1.5);
    const nightLift = activeSourceName(theme) === 'moon' ? 0.12 : 0;
    const lower = gradeRgb(base, { contrast, saturation, lightnessShift: -0.22 - shadowStrength * 0.05 + nightLift });
    const valley = gradeRgb(base, { contrast, saturation, lightnessShift: -0.34 - shadowStrength * 0.08 + nightLift });
    const middle = gradeRgb(base, { contrast, saturation, lightnessShift: -0.06 + nightLift * 0.62 });
    const upper = gradeRgb(base, { contrast, saturation, lightnessShift: 0.13 + ice * 0.04 + nightLift * 0.42 });
    const farPeak = gradeRgb(base, { contrast, saturation: saturation * 0.82, lightnessShift: 0.28 + ice * 0.08 + nightLift * 0.32 });
    const snow = mixRgb(farPeak, hexToRgb('#F7FCFF'), 0.38 + ice * 0.46);
    const iceHighlight = mixRgb(snow, hexToRgb(theme.trail.glowColor), ice * 0.22);

    return {
      shadow: valley,
      mid: middle,
      high: upper,
      snow,
      paletteStops: [
        { at: 0, color: valley, label: 'Valley shadow' },
        { at: 0.24, color: lower, label: 'Lower slope' },
        { at: 0.48, color: middle, label: 'Mountain body' },
        { at: 0.72, color: upper, label: 'Upper mountain' },
        { at: 0.9, color: snow, label: 'Snow and ice' },
        { at: 1, color: iceHighlight, label: 'Ice highlight' }
      ]
    };
  }

  function buildTerrainLighting(theme) {
    const mountain = theme.mountains;
    const sourceName = activeSourceName(theme);
    const activeSource = getActiveCelestialConfig(theme);
    const direction = directionFromAngles(activeSource.azimuth, activeSource.elevation);
    const sourceIntensity = clamp(activeSource.intensity, 0, 1.5);
    const lightStrength = clamp(mountain.lightStrength, 0, 1.5) * (0.45 + sourceIntensity * 0.55);
    const shadowStrength = clamp(mountain.shadowStrength, 0, 1.5);

    return {
      sunDirection: direction,
      shadowFloor: clamp(sourceName === 'moon' ? 0.26 - shadowStrength * 0.04 : 0.38 - shadowStrength * 0.06, 0.12, 0.58),
      lightBase: sourceName === 'moon' ? 0.5 : 0.56,
      lightStrength: clamp(lightStrength, 0.1, 1.35),
      hazeStart: 0.5,
      hazeEnd: 0.93,
      hazeAmount: sourceName === 'moon' ? 4.6 : 6.8,
      surfaceNoise: 1 + clamp(mountain.texture, 0, 1) * 22
    };
  }

  function buildTerrain(theme) {
    const palette = buildMountainPalette(theme);

    return {
      ...palette,
      lighting: buildTerrainLighting(theme)
    };
  }

  function buildTrail(theme) {
    const trail = theme.trail;
    const trailRgb = gradeRgb(hexToRgb(trail.color), {
      contrast: trail.contrast,
      saturation: trail.saturation,
      lightnessShift: trail.lightnessShift ?? 0
    });
    const edgeRgb = gradeRgb(hexToRgb(trail.glowColor), {
      contrast: trail.contrast,
      saturation: Math.max(trail.saturation, 0.65),
      lightnessShift: 0.02
    });
    const width = Number(trail.width) || 18;

    return {
      surface: trailRgb,
      edge: edgeRgb,
      strength: clamp(trail.opacity, 0, 1),
      edgeStrength: clamp(trail.glow, 0, 1) * 0.42,
      width,
      falloff: width + 18 + clamp(trail.glow, 0, 1) * 42,
      coreRatio: 0.46
    };
  }

  function buildMarker(theme) {
    const marker = theme.markers;
    const labelSurface = rgbaFromHex(theme.ui.surfaceColor, Math.min(0.9, clamp(theme.ui.glassOpacity, 0, 1) + 0.08));
    const core = hexToInt(marker.color);
    const glow = hexToInt(marker.glowColor);

    return {
      core,
      halo: glow,
      orbit: glow,
      particle: glow,
      blending: activeSourceName(theme) === 'moon' ? 'additive' : 'normal',
      opacityFactor: clamp(marker.opacity, 0, 1.5),
      orbitFactor: clamp(marker.glow, 0, 2) * 0.72,
      glowFactor: clamp(marker.glow, 0, 2),
      particleFactor: clamp(marker.particles, 0, 2),
      labelText: theme.ui.textColor,
      labelBackground: labelSurface,
      glowStops: [
        rgbaFromHex(marker.color, 0.52),
        rgbaFromHex(marker.glowColor, 0.32 + clamp(marker.glow, 0, 2) * 0.16),
        rgbaFromHex(marker.glowColor, 0)
      ],
      shard: hexToUnitRgb(marker.color)
    };
  }

  function buildCelestialSource(theme, sourceName) {
    const isActive = activeSourceName(theme) === sourceName;
    const source = getCelestialConfig(theme, sourceName);
    const intensity = clamp(source.intensity, 0, 1.5);
    const glow = clamp(source.glow, 0, 1);
    const direction = directionFromAngles(source.azimuth, source.elevation);
    const opacity = isActive
      ? clamp(0.48 + intensity * 0.44, 0.35, 1)
      : clamp(0.05 + intensity * 0.2, 0.04, 0.28);

    return {
      enabled: true,
      isActive,
      azimuth: source.azimuth,
      elevation: source.elevation,
      direction,
      skyRadius: SKY_RADIUS,
      color: hexToInt(source.color),
      glowColor: hexToInt(isActive ? source.color : source.color),
      size: source.size,
      glowSize: source.size * (3.6 + glow * 5.4),
      opacity,
      glowOpacity: isActive ? glow * 0.62 : glow * 0.18,
      intensity,
      spinSpeed: sourceName === 'moon' ? 0.004 : 0.002
    };
  }

  function buildFog(theme) {
    const sourceName = activeSourceName(theme);
    const fogControlRgb = hexToRgb(theme.fogFlow.color);
    const mountainRgb = hexToRgb(theme.mountains.baseColor);
    const fogRgb = mixRgb(fogControlRgb, mountainRgb, sourceName === 'moon' ? 0.48 : 0.26);

    return {
      color: hexToInt(rgbToHex(fogRgb)),
      density: sourceName === 'moon' ? 0.00012 + clamp(theme.fogFlow.density, 0, 1) * 0.0001 : 0.00007 + clamp(theme.fogFlow.density, 0, 1) * 0.00006,
      flow: {
        color: hexToInt(theme.fogFlow.color),
        glow: clamp(theme.fogFlow.glow, 0, 1),
        density: clamp(theme.fogFlow.density, 0, 1),
        height: Number(theme.fogFlow.height) || 0,
        spread: Number(theme.fogFlow.spread) || 300,
        speed: Number(theme.fogFlow.speed) || 0,
        opacity: clamp(theme.fogFlow.opacity, 0, 1)
      }
    };
  }

  function buildStars(theme) {
    const sourceName = activeSourceName(theme);
    const stars = theme.stars || {};
    const enabled = stars.enabled ?? sourceName === 'moon';
    const opacity = clamp(stars.opacity ?? (sourceName === 'moon' ? 0.58 : 0), 0, 1);
    const glow = clamp(stars.glow ?? 0.35, 0, 1);

    return {
      enabled: Boolean(enabled) && opacity > 0.01,
      color: hexToInt(stars.color || '#FFFFFF'),
      glowColor: hexToInt(stars.glowColor || stars.color || '#FFFFFF'),
      count: Math.round(clamp(stars.count ?? (sourceName === 'moon' ? 2800 : 0), 0, 5000)),
      size: clamp(stars.size ?? 1, 0.2, 4),
      opacity,
      glow,
      twinkle: clamp(stars.twinkle ?? 0.24, 0, 1),
      skyRadius: SKY_RADIUS * 0.88
    };
  }

  function buildHorse(theme) {
    return {
      silhouette: hexToInt(theme.horse.color),
      tack: hexToInt(theme.horse.tackColor),
      scaleLength: theme.horse.scaleLength,
      screenYOffset: theme.horse.screenYOffset,
      screenZOffset: theme.horse.screenZOffset
    };
  }

  function buildTheme(theme) {
    const fog = buildFog(theme);
    const sourceName = activeSourceName(theme);
    const activeSource = getActiveCelestialConfig(theme);

    return {
      css: theme.css,
      modeLabel: theme.label,
      helperText: theme.helperText,
      meta: theme.meta,
      cssVars: cssVars(theme),
      sceneBg: hexToInt(theme.sky.color),
      fog: fog.color,
      fogDensity: fog.density,
      fogFlow: fog.flow,
      sky: theme.sky,
      lightSource: {
        type: sourceName,
        ...activeSource,
        direction: directionFromAngles(activeSource.azimuth, activeSource.elevation)
      },
      stars: buildStars(theme),
      celestial: {
        sun: buildCelestialSource(theme, 'sun'),
        moon: buildCelestialSource(theme, 'moon')
      },
      terrain: buildTerrain(theme),
      trail: buildTrail(theme),
      marker: buildMarker(theme),
      horse: buildHorse(theme)
    };
  }

  function buildThemes() {
    return Object.fromEntries(
      Object.entries(config.themes).map(([name, theme]) => [name, buildTheme(theme)])
    );
  }

  window.buildPortfolioThemesFromVisualConfig = buildThemes;
  window.syncPortfolioThemesFromVisualConfig = () => {
    const nextThemes = buildThemes();

    if (!window.PORTFOLIO_THEMES) {
      window.PORTFOLIO_THEMES = nextThemes;
      return window.PORTFOLIO_THEMES;
    }

    deepAssign(window.PORTFOLIO_THEMES, nextThemes);
    return window.PORTFOLIO_THEMES;
  };

  window.PORTFOLIO_THEMES = buildThemes();
})();
