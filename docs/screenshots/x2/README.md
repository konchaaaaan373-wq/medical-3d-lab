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
