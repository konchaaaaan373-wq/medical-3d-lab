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
  // A console laid out as cards (the experiment layout) keeps its controls in
  // a closed <details> until the reader opens it: open the one that holds this.
  if (!(await target.isVisible().catch(() => false))) {
    const card = await target
      .evaluate((node) => {
        const holder = node.closest('details.console-card');
        return holder && !holder.open ? holder.dataset.card : null;
      })
      .catch(() => null);
    if (card) {
      // Pressed at the chevron (the right of the heading), as a reader does.
      // On a phone an open card can hide the other's heading until it is
      // closed, so close whichever is open first.
      const press = async (head) => {
        const box = await head.boundingBox();
        await head.click({ position: { x: box.width - 20, y: box.height / 2 } });
        await page.waitForTimeout(300);
      };
      const head = page.locator(`details.console-card[data-card="${card}"] > summary`);
      if (!(await head.isVisible().catch(() => false))) {
        const open = page.locator('details.console-card[open] > summary');
        if (await open.count()) await press(open.first());
      }
      await press(head);
    }
  }
  if (!(await target.isVisible().catch(() => false))) {
    const more = page.locator('button[data-control="more"]');
    if ((await more.count()) && (await more.first().isVisible().catch(() => false))) {
      await more.first().click();
    }
  }
  await target.click();
}
