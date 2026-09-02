# Model cards — and why they carry a revision

A model card says what a model answers, what it does not, and where it can
mislead. An evidence dossier says where the numbers came from. A clinical
review signs a specific commit.

All three describe a piece of source code, and **none of them notices when that
code changes.** That gap is the one that matters most here. A model card
describing a model that has since been rewritten is not out of date in the
harmless sense — it is a medical statement about software that no longer
behaves that way, published under a review with somebody's name on it.

## How the gap is closed

`revisions.json` records, for each scene: the card, the model sources it
describes, a revision number, and a digest of those sources.

```bash
npm run revisions:check   # what has drifted; writes nothing. CI runs this.
npm run revisions:adopt   # after updating the card: bump and record
```

A medical change that leaves the card untouched fails CI with an instruction
rather than a puzzle. `adopt` is a separate command on purpose: a tool that
silently re-recorded the digest would restore the exact gap it exists to close.

The digest is over file **content only** — not paths, not timestamps — so
moving a model without changing it does not read as a medical change, and
changing it without moving it does.

## This is not review staleness

A neighbouring question, deliberately answered somewhere else.
`docs/clinical-reviews/registry.json` records `stalePaths` for each review, and
`src/catalog/clinicalReview.js` turns that into a `stale` status the Explorer,
the scene title cards and the Trust page all read. That asks: **does this
attestation still describe the code, and may it still be shown as current?**

This registry asks: **does the model card still describe the model?**

They come apart in both directions. A review can be correctly marked stale
while its card is perfectly accurate, and a card can be out of date under a
scene whose review was never current in the first place. Two obligations, two
mechanisms, and neither is a copy of the other — which is worth stating,
because they were briefly implemented twice.

## The one on the record today

`portal-hypertension` was reviewed at `b77cb83`. The hepatorenal work later
added `meanArterialPressureMmHg` as a control, so a model of the systemic
circulation could supply the inlet pressure this model previously asserted as a
constant. It defaults to the reviewed value, so reviewed behaviour is unchanged
— but the model at any *other* inlet pressure has not been clinically reviewed.

Its review is `stale` in the registry, with the changed paths recorded, and the
Trust page shows them. `copd-hyperinflation` and `asthma-heterogeneity` are in
the same state for the same reason.

Nobody was hiding any of it; there was simply nothing that would have noticed.
