import { el } from '../utils/dom.js';

const PUBLIC_STATUS_OPTIONS = Object.freeze([
  ['all', 'All maturity / すべて'],
  ['reviewed-plus', 'Reviewed + Production / Reviewed以上'],
  ['production', 'Production / Production'],
  ['reviewed', 'Reviewed / Reviewed'],
  ['alpha', 'Alpha / Alpha'],
]);

const LAB_STATUS_OPTIONS = Object.freeze([
  ['all', 'All experimental / すべて'],
  ['prototype', 'Prototype / Prototype'],
]);

/**
 * Search/filter chrome for a catalogue scope. Matching stays pure in
 * `explorerSearch.js`; this component owns only form state.
 *
 * Lab intentionally omits paid-mode filters because Prototype scenes cannot
 * advertise Patient/Education products. Showing those chips there would imply
 * a product capability the trust model explicitly forbids.
 *
 * @param {{scope?:'public'|'lab',onChange:(filters:{query:string,mode:string,status:string})=>void}} options
 */
export function createExplorerSearchControls({ scope = 'public', onChange }) {
  const isLab = scope === 'lab';
  const filters = { query: '', mode: 'all', status: 'all' };

  const input = el('input', {
    class: 'explorer-search-input',
    type: 'search',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: 'Search disease, organ or mechanism / 病態・臓器・機序を検索',
    'aria-label': 'Search scenes by disease, organ or mechanism',
    on: {
      input: (event) => {
        filters.query = event.currentTarget.value;
        emit();
      },
      keydown: (event) => {
        if (event.key !== 'Escape' || !input.value) return;
        event.preventDefault();
        input.value = '';
        filters.query = '';
        emit();
      },
    },
  });

  const modeButtons = new Map();
  const mode = isLab
    ? null
    : el(
        'div',
        { class: 'explorer-filter-group', 'aria-label': 'Product mode filter' },
        [
          ['all', 'All', 'すべて'],
          ['patient', 'Patient', '患者説明'],
          ['education', 'Education', '医学教育'],
        ].map(([id, label, labelJa]) => {
          const button = el(
            'button',
            {
              class: `explorer-filter-chip${id === 'all' ? ' is-current' : ''}`,
              type: 'button',
              'aria-pressed': id === 'all' ? 'true' : 'false',
              on: {
                click: () => {
                  filters.mode = id;
                  syncModeButtons();
                  emit();
                },
              },
            },
            [
              el('span', { class: 'lang-en', text: label }),
              el('span', { class: 'lang-ja', text: labelJa }),
            ]
          );
          modeButtons.set(id, button);
          return button;
        })
      );

  const statusOptions = isLab ? LAB_STATUS_OPTIONS : PUBLIC_STATUS_OPTIONS;
  const status = el(
    'select',
    {
      class: 'explorer-filter-select',
      'aria-label': 'Filter by scene maturity',
      on: {
        change: (event) => {
          filters.status = event.currentTarget.value;
          emit();
        },
      },
    },
    statusOptions.map(([value, label]) => el('option', { value, text: label }))
  );

  const countEn = el('span', { class: 'lang-en' });
  const countJa = el('span', { class: 'lang-ja' });
  const count = el('span', { class: 'explorer-search-count', 'aria-live': 'polite' }, [countEn, countJa]);

  const clear = el(
    'button',
    {
      class: 'explorer-search-clear',
      type: 'button',
      on: { click: clearFilters },
    },
    [
      el('span', { class: 'lang-en', text: 'Clear' }),
      el('span', { class: 'lang-ja', text: '解除' }),
    ]
  );

  const row = [
    mode,
    el('label', { class: 'explorer-filter-status' }, [
      el('span', { class: 'explorer-filter-label lang-en', text: 'Maturity' }),
      el('span', { class: 'explorer-filter-label lang-ja', text: '完成度' }),
      status,
    ]),
    el('div', { class: 'explorer-search-summary' }, [count, clear]),
  ].filter(Boolean);

  const element = el('section', { class: 'explorer-search', 'aria-label': 'Search and filter scenes' }, [
    input,
    el('div', { class: 'explorer-search-row' }, row),
  ]);

  function syncModeButtons() {
    for (const [id, button] of modeButtons) {
      const current = id === filters.mode;
      button.classList.toggle('is-current', current);
      button.setAttribute('aria-pressed', String(current));
    }
  }

  function emit() {
    onChange({ ...filters });
  }

  function clearFilters() {
    filters.query = '';
    filters.mode = 'all';
    filters.status = 'all';
    input.value = '';
    status.value = 'all';
    syncModeButtons();
    emit();
    input.focus();
  }

  return {
    element,
    setCount({ visible, total, planned = 0 }) {
      const nounEn = isLab ? 'experiments' : 'models';
      const nounJa = isLab ? '実験モデル' : 'モデル';
      countEn.textContent = `${visible} of ${total} ${nounEn}${planned ? ` · ${planned} planned` : ''}`;
      countJa.textContent = `${total}件中 ${visible}件の${nounJa}${planned ? ` · 予定 ${planned}件` : ''}`;
    },
    clear: clearFilters,
    focus: () => input.focus(),
  };
}
