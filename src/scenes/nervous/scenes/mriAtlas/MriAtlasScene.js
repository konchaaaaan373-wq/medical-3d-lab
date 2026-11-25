import { DISCLAIMER, DISCLAIMER_JA, MODEL_SCOPE } from '../../../../data/mriAtlas.js';

/**
 * The MRI atlas: a standard-brain MRI in three planes, linked to the same
 * structures in 3D.
 *
 * ## What it is and is not
 *
 * An **anatomy** scene. It says where named structures are — on a slice and in
 * space — and nothing about what they do; its model profile's mechanism level
 * is `none`, and the release gate holds it to that. The MRI is the MNI ICBM 152
 * (2009c, nonlinear symmetric) template: an average of 152 young adults, not a
 * person, and never a reference a patient's scan can be compared with.
 *
 * It is *not* the anatomy scene's atlas (`brainAnatomy/`) seen another way.
 * That one is a composite built for looking at the organ; this one is built
 * from a single label volume so that 3D and MRI are the same coordinates. Two
 * builders for one organ with two purposes — the case `CLAUDE.md` describes
 * under "Organ と Disease を混ぜない", not a duplicate.
 *
 * ## Why it does not use the model shell
 *
 * `layout: 'atlas'` hands the page to `AtlasShell.js`, the way a lesson is
 * handed to `LessonShell.js`. The model shell is one full-screen canvas with
 * panels over it; this is a list, a 3D view and three image planes side by
 * side, with a renderer that fills one column and can be absent altogether.
 * The scene owns the workbench; the shell owns the page around it.
 */
export class MriAtlasScene {
  static meta = {
    id: 'mri-atlas',
    status: 'alpha',
    layout: 'atlas',
    title: 'MRI atlas of the brain',
    titleJa: '脳 MRI アトラス',
    subtitle: 'Three planes of a standard-brain MRI, linked to the same structures in 3D',
    subtitleJa: '標準脳 MRI の三断面と、同じ構造の 3D',
    modelScope: MODEL_SCOPE,
    // One quiet 「このモデルについて」 line that opens the scope, the sources and the
    // review state — the workbench needs the height a row of badges would take.
    titleCard: { foldTrust: true },
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER,
    disclaimerShortJa: DISCLAIMER_JA,
  };

  /**
   * Build the workbench into `host`.
   *
   * The workbench module — and through it `three`, the loaders and the volume
   * code — is imported here, not at the top of this file: the catalogue's
   * loader reaches this class to read `meta`, and reading a title should not
   * cost the atlas.
   */
  async mountWorkbench(options) {
    const { mountMriAtlasWorkbench } = await import('./MriAtlasWorkbench.js');
    this.workbench = await mountMriAtlasWorkbench(options);
    return this.workbench;
  }
}
