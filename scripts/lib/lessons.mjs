/**
 * Reading the verification-lessons ledger, and refusing to let it rot.
 *
 * `docs/verification-lessons.md` records the times a check was green while
 * measuring nothing. A ledger like that decays in one specific way: the guard a
 * lesson names gets renamed or deleted, the lesson keeps claiming it, and the
 * next person reads "this is covered" about something that is not.
 *
 * So the guards are named in backticks, and this resolves every one of them. A
 * lesson whose guard is gone is a failure — which forces the choice back into
 * the open: restore the guard, or rewrite the lesson to say **人だけ**.
 *
 * It deliberately does *not* check that the guard still measures the right
 * thing. Nothing mechanical can (that is the whole subject of the ledger), and
 * a check that pretended to would be the ledger's own L-01.
 */
import { existsSync, readFileSync } from 'node:fs';

/** The three things a lesson has to say to be worth keeping. */
export const REQUIRED_FIELDS = Object.freeze(['症状', 'どう見つかったか', 'いま何が捕まえるか']);

/** How a lesson says "nothing mechanical catches this yet". */
export const HUMAN_ONLY = '人だけ';

/**
 * How covered a lesson is, in the only three states that matter.
 *
 * The middle one is the one this got wrong. A lesson that names a guard *and*
 * says **人だけ** is saying both things on purpose — half of it is caught and
 * half is not — and counting it as covered takes it out of the tally without
 * anything having been built. L-16 is the live example: `npm run lessons`
 * catches a duplicate lesson number, and nothing at all catches a duplicate
 * F number, and the entry says so in one breath. Read as `guarded`, the
 * number this ledger exists to drive down fell by one for free.
 *
 * `partly` is therefore counted with `human`: the tally answers "how many of
 * these still need a person", and half of one still does.
 */
export const COVERAGE = Object.freeze({ guarded: 'guarded', partly: 'partly', human: 'human' });

/**
 * What a lesson's **いま何が捕まえるか** field claims.
 *
 * @param {string} guard the field's text
 * @param {string[]} named guard tokens this can resolve
 * @returns {'guarded' | 'partly' | 'human'}
 */
export function coverageOf(guard, named) {
  const human = guard.includes(HUMAN_ONLY);
  if (!human) return COVERAGE.guarded;
  return named.length > 0 ? COVERAGE.partly : COVERAGE.human;
}

const HEADING = /^### (L-\d+)\s+(.+)$/;
const FIELD = /^- \*\*(.+?)\*\*:\s*([\s\S]*)$/;

/**
 * Split the ledger into lessons, each with its fields.
 *
 * Fenced code blocks are skipped: the "how to write one" example in the
 * document is a template, not a lesson, and counting it would make the ledger
 * describe itself.
 *
 * @param {string} markdown
 * @returns {{id: string, title: string, fields: Map<string, string>, line: number}[]}
 */
export function parseLessons(markdown) {
  const lessons = [];
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

    const heading = HEADING.exec(line);
    if (heading) {
      current = { id: heading[1], title: heading[2].trim(), fields: new Map(), line: index + 1 };
      field = null;
      lessons.push(current);
      continue;
    }
    if (!current) continue;
    if (/^#{1,3} /.test(line)) {
      // A section heading (`## A. …`) ends the lesson before it.
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
    // Continuation lines: a field's text wraps, and the guard is often on the
    // second line. Reading only the first line would drop it, and the lesson
    // would look like it named no guard at all.
    if (field && /^\s+\S/.test(line)) {
      current.fields.set(field, `${current.fields.get(field)}\n${line.trim()}`);
      continue;
    }
    if (line.trim() === '') field = null;
  }
  return lessons;
}

/** Every backticked token in a string. */
const ticks = (text) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());

/**
 * What a guard token points at, if anything this can resolve.
 *
 * Only two shapes are checkable: a path in the repository and an npm script.
 * Anything else in backticks is prose about the guard (a function name, a CSS
 * selector, a flag) and is left alone — the ledger is written for people first.
 *
 * @param {string} token
 * @returns {'path' | 'script' | null}
 */
export function guardKind(token) {
  if (/^npm run [\w:-]+$/.test(token)) return 'script';
  if (/^[\w./-]+\.(?:m?js|json|css|md|ya?ml)$/.test(token) && token.includes('/')) return 'path';
  return null;
}

/**
 * Check the ledger. Returns problems; an empty array is a healthy ledger.
 *
 * @param {object} options
 * @param {string} options.markdown the ledger's text
 * @param {(path: string) => boolean} [options.exists] for testing
 * @param {string[]} [options.scripts] npm script names
 * @returns {{problems: string[], lessons: ReturnType<typeof parseLessons>, humanOnly: string[]}}
 */
export function auditLessons({ markdown, exists = existsSync, scripts = [] }) {
  const lessons = parseLessons(markdown);
  const problems = [];
  const humanOnly = [];

  if (lessons.length === 0) problems.push('the ledger has no lessons in it at all');

  const seen = new Map();
  for (const lesson of lessons) {
    const where = `${lesson.id} (line ${lesson.line})`;
    if (seen.has(lesson.id)) {
      problems.push(`${where}: the number is already used by "${seen.get(lesson.id)}" — numbers are never reused`);
    }
    seen.set(lesson.id, lesson.title);

    for (const required of REQUIRED_FIELDS) {
      // Present *and* saying something. `- **症状**:` with nothing after it
      // parses to an empty string, and a `has()` check accepts it — so the
      // ledger would report itself well-formed while an entry stated none of
      // the three facts. Emptiness is read after the parse, not during it,
      // because a field whose text starts on the wrapped next line is legal.
      if (!lesson.fields.has(required)) {
        problems.push(`${where}: no **${required}** field`);
      } else if (lesson.fields.get(required).trim() === '') {
        problems.push(`${where}: **${required}** is empty`);
      }
    }

    const guard = lesson.fields.get(REQUIRED_FIELDS[2]) ?? '';
    const tokens = ticks(guard);
    const named = tokens.filter((token) => guardKind(token) !== null);
    const coverage = coverageOf(guard, named);
    lesson.coverage = coverage;

    if (coverage === COVERAGE.guarded && named.length === 0) {
      problems.push(
        `${where}: names no guard. Either point at a file or an \`npm run\` script, or say **${HUMAN_ONLY}** —`
          + ' a lesson that claims coverage without naming it is the thing this ledger is about'
      );
    }
    // `partly` counts here too: it is the half nobody has built yet.
    if (coverage !== COVERAGE.guarded) {
      humanOnly.push(`${lesson.id} ${lesson.title}${coverage === COVERAGE.partly ? ' (partly)' : ''}`);
    }

    for (const token of named) {
      const kind = guardKind(token);
      if (kind === 'path' && !exists(token)) {
        problems.push(`${where}: the guard \`${token}\` is not in the repository any more`);
      }
      if (kind === 'script' && !scripts.includes(token.slice('npm run '.length))) {
        problems.push(`${where}: the guard \`${token}\` is not a script in package.json`);
      }
    }
  }

  return { problems, lessons, humanOnly };
}

/** Read the ledger and the package scripts off disk, then audit. */
export function auditLedgerFile(ledgerPath, packageJsonPath) {
  const markdown = readFileSync(ledgerPath, 'utf8');
  const scripts = Object.keys(JSON.parse(readFileSync(packageJsonPath, 'utf8')).scripts ?? {});
  return auditLessons({ markdown, scripts });
}
