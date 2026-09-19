import { el } from '../utils/dom.js';
import { inLanguage, onLanguageChange } from '../utils/language.js';
import { BUILD_COMMIT, BUILD_REVIEW, buildLabel, isProductionBuild } from '../app/buildIdentity.js';

/**
 * A line saying this is not the site, on every build that is not the site.
 *
 * Nothing on a Netlify preview distinguishes it from production by eye, and a
 * merged pull request's preview is frozen for good — it can never show a later
 * fix, however many times it is reloaded. That cost two rounds of "this is
 * still broken" / "it is fixed" about the same screen, both correct, before
 * anyone read the address bar (L-51).
 *
 * So the build says what it is, and says it **where the reporting happens**:
 * it survives hiding the controls, because the screenshot that gets sent is
 * usually the one with everything hidden. A scripted capture still gets a
 * clean frame — `is-capture` takes this with it, the same way it takes the way
 * back.
 *
 * Production renders nothing at all. There is no flag to forget: the marker's
 * existence is decided by the same constant the deploy sets.
 */
export function createBuildMarker() {
  if (isProductionBuild()) return null;

  const marker = el('p', {
    class: 'build-marker',
    // Not a live region and not a control: a reader who cannot see it is not
    // missing an action, and it must not interrupt anything. It is read when
    // the reader walks the page, which is when it is useful.
    role: 'note',
  });

  // One language in the DOM, not two.
  //
  // Everywhere else in this app both are rendered and CSS hides one — but
  // every one of those rules is written `#ui[data-lang='ja'] .lang-en`, and
  // this element is deliberately **outside** `#ui` so that hiding the controls
  // cannot take it. Rendered the usual way it read
  // "Not the live site — …公開中のサイトではありません — …", both at once, which
  // is what the first build of it actually did.
  // Short enough for one line beside the way back on a 390 px phone — the
  // first version wrapped to two and nearly collided with it. The sentence
  // that explains what "preview" costs the reader lives in the `title`, where
  // it does not have to fit.
  const paint = () => {
    marker.textContent = buildLabel(inLanguage(true, false));
    marker.title = inLanguage(
      BUILD_REVIEW
        ? `A preview build of PR #${BUILD_REVIEW} (${BUILD_COMMIT.slice(0, 7)}). This is not the published site, and a merged pull request's preview never rebuilds.`
        : 'This is not the published site.',
      BUILD_REVIEW
        ? `PR #${BUILD_REVIEW} のプレビュービルド（${BUILD_COMMIT.slice(0, 7)}）です。公開中のサイトではなく、マージ済みの PR のプレビューは以後更新されません。`
        : 'このページは公開中のサイトのビルドではありません。',
    );
  };
  paint();
  onLanguageChange(paint);
  return marker;
}
