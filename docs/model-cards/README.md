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

## Reviews that have gone stale

`docs/clinical-reviews/registry.json` records `reviewedModelDigest`: what the
model looked like at the commit the reviewer signed. When the current sources
no longer match it, the review is stale.

**A stale review is not automatically invalid.** It is a review of something
else, and saying so is the entire point of a versioned attestation. What is not
acceptable is a stale review that keeps quiet, so the registry must then carry:

```json
"modelChangedSinceReview": {
  "currentModelDigest": "…",
  "changedAt": "YYYY-MM-DD",
  "summary": "what changed",
  "effectOnReviewedBehaviour": "whether the reviewed behaviour still holds"
}
```

`tests/model-revisions.test.js` fails without it, the change is added to the
review's unresolved limitations, and the public Trust page shows it.

The digests are compared as two recorded facts rather than by asking git,
because CI checks out shallow and the reviewed commit may not be there to ask
about.

## The one on the record today

`portal-hypertension` was reviewed at `b77cb83`. The hepatorenal work later
added `meanArterialPressureMmHg` as a control, so a model of the systemic
circulation could supply the inlet pressure this model previously asserted as a
constant. It defaults to the reviewed value, so reviewed behaviour is unchanged
— but the model at any *other* inlet pressure has not been clinically reviewed,
and both the registry and the Trust page now say so.

That is what this mechanism is for. Nobody was hiding it; there was simply
nothing that would have noticed.
