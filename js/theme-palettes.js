window.PORTFOLIO_THEMES = {
  day: {
    css: 'css/themes/day.css',
    modeLabel: 'DAY — Professional Mode',
    helperText: 'Focused recruiter view',
    meta: '#F0F6FF',
    sceneBg: 0xd7efff,
    fog: 0xe8f7ff,
    fogDensity: 0.00042,
    terrain: {
      shadow: [45, 111, 181],
      mid: [92, 172, 231],
      high: [169, 220, 249],
      snow: [230, 247, 255]
    },
    trail: {
      surface: [222, 245, 255],
      edge: [45, 145, 222],
      strength: 0.5,
      edgeStrength: 0.52,
      width: 28,
      falloff: 60
    },
    marker: {
      core: 0xf9fdff,
      halo: 0x8eeaff,
      orbit: 0x0b66b8,
      particle: 0xf8fdff,
      blending: 'normal',
      opacityFactor: 0.86,
      orbitFactor: 0.95,
      glowFactor: 0.42,
      particleFactor: 0.5,
      labelText: '#0A2A5A',
      labelBackground: 'rgba(248, 253, 255, 0.92)',
      glowStops: [
        'rgba(255, 255, 255, 0.24)',
        'rgba(34, 211, 238, 0.18)',
        'rgba(58, 123, 213, 0)'
      ],
      shard: [0.86, 0.96, 1]
    }
  },
  night: {
    css: 'css/themes/night.css',
    modeLabel: 'NIGHT — Creative Mode',
    helperText: 'Cinematic creative journey',
    meta: '#1B456D',
    sceneBg: 0x1b456d,
    fog: 0x4b7fa8,
    fogDensity: 0.00052,
    terrain: {
      shadow: [28, 62, 101],
      mid: [62, 117, 171],
      high: [118, 177, 220],
      snow: [198, 229, 246]
    },
    trail: {
      surface: [46, 111, 158],
      edge: [80, 226, 248],
      strength: 0.56,
      edgeStrength: 0.46,
      width: 30,
      falloff: 64
    },
    marker: {
      core: 0xdffbff,
      halo: 0x163f69,
      orbit: 0x48e8ff,
      particle: 0xbdf8ff,
      blending: 'additive',
      opacityFactor: 0.86,
      orbitFactor: 1,
      glowFactor: 0.82,
      particleFactor: 0.82,
      labelText: '#FFFFFF',
      labelBackground: 'rgba(30, 42, 69, 0.34)',
      glowStops: [
        'rgba(255, 236, 193, 0.34)',
        'rgba(34, 211, 238, 0.22)',
        'rgba(11, 15, 26, 0)'
      ],
      shard: [0.68, 0.94, 1]
    }
  }
};
