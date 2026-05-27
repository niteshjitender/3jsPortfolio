window.PORTFOLIO_THEMES = {
  day: {
    css: 'css/themes/day.css',
    modeLabel: 'DAY — Professional Mode',
    helperText: 'Focused recruiter view',
    meta: '#F0F6FF',
    sceneBg: 0xbde9ff,
    fog: 0xd9f3ff,
    fogDensity: 0.0009,
    terrain: {
      shadow: [18, 76, 142],
      mid: [58, 123, 213],
      high: [148, 207, 246],
      snow: [246, 252, 255]
    },
    trail: {
      surface: [205, 232, 244],
      edge: [34, 168, 225],
      strength: 0.58,
      edgeStrength: 0.42,
      width: 28,
      falloff: 60
    },
    marker: {
      core: 0x22d3ee,
      halo: 0x8defff,
      orbit: 0x0a68b6,
      particle: 0x22d3ee,
      blending: 'normal',
      opacityFactor: 0.76,
      orbitFactor: 0.54,
      glowFactor: 0.52,
      particleFactor: 0.48,
      labelText: '#0A2A5A',
      labelBackground: 'rgba(230, 242, 255, 0.52)',
      glowStops: [
        'rgba(255, 243, 214, 0.18)',
        'rgba(34, 211, 238, 0.12)',
        'rgba(58, 123, 213, 0)'
      ],
      shard: [0.1, 0.6, 0.9]
    }
  },
  night: {
    css: 'css/themes/night.css',
    modeLabel: 'NIGHT — Creative Mode',
    helperText: 'Cinematic creative journey',
    meta: '#0B0F1A',
    sceneBg: 0x0b0f1a,
    fog: 0x0f1e34,
    fogDensity: 0.00145,
    terrain: {
      shadow: [2, 8, 18],
      mid: [19, 34, 58],
      high: [39, 83, 138],
      snow: [118, 164, 204]
    },
    trail: {
      surface: [26, 84, 132],
      edge: [34, 211, 238],
      strength: 0.6,
      edgeStrength: 0.5,
      width: 30,
      falloff: 64
    },
    marker: {
      core: 0x75f2ff,
      halo: 0x13223a,
      orbit: 0x22d3ee,
      particle: 0x7ff4ff,
      blending: 'additive',
      opacityFactor: 0.88,
      orbitFactor: 1,
      glowFactor: 1,
      particleFactor: 1,
      labelText: '#FFFFFF',
      labelBackground: 'rgba(30, 42, 69, 0.34)',
      glowStops: [
        'rgba(255, 236, 193, 0.46)',
        'rgba(34, 211, 238, 0.28)',
        'rgba(11, 15, 26, 0)'
      ],
      shard: [0.08, 0.72, 1]
    }
  }
};
