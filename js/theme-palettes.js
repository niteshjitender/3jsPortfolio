window.PORTFOLIO_THEMES = {
  day: {
    css: 'css/themes/day.css',
    meta: '#F0F6FF',
    sceneBg: 0xbde9ff,
    fog: 0xcdefff,
    terrain: {
      shadow: [18, 76, 142],
      mid: [58, 123, 213],
      high: [194, 232, 255],
      snow: [246, 252, 255]
    },
    trail: {
      surface: 0xf0f7ff,
      edge: 0xfff3d6,
      glow: 0x22d3ee,
      surfaceOpacity: 0.78,
      edgeOpacity: 0,
      glowOpacity: 0
    },
    marker: {
      core: 0x9ff7ff,
      halo: 0x22d3ee,
      orbit: 0x7eeeff,
      particle: 0x9ef4ff,
      labelText: '#0A2A5A',
      labelBackground: 'rgba(230, 242, 255, 0.22)',
      glowStops: [
        'rgba(255, 243, 214, 0.5)',
        'rgba(34, 211, 238, 0.22)',
        'rgba(58, 123, 213, 0)'
      ],
      shard: [0.24, 0.78, 1]
    }
  },
  night: {
    css: 'css/themes/night.css',
    meta: '#0B0F1A',
    sceneBg: 0x0b0f1a,
    fog: 0x13223a,
    terrain: {
      shadow: [2, 8, 18],
      mid: [19, 34, 58],
      high: [39, 83, 138],
      snow: [118, 164, 204]
    },
    trail: {
      surface: 0x24476f,
      edge: 0xffecc1,
      glow: 0x22d3ee,
      surfaceOpacity: 0.78,
      edgeOpacity: 0,
      glowOpacity: 0
    },
    marker: {
      core: 0x75f2ff,
      halo: 0x13223a,
      orbit: 0x22d3ee,
      particle: 0x7ff4ff,
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
