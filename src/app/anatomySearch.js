/**
 * Finding a structure by name, in either language.
 *
 * This is an index over what the scene already knows — the inventory it builds
 * its own part tree from — and nothing else. There is no medical dictionary
 * here, no synonym generation, no inference from a symptom to a region: a
 * reader who types 「海馬」 or "hippocampus" is asking which of the atlas's own
 * structures carries that name, and answering with anything the atlas does not
 * say would be inventing anatomy at the search box.
 *
 * Pure: no DOM, no `three`, no fetch. What it takes in is the inventory; what
 * it gives back is structure ids in an order, and the reason each one matched.
 *
 * ## What is normalised, and what is not
 *
 * The *query* and the text it is compared against are normalised — NFKC, so
 * ｈｉｐｐｏｃａｍｐｕｓ and hippocampus are the same word and so are half- and
 * full-width kana; lower-cased; whitespace collapsed. **Ids are never
 * normalised.** They are the scene's own opaque values and are carried through
 * untouched.
 *
 * ## What counts as a match, and in what order
 *
 * Four ranks, strongest first, because a reader typing a whole name means that
 * name:
 *
 *  1. the structure's own name, exactly
 *  2. the structure's own name, from the start
 *  3. the structure's own name, anywhere inside
 *  4. a name above it in the atlas's own hierarchy — its region or its side
 *
 * Rank 4 is how 「側頭葉」 finds the gyri inside the temporal lobe without the
 * lobe pretending to be a selectable structure. Ties are broken by name and
 * then by id, so the same query always gives the same order.
 *
 * Left and right are separate structures with separate ids, and they stay
 * separate results: collapsing them onto one row, or answering a search for a
 * paired name with whichever side sorted first, is a left/right error with a
 * search box in front of it.
 */

/** Ranks, strongest first. Exported so a caller can label a row by why it hit. */
export const MATCH_RANK = Object.freeze({
  EXACT: 4,
  PREFIX: 3,
  CONTAINS: 2,
  ANCESTOR: 1,
});

/**
 * The comparable form of a piece of text.
 *
 * NFKC folds the width and compatibility differences that a Japanese IME and a
 * pasted English name produce — full-width Latin, half-width kana — into one
 * form, which is the whole reason a reader can type either. Case folding and
 * whitespace collapsing are the ordinary rest of it.
 *
 * @param {string} text
 */
export function normalizeSearchText(text) {
  if (typeof text !== 'string') return '';
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Build the index once, from the scene's own inventory.
 *
 * Each entry keeps the structure's id untouched and, beside it, the normalised
 * forms of the names it can be found by. `own` are the structure's own names;
 * `ancestors` are the names of the levels above it, which match at the weakest
 * rank.
 *
 * @param {Array<object>} structures the scene's inventory
 */
export function buildSearchIndex(structures = []) {
  const entries = [];
  for (const structure of structures) {
    if (structure?.id == null) continue;
    const own = [structure.name, structure.nameJa, structure.atlasName]
      .filter((value) => typeof value === 'string' && value.trim())
      .map(normalizeSearchText);
    // The last element of a hierarchy is the structure's own family, which is
    // its own name by another route rather than a level above it.
    const ancestors = [...(structure.hierarchy ?? []), ...(structure.hierarchyJa ?? [])]
      .filter((value) => typeof value === 'string' && value.trim())
      .map(normalizeSearchText);
    entries.push({
      id: structure.id,
      structure,
      own: [...new Set(own)],
      ancestors: [...new Set(ancestors)].filter((value) => !own.includes(value)),
      sortName: normalizeSearchText(structure.name ?? structure.nameJa ?? ''),
    });
  }
  return entries;
}

/**
 * The structures a query finds, best first.
 *
 * A query that normalises to nothing finds nothing — deliberately. Returning
 * everything for an empty box would be a list that looks like a result, and the
 * caller cannot tell the difference between "no query" and "no match" any more.
 *
 * @param {ReturnType<typeof buildSearchIndex>} index
 * @param {string} query
 * @param {{limit?: number}} [options]
 * @returns {Array<{id: any, structure: object, rank: number}>}
 */
export function searchStructures(index = [], query = '', { limit = 60 } = {}) {
  const needle = normalizeSearchText(query);
  if (!needle) return [];

  const hits = [];
  for (const entry of index) {
    let rank = 0;
    for (const name of entry.own) {
      if (name === needle) { rank = MATCH_RANK.EXACT; break; }
      if (name.startsWith(needle)) rank = Math.max(rank, MATCH_RANK.PREFIX);
      else if (name.includes(needle)) rank = Math.max(rank, MATCH_RANK.CONTAINS);
    }
    if (!rank) {
      for (const name of entry.ancestors) {
        if (name === needle || name.includes(needle)) { rank = MATCH_RANK.ANCESTOR; break; }
      }
    }
    if (rank) hits.push({ id: entry.id, structure: entry.structure, rank, sortName: entry.sortName });
  }

  hits.sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank;
    if (a.sortName !== b.sortName) return a.sortName < b.sortName ? -1 : 1;
    // Ids can be numbers or strings; compared as text they order the same way
    // every run, which is all a tie-break has to do.
    return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
  });

  return hits.slice(0, limit).map(({ id, structure, rank }) => ({ id, structure, rank }));
}
