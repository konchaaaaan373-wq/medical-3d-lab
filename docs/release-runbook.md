# Release runbook

How a version of Medical 3D Lab reaches the public, how it is rolled back, and
who answers when something goes wrong. Gate 3 in
[`public-release-roadmap.md`](public-release-roadmap.md) owns whether we are
ready to use it; this owns how it is done.

---

## 1. What a release is

A release is a **git tag on a commit that passed CI**, plus a changelog entry
and a deploy pinned to that commit. It is not "whatever is on `main` right
now": a rollback needs a specific thing to go back to.

```
v<major>.<minor>.<patch>
```

- **patch** — fixes, copy, performance. No change to a medical claim.
- **minor** — a new scene, a new capability, a scene promoted in maturity.
- **major** — a change to how the product presents medical confidence: a
  status meaning, a review standard, the evidence contract.

**A change to a medical model is never a patch**, whatever its size. If
`npm run revisions:check` reports a new digest, the release is at least a
minor, and the changelog says which model and what changed.

## 2. Before tagging

Everything here is automated. If a step needs judgement, it is in §3.

```bash
npm ci
npm test                 # unit, catalogue, medical, privacy, accessibility
npm run revisions:check  # model cards describe the models they are filed against
npm run build
npm run budget           # ship weight against the declared budget
npm run verify:site      # every public scene has a crawlable page

npm i --no-save playwright && npx playwright install --with-deps chromium
npm run verify:ui        # the viewport matrix, measured in a real browser
```

CI runs all of these on every pull request — `verify:ui` in its own job,
because it downloads a browser and must not sit in front of the unit tests.
Running them again before a tag is not redundant: it is the difference between
"a commit passed" and "this commit passed".

`verify:ui` is Chromium only, and prints what it cannot cover at the end of
every run. Those lines are the manual pass in §3, not a disclaimer.

## 3. What a person still has to decide

- **Did any medical claim change?** `revisions:check` reports a digest change.
  A human decides whether the model card, the evidence dossier and the review
  state have all kept up.
- **Did a clinical review go stale?** If so it must be re-signed or recorded as
  superseded, per [`model-cards/README.md`](model-cards/README.md). A release
  must not ship a stale review that has not said so.
- **Does anything on screen claim more than it can?** Check a Prototype badge
  has not been dropped, and that a scene showing numbers has all four of the
  model layer, evidence dossier, model card and scope panel.
- **Does it work on a phone that is not this one?** `verify:ui` has already
  measured layout, target sizes and the focus ring at 320–1280 px, so this is
  no longer a matter of remembering to look. What is left is the part it
  cannot reach: Safari and Firefox, a real finger orbiting a scene, a software
  keyboard over the viewport, and a screen reader. The script lists them.

## 4. Tagging and deploying

```bash
git tag -a v0.2.0 -m "Short summary"
git push origin v0.2.0
```

Then deploy that tag — not a branch. Production must be traceable to a tag that
passed CI, or the rollback in §5 has nowhere to go.

Set for the deploy:

| Variable | Why |
| --- | --- |
| `VITE_SITE_URL` | Without it there is no sitemap and no canonical URLs |
| `VITE_RELEASE` | Labels the telemetry batches so a spike can be attributed |
| `VITE_TELEMETRY_ENDPOINT`, `VITE_FEEDBACK_ENDPOINT` | Same-origin; see [`observability.md`](observability.md) |
| `BILLING_RECONCILE_TOKEN`, `OPS_ALERT_WEBHOOK` | See [`access-and-billing.md`](access-and-billing.md) |

## 5. Rollback

**Redeploy the previous tag.** Do not revert on `main` and wait for a build:
the fastest safe action is to put back a commit that was already known good.

```bash
git tag -l --sort=-v:refname | head -5   # the last few known-good tags
```

Then, in order:

1. Redeploy the previous tag. The product is back.
2. Say so in the changelog under the failed version: what happened, and that it
   was rolled back. A version that shipped and was withdrawn is part of the
   record.
3. Only then work out the fix, on a branch, with a test that would have caught
   it.

**What rollback does not undo.** Supabase migrations are forward-only, and a
Stripe subscription created under the bad version still exists. Before a
migration ships, check that the previous version tolerates the new schema — an
added table or a nullable column does; a renamed or dropped column does not,
and that migration needs a two-release plan.

The billing ledger is what makes the billing half recoverable: every event the
bad version saw is still recorded, and `billing-reconcile` re-derives local
state from Stripe afterwards.

## 6. When something is wrong in production

| Signal | Where it appears |
| --- | --- |
| Renderer failure rate | `renderer.failure` metric |
| Start-up over budget | `model.ready` with `withinBudget: false` |
| Webhook failures | `webhook_failed` alert, and `outcome = 'failed'` in `billing_events` |
| Entitlement drift | `billing-reconcile`, on its schedule |
| A medical error report | Feedback, category `medical` |

**A medical error report outranks everything else on this list**, including a
billing failure. A wrong number that somebody teaches from is the failure this
product cannot absorb: correct it, or take the claim down, before anything
else. The rest can wait a day.

### Incident owner

One person owns an incident from the moment it is opened until it is closed:
they decide whether to roll back, they write the changelog entry, and they
answer the reporter. The role rotates; it is never "whoever is around", because
that is how two people both assume the other is handling it.

Until a rota exists, the repository owner is the incident owner by default.
Record the name in the changelog entry for the affected version, so it is
answerable after the fact.

### Support response path

1. Feedback arrives (in-product) or a report arrives by email.
2. Acknowledge within one working day. An acknowledgement is not a fix.
3. Medical reports go to the model card and the evidence dossier, not to a
   patch note. If the claim was wrong, the correction is a versioned change to
   the card (§1) and the person who reported it is told what changed.
4. Billing reports are answered against the ledger, which is why it exists.

## 7. The changelog

[`../CHANGELOG.md`](../CHANGELOG.md), newest first, one section per tag. Every
entry answers, for a reader who does not read this repository:

- what they can now do that they could not,
- what changed about a medical claim, and
- what was withdrawn, if anything.

Not a list of commits. A reader of a changelog is not looking for a diff.
