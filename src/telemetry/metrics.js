/**
 * The launch metric vocabulary.
 *
 * The roadmap asks for launch metrics — "model start, story/compare
 * completion, learning completion, patient-guide use, conversion, retention
 * and renderer failures" — to be *defined*, not merely collected. This file is
 * that definition, and it is the only place an event may be declared.
 *
 * The privacy property is structural rather than promised. A property is one
 * of: an enumeration with a fixed value set, a registered scene id, a bounded
 * number, or a boolean. **There is no free-text property type.** A metric
 * therefore cannot carry a name, an email, a note or a search term, because
 * there is no shape for one to travel in. Diagnostics that genuinely need
 * prose — an error message — go down a separate, redacted channel
 * (`telemetry.reportError`), never through here.
 *
 * Pure data plus a validator: no DOM, no `three`, no network.
 */
import { SCENES } from '../catalog/index.js';

const SCENE_IDS = new Set(SCENES.map((scene) => scene.id));

/** Property constructors. Deliberately no `text()`. */
export const prop = {
  /** @param {string[]} values */
  enum: (values) => ({ kind: 'enum', values }),
  /** A scene id that exists in the catalogue. */
  sceneId: () => ({ kind: 'sceneId' }),
  /** @param {number} min @param {number} max */
  number: (min, max) => ({ kind: 'number', min, max }),
  /** Milliseconds, capped so a backgrounded tab cannot report a week. */
  duration: (maxMs = 3_600_000) => ({ kind: 'number', min: 0, max: maxMs }),
  boolean: () => ({ kind: 'boolean' }),
  /** An opaque 8-character fingerprint produced by `redact.js`. */
  fingerprint: () => ({ kind: 'fingerprint' }),
};

export const DEVICE_CLASSES = ['phone', 'tablet', 'desktop'];
export const SURFACES = ['landing', 'explorer', 'lab', 'trust', 'scene', 'fallback'];
export const VISIT_BUCKETS = ['first', 'returning', 'regular'];

/**
 * Every event the product may emit.
 *
 * `question` is not decoration: an event that cannot name the product question
 * it answers should not be collected, and writing it here is what stops the
 * list from growing into whatever was easy to instrument.
 */
export const METRICS = {
  'model.start': {
    question: 'Do people actually open a model, and which ones?',
    props: {
      scene: prop.sceneId(),
      surface: prop.enum(SURFACES),
      device: prop.enum(DEVICE_CLASSES),
    },
    required: ['scene', 'device'],
  },
  'model.ready': {
    question: 'How long does a first frame take on real devices?',
    props: {
      scene: prop.sceneId(),
      device: prop.enum(DEVICE_CLASSES),
      elapsedMs: prop.duration(60_000),
      withinBudget: prop.boolean(),
    },
    required: ['scene', 'device', 'elapsedMs', 'withinBudget'],
  },
  'model.quality': {
    question: 'How often does the frame budget force a degradation, and on what?',
    props: {
      scene: prop.sceneId(),
      device: prop.enum(DEVICE_CLASSES),
      tier: prop.enum(['high', 'medium', 'low']),
      direction: prop.enum(['degrade', 'recover']),
      meanFps: prop.number(0, 240),
    },
    required: ['device', 'tier', 'direction'],
  },
  'story.complete': {
    question: 'Do people reach the end of a guided explanation?',
    props: {
      scene: prop.sceneId(),
      steps: prop.number(0, 64),
      elapsedMs: prop.duration(),
    },
    required: ['scene', 'steps'],
  },
  'compare.complete': {
    question: 'Is side-by-side comparison used, or only offered?',
    props: { scene: prop.sceneId(), elapsedMs: prop.duration() },
    required: ['scene'],
  },
  'learning.complete': {
    question: 'Does the educational layer get finished, or abandoned?',
    props: {
      scene: prop.sceneId(),
      modules: prop.number(0, 64),
      correct: prop.number(0, 64),
      elapsedMs: prop.duration(),
    },
    required: ['scene', 'modules'],
  },
  'patient_guide.open': {
    question: 'Is the patient-facing presenter used in practice?',
    props: { scene: prop.sceneId(), fullscreen: prop.boolean() },
    required: ['scene'],
  },
  'reel.export': {
    question: 'Does the SNS entry layer produce anything anybody keeps?',
    props: {
      scene: prop.sceneId(),
      format: prop.enum(['png', 'sequence']),
      /** The ids in `ControlPanel.CAPTURE_PRESETS`, so the metric can name what was chosen. */
      preset: prop.enum(['view', 'reel', 'portrait', 'square', 'wide']),
    },
    required: ['scene', 'format'],
  },
  'trust.open': {
    question: 'Do people look at the evidence boundary before relying on a claim?',
    props: { surface: prop.enum(SURFACES), scene: prop.sceneId() },
    required: [],
  },
  'account.conversion': {
    question: 'Where in the product does a purchase decision actually happen?',
    props: {
      step: prop.enum(['pricing_view', 'checkout_start', 'checkout_complete', 'cancelled']),
      plan: prop.enum(['patient', 'education', 'complete']),
      scene: prop.sceneId(),
    },
    required: ['step'],
  },
  'session.visit': {
    question: 'Do people come back? (Coarse buckets only — no persistent identifier.)',
    props: {
      bucket: prop.enum(VISIT_BUCKETS),
      device: prop.enum(DEVICE_CLASSES),
      surface: prop.enum(SURFACES),
    },
    required: ['bucket', 'device'],
  },
  'renderer.failure': {
    question: 'How often does WebGL fail, and does the fallback catch it?',
    props: {
      scene: prop.sceneId(),
      device: prop.enum(DEVICE_CLASSES),
      reason: prop.enum(['no_context', 'scene_error', 'asset_error', 'unknown']),
      fingerprint: prop.fingerprint(),
      fallbackShown: prop.boolean(),
    },
    required: ['reason', 'device'],
  },
  'error.captured': {
    question: 'Which failures are widespread rather than one unlucky session?',
    props: {
      fingerprint: prop.fingerprint(),
      surface: prop.enum(SURFACES),
      handled: prop.boolean(),
    },
    required: ['fingerprint'],
  },
  'feedback.submitted': {
    question: 'Is the feedback route reachable from where people get stuck?',
    props: {
      surface: prop.enum(SURFACES),
      category: prop.enum(['medical', 'bug', 'usability', 'other']),
      scene: prop.sceneId(),
    },
    required: ['surface', 'category'],
  },
};

export const METRIC_NAMES = Object.keys(METRICS);

/** @param {string} name */
export const metricByName = (name) => METRICS[name] ?? null;

/**
 * Everything wrong with one event, as human-readable lines.
 *
 * Returned rather than thrown so the runtime can drop a bad event quietly
 * while the test suite fails loudly on the same function.
 *
 * @param {string} name
 * @param {Record<string, unknown>} [props]
 * @param {{ sceneIds?: Set<string> }} [options]
 * @returns {string[]}
 */
export function validateEvent(name, props = {}, { sceneIds = SCENE_IDS } = {}) {
  const metric = metricByName(name);
  if (!metric) return [`unknown metric "${name}"`];

  const problems = [];
  for (const key of metric.required) {
    if (props[key] == null) problems.push(`${name}: missing required property "${key}"`);
  }

  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    const spec = metric.props[key];
    if (!spec) {
      problems.push(`${name}: undeclared property "${key}"`);
      continue;
    }
    if (spec.kind === 'enum' && !spec.values.includes(value)) {
      problems.push(`${name}.${key}: "${value}" is not one of ${spec.values.join(', ')}`);
    }
    if (spec.kind === 'sceneId' && !sceneIds.has(value)) {
      problems.push(`${name}.${key}: "${value}" is not a registered scene`);
    }
    if (spec.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        problems.push(`${name}.${key}: not a finite number`);
      } else if (value < spec.min || value > spec.max) {
        problems.push(`${name}.${key}: ${value} outside [${spec.min}, ${spec.max}]`);
      }
    }
    if (spec.kind === 'boolean' && typeof value !== 'boolean') {
      problems.push(`${name}.${key}: not a boolean`);
    }
    if (spec.kind === 'fingerprint' && !/^[0-9a-f]{8}$/.test(String(value))) {
      problems.push(`${name}.${key}: not an 8-character fingerprint`);
    }
  }

  return problems;
}

/**
 * Coerce an event into something the vocabulary accepts, dropping what it
 * cannot. Bounded numbers are clamped rather than discarded — an elapsed time
 * from a tab that was backgrounded for an hour is still evidence that the tab
 * was backgrounded.
 *
 * @param {string} name
 * @param {Record<string, unknown>} [props]
 */
export function coerceEvent(name, props = {}) {
  const metric = metricByName(name);
  if (!metric) return null;
  const clean = {};
  for (const [key, value] of Object.entries(props)) {
    const spec = metric.props[key];
    if (!spec || value == null) continue;
    if (spec.kind === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = Math.min(spec.max, Math.max(spec.min, Math.round(value)));
      continue;
    }
    clean[key] = value;
  }
  return validateEvent(name, clean).length === 0 ? clean : null;
}

/**
 * The vocabulary's own consistency, as human-readable lines.
 *
 * Checked by the test suite the same way `validateCatalog` is: a metric that
 * requires an undeclared property, or that smuggles in a free-text shape,
 * is a defect in the definition rather than in a caller.
 */
export function validateMetricVocabulary(metrics = METRICS) {
  const problems = [];
  const allowedKinds = new Set(['enum', 'sceneId', 'number', 'boolean', 'fingerprint']);

  for (const [name, metric] of Object.entries(metrics)) {
    const where = `metric "${name}"`;
    if (!/^[a-z_]+\.[a-z_]+$/.test(name)) problems.push(`${where}: name must be "area.event"`);
    if (!metric.question) problems.push(`${where}: does not say which question it answers`);
    if (!metric.props || Object.keys(metric.props).length === 0) {
      problems.push(`${where}: has no properties`);
    }
    for (const [key, spec] of Object.entries(metric.props ?? {})) {
      if (!allowedKinds.has(spec?.kind)) {
        problems.push(`${where}.${key}: "${spec?.kind}" is not a permitted property kind`);
      }
      if (spec?.kind === 'enum' && (!Array.isArray(spec.values) || spec.values.length === 0)) {
        problems.push(`${where}.${key}: enum with no values is free text by another name`);
      }
      if (spec?.kind === 'number' && !(spec.min < spec.max)) {
        problems.push(`${where}.${key}: number needs a real range`);
      }
    }
    for (const key of metric.required ?? []) {
      if (!metric.props?.[key]) problems.push(`${where}: requires undeclared property "${key}"`);
    }
  }

  return problems;
}
