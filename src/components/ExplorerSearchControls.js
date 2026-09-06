import { el } from '../utils/dom.js';

const PUBLIC_STATUS_OPTIONS = Object.freeze([
  ['all', 'All stages', 'すべて'],
  ['reviewed-plus', 'Reviewed + Production', 'Reviewed以上'],
  ['production', 'Production', 'Production'],
  ['reviewed', 'Model reviewed', 'モデルレビュー済み'],
  ['alpha', 'Alpha', 'Alpha'],
]);

const PUBLIC_REVIEW_OPTIONS = Object.freeze([
  ['all', 'All review states', 'すべて'],
  ['reviewed', 'Clinical review complete', '医学レビュー完了'],
  ['pending', 'Clinical review pending', '医学レビュー未完了'],
  ['legacy-unversioned', 'Legacy / unversioned', '旧基準・版固定なし'],
]);

const LAB_STATUS_OPTIONS = Object.freeze([
  ['all', 'All experiments', 'すべて'],
  ['prototype', 'Prototype', 'Prototype'],
]);

/**
 * Search/filter chrome for a catalogue scope. Matching stays pure in
 * `explorerSearch.js`; this component owns only form state.
 *
 * Lab intentionally omits paid-mode and clinical-review filters because
 * Prototype scenes cannot advertise professional products and are not part of
 * the public clinical-review shelf.
 *
 * @param {{scope?:'public'|'lab',onChange:(filters:{query:string,mode:string,status:string,review:string})=>void}} options
 */
export function createExplorerSearchControls({ scope = 'public', onChange }) {
  const isLab = scope === 'lab';
  const filters = { query: '', mode: 'all', status: 'all', review: 'all' };

  const input = el('input', {
    class: 'explorer-search-input',
    type: 'search',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: '病態・臓器・機序から検索',
    'aria-label': '病態・臓器・機序からシーンを検索',
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
        { class: 'explorer-filter-group', 'aria-label': '用途で絞り込む' },
        [
          ['all', 'All', 'すべて'],
          ['patient', 'Patient', '患者説明'],
          ['education', 'Education', '医学教育'],
          ['clinical-learning', 'Clinical cases', '臨床ケース'],
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
      'aria-label': 'Filter by model maturity',
      on: {
        change: (event) => {
          filters.status = event.currentTarget.value;
          emit();
        },
      },
    },
    statusOptions.map(([value, , labelJa]) => el('option', { value, text: labelJa }))
  );

  const review = isLab
    ? null
    : el(
        'select',
        {
          class: 'explorer-filter-select',
          'aria-label': 'Filter by clinical review',
          on: {
            change: (event) => {
              filters.review = event.currentTarget.value;
              emit();
            },
          },
        },
        PUBLIC_REVIEW_OPTIONS.map(([value, , labelJa]) => el('option', { value, text: labelJa }))
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
      el('span', { class: 'explorer-filter-label lang-ja', text: 'モデル成熟度' }),
      status,
    ]),
    review
      ? el('label', { class: 'explorer-filter-status' }, [
          el('span', { class: 'explorer-filter-label lang-en', text: 'Clinical review' }),
          el('span', { class: 'explorer-filter-label lang-ja', text: '医学レビュー' }),
          review,
        ])
      : null,
    el('div', { class: 'explorer-search-summary' }, [count, clear]),
  ].filter(Boolean);

  const element = el('section', { class: 'explorer-search', 'aria-label': 'シーンを検索・絞り込み' }, [
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
    filters.review = 'all';
    input.value = '';
    status.value = 'all';
    if (review) review.value = 'all';
    syncModeButtons();
    emit();
    input.focus();
  }

  function setLanguage(language) {
    const japanese = language !== 'en';
    input.placeholder = japanese
      ? '病態・臓器・機序から検索'
      : 'Search by disease, organ or mechanism';
    input.setAttribute(
      'aria-label',
      japanese ? '病態・臓器・機序からシーンを検索' : 'Search scenes by disease, organ or mechanism'
    );
    element.setAttribute('aria-label', japanese ? 'シーンを検索・絞り込み' : 'Search and filter scenes');
    mode?.setAttribute('aria-label', japanese ? '用途で絞り込む' : 'Filter by use');
    status.setAttribute('aria-label', japanese ? 'モデル成熟度で絞り込む' : 'Filter by model maturity');
    review?.setAttribute('aria-label', japanese ? '医学レビュー状態で絞り込む' : 'Filter by clinical review');
    clear.setAttribute('aria-label', japanese ? '検索条件を解除' : 'Clear filters');

    [...status.options].forEach((option, index) => {
      const [, labelEn, labelJa] = statusOptions[index];
      option.textContent = japanese ? labelJa : labelEn;
    });
    if (review) {
      [...review.options].forEach((option, index) => {
        const [, labelEn, labelJa] = PUBLIC_REVIEW_OPTIONS[index];
        option.textContent = japanese ? labelJa : labelEn;
      });
    }
  }

  setLanguage('ja');

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
    setLanguage,
  };
}
