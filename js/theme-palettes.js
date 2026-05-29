window.PORTFOLIO_THEMES = {
  day: {
    css: 'css/themes/day.css?v=profile-20260528q',
    modeLabel: 'DAY — Professional Mode',
    helperText: 'Focused recruiter view',
    meta: '#EAF3FF',
    sceneBg: 0xeaf3ff,
    fog: 0xcfe1f2,
    fogDensity: 0.00018,
    terrain: {
      shadow: [47, 78, 113],
      mid: [128, 159, 189],
      high: [214, 228, 243],
      snow: [255, 255, 255]
    },
    trail: {
      surface: [246, 249, 252],
      edge: [44, 183, 255],
      strength: 0.66,
      edgeStrength: 0.2,
      width: 18,
      falloff: 38
    },
    marker: {
      core: 0xeafaff,
      halo: 0x9beeff,
      orbit: 0x2cb7ff,
      particle: 0xd6f8ff,
      blending: 'normal',
      opacityFactor: 0.7,
      orbitFactor: 1,
      glowFactor: 0.42,
      particleFactor: 0.46,
      labelText: '#0D1B2E',
      labelBackground: 'rgba(246, 249, 252, 0.94)',
      glowStops: [
        'rgba(246, 249, 252, 0.36)',
        'rgba(44, 183, 255, 0.24)',
        'rgba(128, 159, 189, 0)'
      ],
      shard: [0.62, 0.9, 1]
    }
  },
  night: {
    css: 'css/themes/night.css?v=profile-20260528q',
    modeLabel: 'NIGHT — Creative Mode',
    helperText: 'Cinematic creative journey',
    meta: '#0B1324',
    sceneBg: 0x0b1324,
    fog: 0x1a2a42,
    fogDensity: 0.00022,
    terrain: {
      shadow: [11, 24, 42],
      mid: [26, 50, 82],
      high: [52, 88, 126],
      snow: [94, 139, 182]
    },
    trail: {
      surface: [33, 215, 255],
      edge: [255, 184, 107],
      strength: 0.68,
      edgeStrength: 0.3,
      width: 22,
      falloff: 50
    },
    marker: {
      core: 0x8ff2ff,
      halo: 0x21d7ff,
      orbit: 0xffb86b,
      particle: 0x8ff2ff,
      blending: 'additive',
      opacityFactor: 0.78,
      orbitFactor: 1,
      glowFactor: 0.64,
      particleFactor: 0.68,
      labelText: '#E6EEF7',
      labelBackground: 'rgba(18, 30, 51, 0.72)',
      glowStops: [
        'rgba(255, 184, 107, 0.24)',
        'rgba(33, 215, 255, 0.34)',
        'rgba(11, 15, 26, 0)'
      ],
      shard: [0.38, 0.86, 1]
    }
  }
};
