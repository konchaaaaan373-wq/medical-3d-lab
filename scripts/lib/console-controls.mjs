/**
 * Pressing a console button the way a reader has to.
 *
 * A scene may put some of its console buttons behind "More"
 * (`meta.console.overflow`; cardiac-output puts the camera, the display
 * options, the reel and the image export there). The button is still in the
 * document, so `locator.count()` finds it — and `click()` then waits thirty
 * seconds for a button no reader can see and fails as a timeout, which reads
 * like the product hung rather than like the check not knowing where the
 * button went. So: if it is not visible and a "More" menu is, open the menu
 * first. Nothing is forced; a button that is hidden for any other reason still
 * fails exactly as it did.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector
 */
export async function pressConsoleControl(page, selector) {
  const target = page.locator(selector).first();
  if (!(await target.isVisible().catch(() => false))) {
    const more = page.locator('button[data-control="more"]');
    if ((await more.count()) && (await more.first().isVisible().catch(() => false))) {
      await more.first().click();
    }
  }
  await target.click();
}
