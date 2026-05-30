(() => {
  const config = window.PORTFOLIO_VISUAL_THEME_CONFIG;
  const controlSections = window.PORTFOLIO_VISUAL_CONTROL_SECTIONS || [];
  const isLocalStudio = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
  const studioRequested = new URLSearchParams(window.location.search).has('studio');

  if (!config?.themes || !controlSections.length || (!isLocalStudio && !studioRequested)) return;

  function boot() {
    const runtime = window.__PORTFOLIO_RUNTIME__;
    if (!runtime) {
      window.addEventListener('portfolio-runtime-ready', boot, { once: true });
      return;
    }

    // createThemeStudio(runtime);
  }

  function createThemeStudio(runtime) {
    if (document.querySelector('#theme-studio')) return;

    const studio = element('aside', { id: 'theme-studio', class: 'theme-studio', 'aria-label': 'Theme Studio' });
    const launcher = element('button', {
      type: 'button',
      class: 'theme-studio-launcher',
      'aria-expanded': 'false'
    }, 'Theme Studio');
    const header = element('div', { class: 'theme-studio-header' });
    const title = element('div', {}, [
      element('strong', {}, config.studio.title || 'Theme Studio'),
      element('span', {}, config.studio.description || 'Live visual controls')
    ]);
    const closeButton = element('button', { type: 'button', class: 'theme-studio-close' }, 'Hide');
    const toolbar = element('div', { class: 'theme-studio-toolbar' });
    const themeSelect = element('select', { class: 'theme-studio-select', 'aria-label': 'Theme to edit' });
    const applyButton = element('button', { type: 'button' }, 'Apply Mode');
    const exportButton = element('button', { type: 'button' }, 'Export Theme');
    const resetButton = element('button', { type: 'button' }, 'Reset Unsaved');
    const body = element('div', { class: 'theme-studio-body' });
    const output = element('textarea', {
      class: 'theme-studio-output',
      rows: '9',
      readonly: 'readonly',
      placeholder: 'Exported theme JSON appears here.'
    });

    Object.keys(config.themes).forEach((themeName) => {
      themeSelect.append(element('option', { value: themeName }, themeName));
    });
    themeSelect.value = runtime.activeThemeName || 'day';

    header.append(title, closeButton);
    toolbar.append(themeSelect, applyButton, exportButton, resetButton);
    studio.append(header, toolbar, body, output);
    document.body.append(launcher, studio);

    if (config.studio.openByDefault) {
      setOpen(true);
    }

    function setOpen(open) {
      studio.classList.toggle('is-open', open);
      launcher.setAttribute('aria-expanded', String(open));
    }

    function rebuildControls() {
      body.innerHTML = '';
      controlSections.forEach((section) => {
        const details = element('details', { class: 'theme-studio-section', open: 'open' });
        details.append(element('summary', {}, [
          element('strong', {}, section.title),
          element('span', {}, section.description)
        ]));

        const sectionBody = element('div', { class: 'theme-studio-section-body' });
        section.controls.forEach((control) => sectionBody.append(createControl(control)));
        details.append(sectionBody);
        body.append(details);
      });
    }

    function createControl(control) {
      const row = element('label', { class: `theme-studio-control is-${control.type}` });
      const label = element('span', { class: 'theme-studio-control-label' }, [
        element('strong', {}, control.label),
        element('small', {}, control.description)
      ]);
      const editor = element('div', { class: 'theme-studio-control-editor' });
      const value = getThemeValue(themeSelect.value, control.path);

      if (control.type === 'color') {
        editor.append(...createColorEditor(value, (nextValue) => updateThemeValue(control.path, nextValue)));
      } else if (control.type === 'number') {
        editor.append(createNumberEditor(value, control, (nextValue) => updateThemeValue(control.path, nextValue)));
      } else if (control.type === 'select') {
        editor.append(createSelectEditor(value, control, (nextValue) => updateThemeValue(control.path, nextValue)));
      } else if (control.type === 'vector') {
        editor.append(createVectorEditor(value, control, (nextValue) => updateThemeValue(control.path, nextValue)));
      } else if (control.type === 'boolean') {
        editor.append(createBooleanEditor(value, (nextValue) => updateThemeValue(control.path, nextValue)));
      } else {
        editor.append(createTextEditor(value, (nextValue) => updateThemeValue(control.path, nextValue)));
      }

      row.append(label, editor);
      return row;
    }

    function updateThemeValue(path, value) {
      setThemeValue(themeSelect.value, path, value);
      if (typeof window.syncPortfolioThemesFromVisualConfig === 'function') {
        window.syncPortfolioThemesFromVisualConfig();
      }
      runtime.syncVisualConfig?.();
    }

    launcher.addEventListener('click', () => setOpen(!studio.classList.contains('is-open')));
    closeButton.addEventListener('click', () => setOpen(false));
    themeSelect.addEventListener('change', rebuildControls);
    applyButton.addEventListener('click', () => runtime.switchTheme?.(themeSelect.value));
    exportButton.addEventListener('click', () => {
      output.value = JSON.stringify(config.themes[themeSelect.value], null, 2);
      output.focus();
      output.select();
    });
    resetButton.addEventListener('click', () => window.location.reload());

    rebuildControls();
  }

  function createColorEditor(initialValue, onChange) {
    const safeHex = normalizeHex(initialValue);
    const colorInput = element('input', { type: 'color', value: safeHex, title: 'Color picker' });
    const hexInput = element('input', { type: 'text', value: safeHex, maxlength: '7', spellcheck: 'false', title: 'Hex color' });

    function setEverywhere(hex, commit) {
      const normalized = normalizeHex(hex);
      colorInput.value = normalized;
      hexInput.value = normalized;
      if (commit) onChange(normalized);
    }

    colorInput.addEventListener('input', () => setEverywhere(colorInput.value, true));
    hexInput.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(hexInput.value)) {
        setEverywhere(hexInput.value, true);
      }
    });

    return [
      element('div', { class: 'theme-studio-color-main' }, [colorInput, hexInput])
    ];
  }

  function createSelectEditor(initialValue, control, onChange) {
    const select = element('select', { value: initialValue ?? '' });

    (control.options || []).forEach((option) => {
      const value = typeof option === 'string' ? option : option.value;
      const label = typeof option === 'string' ? option : option.label;
      select.append(element('option', { value }, label));
    });

    select.value = initialValue ?? '';
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  function createNumberEditor(initialValue, control, onChange) {
    const wrap = element('div', { class: 'theme-studio-number' });
    const range = element('input', {
      type: 'range',
      min: control.min ?? 0,
      max: control.max ?? 1,
      step: control.step ?? 0.01,
      value: Number(initialValue ?? 0)
    });
    const number = element('input', {
      type: 'number',
      min: control.min ?? 0,
      max: control.max ?? 1,
      step: control.step ?? 0.01,
      value: Number(initialValue ?? 0)
    });

    function sync(value) {
      const next = Number(value);
      range.value = String(next);
      number.value = String(next);
      onChange(next);
    }

    range.addEventListener('input', () => sync(range.value));
    number.addEventListener('input', () => sync(number.value));
    wrap.append(range, number);
    return wrap;
  }

  function createVectorEditor(initialValue, control, onChange) {
    const values = Array.isArray(initialValue) ? initialValue : [0, 0, 0];
    const wrap = element('div', { class: 'theme-studio-vector' });
    const numberInputs = values.map((value, index) => {
      const axis = ['X', 'Y', 'Z'][index] || String(index + 1);
      const number = element('input', {
        type: 'number',
        min: control.min ?? -4000,
        max: control.max ?? 4000,
        step: control.step ?? 1,
        value
      });
      const row = element('label', {}, [element('span', {}, axis), number]);
      number.addEventListener('input', () => {
        onChange(numberInputs.map((input) => Number(input.value)));
      });
      wrap.append(row);
      return number;
    });
    return wrap;
  }

  function createBooleanEditor(initialValue, onChange) {
    const input = element('input', { type: 'checkbox' });
    input.checked = Boolean(initialValue);
    input.addEventListener('change', () => onChange(input.checked));
    return input;
  }

  function createTextEditor(initialValue, onChange) {
    const input = element('input', { type: 'text', value: initialValue ?? '', spellcheck: 'false' });
    input.addEventListener('change', () => onChange(input.value));
    return input;
  }

  function getThemeValue(themeName, path) {
    return String(path).split('.').reduce((target, key) => target?.[key], config.themes[themeName]);
  }

  function setThemeValue(themeName, path, value) {
    const parts = String(path).split('.');
    const last = parts.pop();
    const target = parts.reduce((node, key) => node[key], config.themes[themeName]);
    target[last] = value;
  }

  function element(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      node.setAttribute(key, String(value));
    });
    const childList = Array.isArray(children) ? children : [children];
    childList.forEach((child) => node.append(child instanceof Node ? child : document.createTextNode(String(child))));
    return node;
  }

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
  }

  function normalizeHex(value) {
    const raw = String(value || '#000000').trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
    if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toUpperCase();
    return '#000000';
  }

  function hexToRgb(hex) {
    const raw = normalizeHex(hex).replace('#', '');
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16)
    ];
  }

  function rgbToHex(rgb) {
    return `#${rgb.map((value) => clampByte(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }

  boot();
})();
