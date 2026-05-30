/**
 * Visual Theme Config
 * ---------------------------------------------------------------------------
 * Artist-facing controls for the 3D journey.
 *
 * Goal:
 * Keep the editable controls small and meaningful. The code derives detailed
 * terrain bands, lighting, shadows, and UI CSS from these values.
 *
 * Edit here for permanent presets, or open Theme Studio locally:
 * http://127.0.0.1:8091/index.html?studio=1#journey
 */
window.PORTFOLIO_VISUAL_THEME_CONFIG = {
  version: '2026-05-29-artist-controls-v1',
  studio: {
    title: 'Theme Studio',
    description: 'Focused controls for sky, sun/moon, mountains, trail, fog, markers, and UI.',
    openByDefault: false
  },
  themes: {
    day: {
      label: 'DAY — Professional Mode',
      helperText: 'Focused recruiter view',
      css: 'css/themes/day.css?v=profile-20260529d',
      meta: '#EAF3FF',

      sky: {
        color: '#C1D4E7',
        contrast: 1,
        saturation: 1.5
      },

      stars: {
        enabled: false,
        color: '#FFFFFF',
        glowColor: '#D8F4FF',
        count: 0,
        size: 0.9,
        opacity: 0,
        glow: 0,
        twinkle: 0
      },

      lightSource: {
        type: 'sun'
      },

      sun: {
        color: '#FAFAFA',
        azimuth: 52,
        elevation: 35,
        size: 180,
        glow: 0.35,
        intensity: 1.5
      },

      moon: {
        color: '#EAF3FF',
        azimuth: 40,
        elevation: 35,
        size: 58,
        glow: 0.08,
        intensity: 0.1
      },

      mountains: {
        baseColor: '#55A1EC',
        contrast: 0.38,
        saturation: 0.42,
        texture: 0.11,
        iceStrength: 1,
        shadowStrength: 1.5,
        lightStrength: 0.81
      },

      trail: {
        color: '#98C4DC',
        glowColor: '#CDE0EA',
        contrast: 0.21,
        saturation: 0.96,
        opacity: 0.81,
        glow: 0.3,
        width: 41
      },

      fogFlow: {
        color: '#FAF5F5',
        glow: 0.22,
        density: 0.79,
        height: 83,
        spread: 500,
        speed: 0.24,
        opacity: 0.13
      },

      markers: {
        color: '#F7F7FD',
        glowColor: '#E8ECF8',
        contrast: 0.14,
        saturation: 0.74,
        opacity: 1.5,
        glow: 2,
        particles: 2
      },

      horse: {
        color: '#020509',
        tackColor: '#101927',
        scaleLength: 148,
        screenYOffset: -132,
        screenZOffset: -176
      },

      ui: {
        surfaceColor: '#F6F9FC',
        textColor: '#0D1B2E',
        accentColor: '#2CB7FF',
        secondaryAccentColor: '#0A67C7',
        contrast: 0.16,
        saturation: 0.11,
        glassOpacity: 0.53,
        borderOpacity: 0.17
      }
    },

    night: {
      label: 'NIGHT — Creative Mode',
      helperText: 'Cinematic creative journey',
      css: 'css/themes/night.css?v=profile-20260529d',
      meta: '#0B1324',

      sky: {
        color: '#0A1429',
        contrast: 0.42,
        saturation: 0.7
      },

      stars: {
        enabled: true,
        color: '#EAF7FF',
        glowColor: '#8FEFFF',
        count: 260,
        size: 1.45,
        opacity: 0.88,
        glow: 0.78,
        twinkle: 0.38
      },

      lightSource: {
        type: 'moon'
      },

      moon: {
        color: '#E1E1DF',
        azimuth: 34,
        elevation: 23,
        size: 169,
        glow: 1,
        intensity: 1.5
      },

      sun: {
        color: '#FFB86B',
        azimuth: 235,
        elevation: 8,
        size: 54,
        glow: 0.08,
        intensity: 0.08
      },

      mountains: {
        baseColor: '#192C52',
        contrast: 0.28,
        saturation: 1.5,
        texture: 0.22,
        iceStrength: 0.61,
        shadowStrength: 0.29,
        lightStrength: 1.5
      },

      trail: {
        color: '#03204F',
        glowColor: '#192C52',
        contrast: 0.22,
        saturation: 0.66,
        opacity: 0.82,
        glow: 0.75,
        width: 18
      },

      fogFlow: {
        color: '#4E5356',
        glow: 0.27,
        density: 0.36,
        height: 28,
        spread: 900,
        speed: 0.1,
        opacity: 0.15
      },

      markers: {
        color: '#8FEFFF',
        glowColor: '#1F80FF',
        contrast: 0.4,
        saturation: 0.82,
        opacity: 0.82,
        glow: 0.93,
        particles: 1.1
      },

      horse: {
        color: '#2F4E71',
        tackColor: '#2F4E71',
        scaleLength: 148,
        screenYOffset: -132,
        screenZOffset: -176
      },

      ui: {
        surfaceColor: '#121E33',
        textColor: '#E6EEF7',
        accentColor: '#21D7FF',
        secondaryAccentColor: '#FFB86B',
        contrast: 0.52,
        saturation: 0.48,
        glassOpacity: 0.35,
        borderOpacity: 0.3
      }
    }
  }
};

window.PORTFOLIO_VISUAL_CONTROL_SECTIONS = [
  {
    title: 'Sky',
    description: 'Scene sky color and broad grade.',
    controls: [
      { path: 'sky.color', label: 'Sky color', description: 'Main sky/background color.', type: 'color' },
      { path: 'sky.contrast', label: 'Sky contrast', description: 'Higher contrast deepens top and bottom atmosphere.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'sky.saturation', label: 'Sky saturation', description: 'Color intensity of the sky grade.', type: 'number', min: 0, max: 1.5, step: 0.01 }
    ]
  },
  {
    title: 'Stars',
    description: 'Small glowing points visible in the night sky.',
    controls: [
      { path: 'stars.enabled', label: 'Enabled', description: 'Show or hide the star field for this theme.', type: 'boolean' },
      { path: 'stars.color', label: 'Star color', description: 'Core color of the tiny star points.', type: 'color' },
      { path: 'stars.glowColor', label: 'Glow color', description: 'Soft glow color around brighter stars.', type: 'color' },
      { path: 'stars.count', label: 'Count', description: 'Number of stars in the upper sky.', type: 'number', min: 0, max: 320, step: 1 },
      { path: 'stars.size', label: 'Size', description: 'Small point size for the stars.', type: 'number', min: 0.3, max: 3, step: 0.05 },
      { path: 'stars.opacity', label: 'Opacity', description: 'Overall star visibility.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'stars.glow', label: 'Glow', description: 'Extra glow layer around brighter stars.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'stars.twinkle', label: 'Twinkle', description: 'Subtle animated brightness variation.', type: 'number', min: 0, max: 1, step: 0.01 }
    ]
  },
  {
    title: 'Active Light',
    description: 'Choose which celestial body lights the scene.',
    controls: [
      { path: 'lightSource.type', label: 'Active source', description: 'Choose whether sun or moon drives lighting and primary visibility.', type: 'select', options: ['sun', 'moon'] }
    ]
  },
  {
    title: 'Sun',
    description: 'Daylight body controls, independent from moon.',
    controls: [
      { path: 'sun.color', label: 'Sun color', description: 'Color of the sun body and warm sky glow.', type: 'color' },
      { path: 'sun.azimuth', label: 'Sun azimuth', description: 'Horizontal sky angle from 0 to 360 degrees.', type: 'number', min: 0, max: 360, step: 1 },
      { path: 'sun.elevation', label: 'Sun elevation', description: 'Height in sky from horizon to top.', type: 'number', min: 2, max: 85, step: 1 },
      { path: 'sun.size', label: 'Sun size', description: 'Visual size of the sun.', type: 'number', min: 20, max: 220, step: 1 },
      { path: 'sun.glow', label: 'Sun glow', description: 'Halo intensity around the sun.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'sun.intensity', label: 'Sun intensity', description: 'How strongly the sun shades the mountains.', type: 'number', min: 0, max: 1.5, step: 0.01 }
    ]
  },
  {
    title: 'Moon',
    description: 'Night body controls, independent from sun.',
    controls: [
      { path: 'moon.color', label: 'Moon color', description: 'Color of the moon body and cool sky glow.', type: 'color' },
      { path: 'moon.azimuth', label: 'Moon azimuth', description: 'Horizontal sky angle from 0 to 360 degrees.', type: 'number', min: 0, max: 360, step: 1 },
      { path: 'moon.elevation', label: 'Moon elevation', description: 'Height in sky from horizon to top.', type: 'number', min: 2, max: 85, step: 1 },
      { path: 'moon.size', label: 'Moon size', description: 'Visual size of the moon.', type: 'number', min: 20, max: 220, step: 1 },
      { path: 'moon.glow', label: 'Moon glow', description: 'Halo intensity around the moon.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'moon.intensity', label: 'Moon intensity', description: 'How strongly the moon shades the mountains.', type: 'number', min: 0, max: 1.5, step: 0.01 }
    ]
  },
  {
    title: 'Mountains',
    description: 'One base color plus natural texture, shadow, and ice.',
    controls: [
      { path: 'mountains.baseColor', label: 'Base color', description: 'Primary mountain color used to derive all bands.', type: 'color' },
      { path: 'mountains.contrast', label: 'Contrast', description: 'Distance between dark valleys and bright peaks.', type: 'number', min: 0, max: 1.5, step: 0.01 },
      { path: 'mountains.saturation', label: 'Saturation', description: 'Color intensity of mountain layers.', type: 'number', min: 0, max: 1.5, step: 0.01 },
      { path: 'mountains.texture', label: 'Texture', description: 'Fine grain/noise in the terrain texture.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'mountains.iceStrength', label: 'Ice strength', description: 'White/ice lift on high peaks.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'mountains.shadowStrength', label: 'Shadow strength', description: 'How strongly slopes darken away from light.', type: 'number', min: 0, max: 1.5, step: 0.01 },
      { path: 'mountains.lightStrength', label: 'Light strength', description: 'How much sun/moon brightens facing slopes.', type: 'number', min: 0, max: 1.5, step: 0.01 }
    ]
  },
  {
    title: 'Trail',
    description: 'Single visible path through the mountains.',
    controls: [
      { path: 'trail.color', label: 'Trail color', description: 'Main visible trail strip color.', type: 'color' },
      { path: 'trail.glowColor', label: 'Trail glow', description: 'Soft edge glow around the trail.', type: 'color' },
      { path: 'trail.contrast', label: 'Contrast', description: 'How much the trail separates from terrain.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'trail.saturation', label: 'Saturation', description: 'Trail color intensity.', type: 'number', min: 0, max: 1.5, step: 0.01 },
      { path: 'trail.opacity', label: 'Opacity', description: 'How strongly trail overrides mountain color.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'trail.glow', label: 'Glow', description: 'Trail edge glow strength.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'trail.width', label: 'Width', description: 'Visible trail width.', type: 'number', min: 4, max: 80, step: 1 }
    ]
  },
  {
    title: 'Flowing Fog',
    description: 'White/cyan fog ribbons moving through the valley.',
    controls: [
      { path: 'fogFlow.color', label: 'Fog color', description: 'Color of the flowing valley fog.', type: 'color' },
      { path: 'fogFlow.density', label: 'Density', description: 'How many fog ribbons are visible.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'fogFlow.glow', label: 'Glow', description: 'How luminous fog appears.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'fogFlow.height', label: 'Height', description: 'Vertical offset above terrain.', type: 'number', min: 0, max: 180, step: 1 },
      { path: 'fogFlow.spread', label: 'Spread', description: 'Side-to-side width of fog ribbons.', type: 'number', min: 40, max: 900, step: 10 },
      { path: 'fogFlow.speed', label: 'Speed', description: 'Fog drift speed.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'fogFlow.opacity', label: 'Opacity', description: 'Maximum fog opacity.', type: 'number', min: 0, max: 1, step: 0.01 }
    ]
  },
  {
    title: 'Markers',
    description: 'Power-sphere markers and particles.',
    controls: [
      { path: 'markers.color', label: 'Marker color', description: 'Main marker sphere color.', type: 'color' },
      { path: 'markers.glowColor', label: 'Marker glow', description: 'Glow/particle accent color.', type: 'color' },
      { path: 'markers.contrast', label: 'Contrast', description: 'Marker clarity against terrain.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'markers.saturation', label: 'Saturation', description: 'Marker color intensity.', type: 'number', min: 0, max: 1.5, step: 0.01 },
      { path: 'markers.opacity', label: 'Opacity', description: 'Overall marker visibility.', type: 'number', min: 0, max: 1.5, step: 0.01 },
      { path: 'markers.glow', label: 'Glow', description: 'Marker halo strength.', type: 'number', min: 0, max: 2, step: 0.01 },
      { path: 'markers.particles', label: 'Particles', description: 'Dissolve particle intensity.', type: 'number', min: 0, max: 2, step: 0.01 }
    ]
  },
  {
    title: 'UI',
    description: 'Glass panels, readable text, and accents.',
    controls: [
      { path: 'ui.surfaceColor', label: 'Surface color', description: 'Glass/panel base color.', type: 'color' },
      { path: 'ui.textColor', label: 'Text color', description: 'Primary text color.', type: 'color' },
      { path: 'ui.accentColor', label: 'Accent color', description: 'Links, active steps, cyan accents.', type: 'color' },
      { path: 'ui.secondaryAccentColor', label: 'Secondary accent', description: 'CTA/amber accent color.', type: 'color' },
      { path: 'ui.contrast', label: 'Contrast', description: 'Panel shadow and edge strength.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'ui.saturation', label: 'Saturation', description: 'UI color intensity.', type: 'number', min: 0, max: 1.5, step: 0.01 },
      { path: 'ui.glassOpacity', label: 'Glass opacity', description: 'Panel fill opacity.', type: 'number', min: 0, max: 1, step: 0.01 },
      { path: 'ui.borderOpacity', label: 'Border opacity', description: 'Panel border visibility.', type: 'number', min: 0, max: 1, step: 0.01 }
    ]
  }
];
