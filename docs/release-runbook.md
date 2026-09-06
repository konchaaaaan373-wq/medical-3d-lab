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

`verify:ui` runs Chromium, Firefox and WebKit in CI, and prints what it still
cannot cover at the end of every run. Those lines are the manual pass in §3,
not a disclaimer — WebKit is Safari's engine, not Safari on a handset.

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
| `VITE_RELEASE` | Labels the telemetry batches so a spike can be attributed |
| `VITE_TELEMETRY_ENDPOINT`, `VITE_FEEDBACK_ENDPOINT` | Same-origin; see [`observability.md`](observability.md) |
| `BILLING_RECONCILE_TOKEN`, `OPS_ALERT_WEBHOOK` | See [`access-and-billing.md`](access-and-billing.md) |

**The production origin is `https://med-3d-lab.necofindjob.com`, and it is set
in [`netlify.toml`](../netlify.toml)** as `VITE_SITE_URL` — not in a dashboard,
so moving the site is a commit that is reviewed and revertible. A preview
deploy gets the variable empty on purpose: it is not the site, so it claims no
canonical and emits no sitemap. Nothing in `src/` names the domain either way;
the build takes the origin from its environment and guesses nothing without it.

After the deploy, check the site that is actually being served:

```bash
npm run verify:live -- https://med-3d-lab.necofindjob.com
```

It fetches robots.txt, the sitemap, the home page, every scene page and the
preview card, and fails if the deployed build names any other host — which is
what a deploy that did not take, or took from the wrong branch, looks like from
outside.

### Changing the primary domain

The origin is baked into the build, so **a domain change that is not followed by
a rebuild leaves every page naming the old host** — invisible in a browser,
decisive to a crawler. Two of these steps are ordered before the cutover on
purpose: Supabase and Stripe both key on the origin, and doing them afterwards
means a window in which password reset and webhook delivery are broken for
everyone already on the new domain.

Prepare, before the domain moves:

1. Add the new origin to Supabase Auth's redirect allowlist, keeping the old one
   until the move is done. Password reset sends the user back to
   `window.location.origin`, so an origin Supabase does not recognise makes
   reset fail for everybody on the new domain.
2. Add a Stripe webhook endpoint at
   `<new-origin>/.netlify/functions/stripe-webhook`, alongside the existing one.
   A new endpoint has a **new signing secret**: set `STRIPE_WEBHOOK_SECRET` from
   it in the same deploy as step 4, or every event fails signature verification
   and paid access stops updating. Two live endpoints are safe — the webhook is
   idempotent per event and the ledger records what it has already processed.

Then move:

3. Point the domain at the host and set it as the primary domain; wait for the
   certificate.
4. Change `VITE_SITE_URL` in [`netlify.toml`](../netlify.toml) to the new
   origin, merge it, set `STRIPE_WEBHOOK_SECRET` to the new endpoint's secret,
   and **redeploy**. Nothing is rebuilt without this step, so without it every
   page still names the old host.
5. Verify the rebuild before trusting it:

   ```bash
   npm run verify:site -- --origin <new-origin>
   ```

   Given the origin the build was meant for, this fails when the sitemap or any
   page's canonical, `og:url` or preview image names something else. Without
   `--origin` it can only check that the output agrees with itself — and a build
   made with a stale `VITE_SITE_URL` agrees with itself perfectly.
6. Keep the previous host serving a redirect for as long as links to it exist.
   A shared model URL outlives the domain it was shared from.

Then confirm, against the deployed site rather than the build:

7. `npm run billing:check -- <new-origin>` — see
   [`billing-operations-runbook.md`](billing-operations-runbook.md).
8. Check the deployed site, not the build — this, not step 5, is what catches a
   domain that moved without a redeploy:

   ```bash
   npm run verify:live -- <new-origin> --redirects-from <old-origin>
   ```

   Then resubmit the sitemap to Search Console. (`verify:live` confirms the
   preview card is served; whether it *renders* is still worth one real share.)
9. Retire the old Stripe webhook endpoint and drop the old origin from the
   Supabase allowlist once the redirect has been in place long enough that no
   live session is still on it.

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
