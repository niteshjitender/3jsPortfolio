(() => {
  const runtime = window.__PORTFOLIO_RUNTIME__;
  const themes = window.PORTFOLIO_THEMES;
  if (!runtime || !themes) {
    window.addEventListener('portfolio-runtime-ready', () => {
      const script = document.createElement('script');
      script.src = 'js/debug-theme-panel.js?v=debug-20260528b';
      document.body.appendChild(script);
    }, { once: true });
    return;
  }

  const CSS_VAR_KEYS = [
    '--stage-bg',
    '--ink',
    '--muted',
    '--accent',
    '--link-accent',
    '--glass',
    '--glass-strong',
    '--panel-border',
    '--toggle-glow',
    '--card-material-bg',
    '--card-material-border',
    '--sweep'
  ];

  const THEME_COLOR_PATHS = [
    { label: 'sceneBg', path: 'sceneBg', type: 'hex-int' },
    { label: 'fog', path: 'fog', type: 'hex-int' },
    { label: 'marker.core', path: 'marker.core', type: 'hex-int' },
    { label: 'marker.halo', path: 'marker.halo', type: 'hex-int' },
    { label: 'marker.orbit', path: 'marker.orbit', type: 'hex-int' },
    { label: 'marker.particle', path: 'marker.particle', type: 'hex-int' },
    { label: 'terrain.shadow', path: 'terrain.shadow', type: 'rgb-array' },
    { label: 'terrain.mid', path: 'terrain.mid', type: 'rgb-array' },
    { label: 'terrain.high', path: 'terrain.high', type: 'rgb-array' },
    { label: 'terrain.snow', path: 'terrain.snow', type: 'rgb-array' },
    { label: 'trail.surface', path: 'trail.surface', type: 'rgb-array' },
    { label: 'trail.edge', path: 'trail.edge', type: 'rgb-array' }
  ];

  function clampByte(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  function hexFromInt(intHex) {
    const value = Number(intHex) >>> 0;
    return `#${value.toString(16).padStart(6, '0').slice(-6)}`;
  }

  function intFromHex(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  function hexFromRgbArray(rgb) {
    const [r, g, b] = rgb || [0, 0, 0];
    return `#${[r, g, b].map((x) => clampByte(x).toString(16).padStart(2, '0')).join('')}`;
  }

  function rgbArrayFromHex(hex) {
    const raw = hex.replace('#', '');
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16)
    ];
  }

  function readThemeValue(themeName, path) {
    const parts = String(path).split('.').filter(Boolean);
    let target = themes?.[themeName];
    for (const key of parts) {
      if (!target) return undefined;
      target = target[key];
    }
    return target;
  }

  function setCssVar(varName, value) {
    document.documentElement.style.setProperty(varName, value);
  }

  function getCssVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'style' && value && typeof value === 'object') {
        Object.assign(node.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2), value);
      } else if (value !== undefined) {
        node.setAttribute(key, String(value));
      }
    });
    children.forEach((child) => node.append(child));
    return node;
  }

  const panel = el('aside', {
    id: 'theme-debug-panel',
    style: {
      position: 'fixed',
      top: '0',
      left: '0',
      height: '100vh',
      width: '320px',
      overflow: 'auto',
      zIndex: '99999',
      padding: '12px 12px 14px',
      background: 'rgba(10, 18, 33, 0.86)',
      borderRight: '1px solid rgba(255,255,255,0.12)',
      color: '#fff',
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      backdropFilter: 'blur(10px)'
    }
  });

  const title = el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } }, [
    el('div', {}, [
      el('div', { style: { fontWeight: '800', letterSpacing: '0.02em', fontSize: '12px', opacity: '0.92' } }, [
        document.createTextNode('THEME DEBUG PANEL')
      ]),
      el('div', { style: { fontSize: '11px', opacity: '0.72', marginTop: '2px' } }, [
        document.createTextNode('Remove by commenting one script line in index.html')
      ])
    ])
  ]);

  const closeBtn = el('button', {
    type: 'button',
    style: {
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.06)',
      color: '#fff',
      borderRadius: '10px',
      padding: '6px 10px',
      fontSize: '12px',
      cursor: 'pointer'
    },
    onclick: () => panel.remove()
  }, [document.createTextNode('Hide')]);

  title.append(closeBtn);

  const themeSelect = el('select', {
    style: {
      width: '100%',
      marginTop: '10px',
      padding: '8px 10px',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.06)',
      color: '#fff',
      outline: 'none'
    }
  });

  ['day', 'night'].filter((key) => themes[key]).forEach((key) => {
    themeSelect.append(el('option', { value: key }, [document.createTextNode(key)]));
  });
  themeSelect.value = runtime.activeThemeName || 'day';

  const sections = el('div', { style: { marginTop: '12px', display: 'grid', gap: '12px' } });

  function makeRow(labelText, input) {
    const row = el('label', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '10px',
        alignItems: 'center',
        padding: '8px 10px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.04)'
      }
    }, [
      el('div', { style: { display: 'grid', gap: '2px' } }, [
        el('div', { style: { fontSize: '12px', fontWeight: '700' } }, [document.createTextNode(labelText)]),
        el('div', { style: { fontSize: '11px', opacity: '0.70' } }, [document.createTextNode('live update')])
      ]),
      input
    ]);
    return row;
  }

  function buildThemePickers() {
    const themeName = themeSelect.value;
    const group = el('div', {});
    group.append(el('div', { style: { fontSize: '12px', fontWeight: '800', opacity: '0.9', marginBottom: '8px' } }, [
      document.createTextNode('Three.js palette')
    ]));

    THEME_COLOR_PATHS.forEach((item) => {
      const current = readThemeValue(themeName, item.path);
      const initialHex = item.type === 'hex-int'
        ? hexFromInt(current ?? 0)
        : hexFromRgbArray(current ?? [0, 0, 0]);

      const input = el('input', {
        type: 'color',
        value: initialHex,
        style: {
          width: '44px',
          height: '34px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'transparent',
          padding: '0',
          cursor: 'pointer'
        }
      });

      input.addEventListener('input', () => {
        const next = item.type === 'hex-int'
          ? intFromHex(input.value)
          : rgbArrayFromHex(input.value);
        runtime.setThemeValue(themeName, item.path, next);
      });

      group.append(makeRow(item.label, input));
    });

    return group;
  }

  function buildCssPickers() {
    const group = el('div', {});
    group.append(el('div', { style: { fontSize: '12px', fontWeight: '800', opacity: '0.9', marginBottom: '8px' } }, [
      document.createTextNode('CSS variables (UI)')
    ]));

    CSS_VAR_KEYS.forEach((key) => {
      const raw = getCssVar(key) || '#000000';
      const initial = raw.startsWith('#') ? raw : '#000000';

      const input = el('input', {
        type: 'color',
        value: initial,
        style: {
          width: '44px',
          height: '34px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'transparent',
          padding: '0',
          cursor: 'pointer'
        }
      });

      input.addEventListener('input', () => {
        setCssVar(key, input.value);
      });

      group.append(makeRow(key, input));
    });

    return group;
  }

  function rebuild() {
    sections.innerHTML = '';
    sections.append(buildThemePickers());
    sections.append(buildCssPickers());
  }

  themeSelect.addEventListener('change', () => {
    runtime.switchTheme(themeSelect.value);
    rebuild();
  });
  rebuild();

  panel.append(title, themeSelect, sections);
  document.body.append(panel);

  // Give the page some breathing room so controls aren't hidden under the panel.
  document.body.style.paddingLeft = '320px';
})();

