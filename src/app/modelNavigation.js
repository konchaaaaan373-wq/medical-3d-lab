import { MODEL_LAYERS } from '../catalog/publicManifest.js';

/**
 * The published models as a two-level map: organ first, then the layer within
 * that organ.
 *
 * ## Why two levels
 *
 * The scene header used to print one chip per published model and name each
 * by its organ — until two models shared an organ, when both fell back to their
 * full titles. With the heart's anatomy and its cardiac-output scene both open,
 * the row read `脳 / 触れて学ぶ心臓の解剖 / 心拍出量 / 肺 / 肝臓`: three organs, a
 * model title and a topic on one level, and on a 390 px phone the lungs and the
 * liver fell off the end of it.
 *
 * The product is organised as organs, each with layers (CLAUDE.md: the anatomy
 * layer, and what sits on it). So is this: one entry per organ, which is the
 * word a reader came with, and inside it one entry per model, named by the
 * layer it belongs to. The organ row stays four short words however many models
 * an organ grows.
 *
 * Pure data in, pure data out — no DOM — so `node --test` can hold the rules.
 */

const LAYER_ORDER = Object.freeze(['anatomy', 'mechanism', 'pathology']);

/**
 * @typedef {object} LayerEntry
 * @property {string} sceneId
 * @property {string} route
 * @property {'anatomy'|'mechanism'|'pathology'} layer
 * @property {{en:string, ja:string}} kind   the layer's own name
 * @property {{en:string, ja:string}} name   what the entry says
 * @property {boolean} showKind  whether `kind` is printed beside `name`; false
 *   when the name *is* the layer (a lone anatomy model is called 解剖)
 * @property {boolean} current
 */

/**
 * @typedef {object} OrganEntry
 * @property {string} organId
 * @property {{en:string, ja:string}} name
 * @property {string} route  the organ's first model — its anatomy, when it has one
 * @property {ReadonlyArray<LayerEntry>} models  in layer order, then catalogue order
 * @property {boolean} current
 */

/**
 * @param {ReadonlyArray<import('../catalog/publicManifest.js').PublicModel>} models
 * @param {string|null} [currentSceneId]
 * @returns {{ organs: ReadonlyArray<OrganEntry>, currentOrgan: OrganEntry|null, currentModel: LayerEntry|null }}
 */
export function organLayerNavigation(models = [], currentSceneId = null) {
  /** @type {Map<string, {organId:string, name:{en:string, ja:string}, rows:any[]}>} */
  const byOrgan = new Map();
  for (const model of models) {
    if (!model?.sceneId || !model.organId) continue;
    let organ = byOrgan.get(model.organId);
    if (!organ) {
      organ = {
        organId: model.organId,
        name: { en: model.organLabel ?? model.organId, ja: model.organLabelJa ?? model.organId },
        rows: [],
      };
      byOrgan.set(model.organId, organ);
    }
    organ.rows.push(model);
  }

  const layerRank = (layer) => {
    const at = LAYER_ORDER.indexOf(layer);
    return at === -1 ? LAYER_ORDER.length : at;
  };

  const organs = [...byOrgan.values()].map((organ) => {
    // Stable sort: layer first, catalogue order within a layer.
    const rows = organ.rows
      .map((model, index) => ({ model, index }))
      .sort((a, b) => layerRank(a.model.layer) - layerRank(b.model.layer) || a.index - b.index)
      .map(({ model }) => model);

    const perLayer = new Map();
    for (const model of rows) perLayer.set(model.layer, (perLayer.get(model.layer) ?? 0) + 1);

    const entries = rows.map((model) => {
      const layer = MODEL_LAYERS[model.layer] ? model.layer : 'anatomy';
      const kind = { en: MODEL_LAYERS[layer].en, ja: MODEL_LAYERS[layer].ja };
      // A lone anatomy model is *the* anatomy of that organ, so the layer's own
      // name is the clearest thing to call it. Anything else — a mechanism, a
      // disease, or a second anatomy model — needs its own title to be told
      // apart, and keeps the layer beside it so the level stays visible.
      const nameIsLayer = layer === 'anatomy' && perLayer.get(model.layer) === 1;
      return Object.freeze({
        sceneId: model.sceneId,
        route: model.route,
        layer,
        kind: Object.freeze(kind),
        name: Object.freeze(nameIsLayer ? kind : { en: model.titleEn ?? model.titleJa, ja: model.titleJa }),
        showKind: !nameIsLayer,
        current: model.sceneId === currentSceneId,
      });
    });

    return Object.freeze({
      organId: organ.organId,
      name: Object.freeze(organ.name),
      route: entries[0].route,
      models: Object.freeze(entries),
      current: entries.some((entry) => entry.current),
    });
  });

  const currentOrgan = organs.find((organ) => organ.current) ?? null;
  const currentModel = currentOrgan?.models.find((entry) => entry.current) ?? null;
  return { organs: Object.freeze(organs), currentOrgan, currentModel };
}
