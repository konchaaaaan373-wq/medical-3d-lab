# X2 — finding a structure by name

`search-japanese-1280x800.png` — 「海馬」 typed into the Parts tab. The exact
matches come first; below them are structures that match because a name above
them in the atlas's own hierarchy contains the word (海馬体 → 海馬傍回). Each row
carries the side and the level above it, so two structures with the same name
are told apart before they are chosen.

`tree-restored-1280x800.png` — the same panel after Escape: the search is
cleared, the tree is back, and the list is at the place it was scrolled to
before the search started.

Conditions: production build served locally, Chromium 141.0.7390.37 headless,
1280×800. Driven, not posed — the run that produced these also asserted that
「hippocampus」/「海馬」/full-width Latin reach the same structures, that a paired
name stays two ids, that choosing a result pins that structure, that a name the
atlas does not carry says so and leaves the selection alone, and that Escape
returns the tree to its previous scroll position.

## The actions on a chosen structure

`actions-deep-structure-selected.png` — 「視床」 searched, a hypothalamic
structure chosen from the results. It is under the cortex, so the panel offers
**見える位置に表示** alongside 寄る / この部位だけ / 非表示.

`actions-after-show-it.png` — after **見える位置に表示**: the anatomical layer
has moved (through the console's own slider, which moved with it), the cortex is
a ghost and the deep structures are drawn. The offer is replaced by **元の表示へ**,
because it has now been done. No anatomy moved to achieve this.

`actions-after-hide.png` — after **非表示**: the structure is off screen and
still the pinned one, and the card says 「— 非表示」 rather than leaving a reader
hunting for something the display is deliberately not drawing. **非表示を解除**
appears while anything is hidden.

Driven, not posed: the same run asserted that going to it keeps the selection,
that showing it stops being offered once done and offers the way back, that
hiding leaves the structure selected and flagged, and that the way back returns
the display to what it was.
