/**
 * The contract between an anatomy scene and the surfaces that read it.
 *
 * Three things in this product point at the same structure — the 3D model, the
 * part tree, and the detail card — and until this file existed they agreed by
 * coincidence. Each read the scene in its own way, so "the thing you clicked"
 * and "the row that is highlighted" and "the name on the card" were three
 * answers that happened to match. The first time they stop matching, a reader is
 * told a structure's name while looking at a different structure, which for an
 * anatomy product is the whole failure.
 *
 * So there is one identifier and one set of methods, and this file is where
 * both are written down. `anatomyContractProblems()` is what holds a scene to
 * it, and `tests/anatomy-contract.test.js` runs that against the real brain.
 *
 * ## The identifier
 *
 * A **structure id** is whatever the scene's own atlas calls a part — for the
 * brain, the `bx_id` in the GLB's metadata. It is opaque: nothing outside the
 * scene may parse it, derive it, or make one up. Everything that names a
 * structure passes this same value:
 *
 * - `getAnatomySelection().id` — what is selected now
 * - `selectStructure(id)` — select it
 * - `getAnatomyTree()` leaves — `structureId`
 * - `isolateStructure(id)` / `getAnatomyIsolation()`
 *
 * Group nodes in the tree are **not** structures, and carry a `nodeId` that is
 * deliberately shaped so it can never be mistaken for one (`group:` prefix).
 * Passing a group id to `selectStructure` fails rather than selecting
 * something approximate.
 *
 * ## What is display and what is identity
 *
 * Colour mode, viewpoint and the anatomical-layer slider are **display**. None
 * of them may change which structure is selected — recolouring the model is not
 * a statement about anatomy, and a reader who has pinned a structure and then
 * changes the colours has not asked to select something else.
 *
 * Isolation is display too, and it is the one with a trap: hiding everything
 * else must also stop the hidden meshes being clickable. A ray does not know a
 * mesh is invisible, so a scene that only drops opacity will happily select the
 * structure a reader can no longer see.
 *
 * Pure. No DOM, no `three`: it describes a shape and checks one.
 */

/** Bump when a method is added, removed or changes meaning. */
export const ANATOMY_CONTRACT_VERSION = 1;

/** Methods every anatomy scene must have. A missing one is a broken surface. */
export const ANATOMY_CONTRACT_METHODS = Object.freeze([
  'getAnatomySelection',
  'onAnatomySelection',
  'selectStructure',
  'clearSelection',
  'getAnatomyStatus',
  'onAnatomyStatus',
  'getAnatomyTree',
  'isolateStructure',
  'clearIsolation',
  'getAnatomyIsolation',
  'onAnatomyIsolation',
]);

/** Optional, and checked when present rather than assumed. */
export const ANATOMY_CONTRACT_OPTIONAL_METHODS = Object.freeze([
  'getAnatomyHover',
  'onAnatomyHover',
  'getAnatomyViews',
  'setAnatomyView',
  'getAnatomyColorModes',
  'setAnatomyColorMode',
]);

/** The prefix that makes a grouping node unmistakable for a structure. */
export const GROUP_ID_PREFIX = 'group:';

/** @param {unknown} value */
export const isGroupId = (value) => typeof value === 'string' && value.startsWith(GROUP_ID_PREFIX);

/**
 * Fields a selection must carry.
 *
 * `id` first, because it is the one every surface keys on. The rest is what a
 * card needs in order to say something in both languages without asking the
 * scene a second question.
 */
export const SELECTION_FIELDS = Object.freeze(['id', 'name', 'nameJa', 'breadcrumb', 'breadcrumbJa']);

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Build a part tree from flat structures, grouping on the hierarchy each one
 * already carries.
 *
 * Generic on purpose: the hierarchy is the scene's, and this only nests it. A
 * second organ gets a tree by describing its own structures, not by writing a
 * second tree builder — which is what keeps the tree and the model from
 * drifting into two different opinions about where a part sits.
 *
 * Sibling order is first-seen order at every level, so the tree reads in the
 * order the atlas declares rather than alphabetically in one language and not
 * the other.
 *
 * @param {Array<{id: number|string, name: string, nameJa: string,
 *   hierarchy: string[], hierarchyJa: string[]}>} structures
 * @returns {Array<object>} root nodes
 */
export function buildAnatomyTree(structures) {
  const roots = [];
  const byPath = new Map();

  for (const structure of structures) {
    // The last element of the hierarchy is the structure's own family, not a
    // level above it; grouping on the whole path would give every leaf a
    // parent of one. Grouping stops one short, so siblings share a parent.
    const path = (structure.hierarchy ?? []).slice(0, -1);
    const pathJa = (structure.hierarchyJa ?? []).slice(0, -1);

    let siblings = roots;
    let key = '';
    for (const [depth, label] of path.entries()) {
      key = key ? `${key}/${label}` : label;
      let node = byPath.get(key);
      if (!node) {
        node = {
          nodeId: `${GROUP_ID_PREFIX}${key}`,
          label,
          labelJa: pathJa[depth] ?? label,
          depth,
          children: [],
        };
        byPath.set(key, node);
        siblings.push(node);
      }
      siblings = node.children;
    }

    siblings.push({
      nodeId: String(structure.id),
      structureId: structure.id,
      label: structure.name,
      labelJa: structure.nameJa,
      depth: path.length,
      children: [],
    });
  }

  return roots;
}

/** Every leaf of a tree, in reading order. */
export function treeLeaves(nodes, out = []) {
  for (const node of nodes) {
    if (node.structureId !== undefined) out.push(node);
    else treeLeaves(node.children, out);
  }
  return out;
}

/** Every node of a tree, groups included, in reading order. */
export function treeNodes(nodes, out = []) {
  for (const node of nodes) {
    out.push(node);
    treeNodes(node.children, out);
  }
  return out;
}

/**
 * Everything wrong with a scene's anatomy surface, as readable lines.
 *
 * Structural checks always; the behavioural ones only once the scene reports
 * itself ready, because a scene whose atlas is still loading has nothing to be
 * consistent about yet.
 *
 * It restores whatever it changed. A validator that leaves a scene selected on
 * some arbitrary structure is one nobody dares call from the app.
 *
 * @param {object} scene
 * @returns {string[]}
 */
export function anatomyContractProblems(scene) {
  const problems = [];
  if (!scene) return ['no scene'];

  for (const method of ANATOMY_CONTRACT_METHODS) {
    if (typeof scene[method] !== 'function') problems.push(`does not implement ${method}()`);
  }
  for (const method of ANATOMY_CONTRACT_OPTIONAL_METHODS) {
    if (method in scene && typeof scene[method] !== 'function') {
      problems.push(`${method} is present but is not a function`);
    }
  }
  if (problems.length) return problems;

  if (scene.getAnatomyStatus()?.state !== 'ready') return problems;

  const tree = scene.getAnatomyTree();
  if (!Array.isArray(tree)) return [...problems, 'getAnatomyTree() did not return an array'];

  const leaves = treeLeaves(tree);
  if (!leaves.length) problems.push('the part tree has no structures in it');

  const seen = new Set();
  for (const node of treeNodes(tree)) {
    if (!nonEmpty(node.label) || !nonEmpty(node.labelJa)) {
      problems.push(`tree node "${node.nodeId}" is missing a label in one of the two languages`);
    }
    if (seen.has(node.nodeId)) problems.push(`tree node id "${node.nodeId}" appears twice`);
    seen.add(node.nodeId);

    const isLeaf = node.structureId !== undefined;
    if (isLeaf && isGroupId(node.nodeId)) problems.push(`structure "${node.nodeId}" is shaped like a group`);
    if (!isLeaf && !isGroupId(node.nodeId)) {
      problems.push(`group "${node.nodeId}" is not marked as one, so it could be read as a structure`);
    }
  }

  // The claim the whole file exists for: the id in the tree is the id the scene
  // selects by, and the id it then reports as selected.
  const before = scene.getAnatomySelection();
  const beforeIsolation = scene.getAnatomyIsolation();
  try {
    for (const leaf of leaves) {
      if (scene.selectStructure(leaf.structureId) !== true) {
        problems.push(`selectStructure(${leaf.structureId}) refused an id the tree offers`);
        continue;
      }
      const selection = scene.getAnatomySelection();
      for (const field of SELECTION_FIELDS) {
        if (selection?.[field] === undefined) problems.push(`the selection for ${leaf.structureId} has no ${field}`);
      }
      if (selection?.id !== leaf.structureId) {
        problems.push(`selecting ${leaf.structureId} reported ${selection?.id} as selected`);
      }
      if (selection?.name !== leaf.label) {
        problems.push(`the tree calls ${leaf.structureId} "${leaf.label}" and the selection calls it "${selection?.name}"`);
      }
    }

    // A group id is not a structure id, and must not resolve to something near.
    for (const node of treeNodes(tree)) {
      if (node.structureId !== undefined) continue;
      if (scene.selectStructure(node.nodeId) !== false) {
        problems.push(`selectStructure("${node.nodeId}") accepted a grouping node as a structure`);
      }
      break;
    }
  } finally {
    scene.clearIsolation();
    if (beforeIsolation != null) scene.isolateStructure(beforeIsolation);
    if (before?.id != null) scene.selectStructure(before.id);
    else scene.clearSelection();
  }

  return problems;
}
