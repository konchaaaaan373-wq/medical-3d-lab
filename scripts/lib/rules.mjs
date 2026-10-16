/**
 * Reading the operating-rules ledger, and refusing to let a rule disappear.
 *
 * `docs/rules.md` records the things the owner decided to do from now on, one
 * dated entry each. A ledger like that rots in two ways that a reader cannot
 * see from the page: a rule gets *deleted* when it is changed, so the reason
 * for the change goes with it, and two entries that contradict each other sit
 * side by side with nothing saying which one wins.
 *
 * So the ledger has one ordering rule — the newer date wins — and this keeps
 * the shape that makes that rule mechanical: every entry has a date in its
 * id, the current section is sorted newest first, a replaced entry is moved to
 * the archive rather than removed, and the two entries point at each other.
 *
 * It does not check that a rule is right, or still wanted. Nothing mechanical
 * can, and a check that pretended to would be `verification-lessons.md` L-01.
 */
import { readFileSync } from 'node:fs';

/** The three things a rule has to say. */
export const REQUIRED_FIELDS = Object.freeze(['決めたこと', 'なぜ', '置き換えるもの']);

/** The line an archived rule gains when it is moved. */
export const REPLACED_BY = '置き換えたもの';

/** How a rule says it replaces nothing. */
export const NOTHING = 'なし';

export const SECTION = Object.freeze({ active: 'active', archive: 'archive', none: 'none' });

const HEADING = /^### (R-\d{4}-\d{2}-\d{2}-\d{2})\s*(?:—|-)?\s*(.+)$/;
const FIELD = /^- \*\*(.+?)\*\*:\s*([\s\S]*)$/;
const ACTIVE_HEADING = /^## 現行/;
const ARCHIVE_HEADING = /^## アーカイブ/;
const ID = /R-\d{4}-\d{2}-\d{2}-\d{2}/g;

/**
 * Is the date inside an id a real calendar date?
 *
 * `R-2026-13-40-01` sorts fine and means nothing. The ordering rule only works
 * when the ids are dates, so a bad one is refused rather than sorted.
 *
 * @param {string} id
 */
export function hasRealDate(id) {
  const [, year, month, day] = /^R-(\d{4})-(\d{2})-(\d{2})-\d{2}$/.exec(id) ?? [];
  if (!year) return false;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day)
  );
}

/**
 * Split the ledger into rules, each with its fields and the section it sits in.
 *
 * Fenced blocks are skipped: the "how to write one" template is an example,
 * not a rule, and counting it would make the ledger describe itself.
 *
 * @param {string} markdown
 * @returns {{id: string, title: string, section: string, fields: Map<string, string>, line: number}[]}
 */
export function parseRules(markdown) {
  const rules = [];
  let section = SECTION.none;
  let current = null;
  let field = null;
  let fenced = false;

  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    if (/^## /.test(line)) {
      if (ACTIVE_HEADING.test(line)) section = SECTION.active;
      else if (ARCHIVE_HEADING.test(line)) section = SECTION.archive;
      else section = SECTION.none;
      current = null;
      field = null;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      current = { id: heading[1], title: heading[2].trim(), section, fields: new Map(), line: index + 1 };
      field = null;
      rules.push(current);
      continue;
    }
    if (!current) continue;
    if (/^#{1,3} /.test(line)) {
      current = null;
      field = null;
      continue;
    }

    const matched = FIELD.exec(line);
    if (matched) {
      field = matched[1].trim();
      current.fields.set(field, matched[2].trim());
      continue;
    }
    // A field's text wraps; the id it names is often on the second line.
    if (field && /^\s+\S/.test(line)) {
      current.fields.set(field, `${current.fields.get(field)}\n${line.trim()}`);
      continue;
    }
    if (line.trim() === '') field = null;
  }
  return rules;
}

/** Every rule id named in a field. */
const named = (text) => [...(text ?? '').matchAll(ID)].map((match) => match[0]);

/**
 * Everything wrong with the ledger that a machine can be sure of.
 *
 * @param {{markdown: string}} input
 * @returns {{problems: string[], rules: ReturnType<typeof parseRules>, active: ReturnType<typeof parseRules>, archived: ReturnType<typeof parseRules>}}
 */
export function auditRules({ markdown }) {
  const problems = [];
  const rules = parseRules(markdown);
  const byId = new Map();
  const where = (rule) => `${rule.id} (line ${rule.line})`;

  for (const rule of rules) {
    if (byId.has(rule.id)) {
      problems.push(`${where(rule)}: number already used by "${byId.get(rule.id).title}" (line ${byId.get(rule.id).line})`);
    } else {
      byId.set(rule.id, rule);
    }
    if (!hasRealDate(rule.id)) problems.push(`${where(rule)}: the date in the id is not a calendar date`);
    if (rule.section === SECTION.none) {
      problems.push(`${where(rule)}: sits outside both the 現行 and アーカイブ sections`);
    }
    for (const name of REQUIRED_FIELDS) {
      if (!rule.fields.has(name)) problems.push(`${where(rule)}: no **${name}** field`);
      else if (rule.fields.get(name) === '') problems.push(`${where(rule)}: **${name}** is empty`);
    }
  }

  const active = rules.filter((rule) => rule.section === SECTION.active);
  const archived = rules.filter((rule) => rule.section === SECTION.archive);

  // Newest first, so the first entry a reader meets is the one that wins.
  for (let index = 1; index < active.length; index += 1) {
    if (active[index].id > active[index - 1].id) {
      problems.push(
        `${where(active[index])}: is newer than ${active[index - 1].id} above it — 現行 is sorted newest first`,
      );
    }
  }

  for (const rule of rules) {
    const replaces = rule.fields.get('置き換えるもの');
    if (replaces === undefined) continue;
    const ids = named(replaces);
    if (ids.length === 0 && !replaces.includes(NOTHING)) {
      problems.push(`${where(rule)}: **置き換えるもの** names no rule and does not say ${NOTHING}`);
    }
    for (const id of ids) {
      const target = byId.get(id);
      if (!target) {
        problems.push(
          `${where(rule)}: replaces ${id}, which is not in the ledger — a replaced rule is moved to the archive, not deleted`,
        );
        continue;
      }
      if (target.section !== SECTION.archive) {
        problems.push(`${where(rule)}: replaces ${id}, which is still in 現行 — move it to the archive`);
      }
      if (id >= rule.id) {
        problems.push(`${where(rule)}: replaces ${id}, which is not older than it — the newer date wins`);
      }
    }
  }

  for (const rule of active) {
    if (rule.fields.has(REPLACED_BY)) {
      problems.push(`${where(rule)}: says **${REPLACED_BY}** but sits in 現行 — a replaced rule belongs in the archive`);
    }
  }

  for (const rule of archived) {
    const by = rule.fields.get(REPLACED_BY);
    const ids = named(by);
    if (by === undefined || ids.length === 0) {
      problems.push(`${where(rule)}: is archived but names no **${REPLACED_BY}** — which rule replaced it?`);
      continue;
    }
    for (const id of ids) {
      const replacer = byId.get(id);
      if (!replacer) {
        problems.push(`${where(rule)}: replaced by ${id}, which is not in the ledger`);
        continue;
      }
      if (!named(replacer.fields.get('置き換えるもの')).includes(rule.id)) {
        problems.push(`${where(rule)}: says ${id} replaced it, but ${id} does not name it under **置き換えるもの**`);
      }
    }
  }

  return { problems, rules, active, archived };
}

/**
 * The next free id for a given day.
 *
 * @param {ReturnType<typeof parseRules>} rules
 * @param {string} day `YYYY-MM-DD`
 */
export function nextId(rules, day) {
  const taken = rules
    .map((rule) => rule.id)
    .filter((id) => id.startsWith(`R-${day}-`))
    .map((id) => Number(id.slice(-2)));
  const next = taken.length ? Math.max(...taken) + 1 : 1;
  return `R-${day}-${String(next).padStart(2, '0')}`;
}

/**
 * @param {string} ledgerPath
 */
export function auditLedgerFile(ledgerPath) {
  return auditRules({ markdown: readFileSync(ledgerPath, 'utf8') });
}
