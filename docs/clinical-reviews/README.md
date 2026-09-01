# Clinical review registry

This directory is the versioned source of truth for **medical review attestations**.
It exists because a catalogue badge, a large test suite, or a model that is internally
consistent is not evidence that a clinician reviewed the medical claims in the exact
version a user is seeing.

## What a review record means

A `reviewStatus: "reviewed"` record means that the named **scope** was reviewed against
the named source material at the recorded repository commit. It does **not** mean that
anything added after that commit was reviewed.

In particular:

- engineering maturity and medical review are different facts;
- `production` or `alpha` describes implementation/release maturity and must not be used
  as a substitute for a review attestation;
- Patient and Education guides require their own review scope before a paid public launch;
- a review of causal direction does not convert calibration constants into measurements;
- unresolved limitations stay in the record rather than being hidden by the word
  "reviewed".

## Required fields

Each row in [`registry.json`](registry.json) records:

- `sceneId` — stable scene id from `src/catalog/scenes.js`;
- `reviewStatus` — `reviewed`, `pending`, or `legacy-unversioned`;
- `reviewerRole` — role only. A personal identity is recorded only when the repository
  actually has it; missing historical identity is never guessed;
- `reviewedAt` — ISO date for a versioned review, otherwise `null`;
- `reviewedCommit` — exact 40-character Git commit reviewed, otherwise `null`;
- `scope` — what was actually reviewed;
- `sources` — evidence dossier/model card/medical notes used to define the claim boundary;
- `unresolvedLimitations` — important limitations that remain after review.

## Status semantics

### `reviewed`

A versioned attestation exists. The review is only current for the recorded scope and
commit. Subsequent medical-model or teaching changes require a new record/update.

### `pending`

The scene is explicitly not medically signed off for public review claims.

### `legacy-unversioned`

The scene predates this registry and has historical review/audit work, but the repository
does not contain a versioned attestation meeting the current standard. This is **not**
equivalent to `reviewed`.

Heart Failure and Amyloid-β intentionally start in this state. They must receive the same
model-card/evidence package and versioned sign-off used by newer model-backed disease
scenes before this field can become `reviewed`.

## Current scope caveat for paid guides

The 2026-08-30 review of COPD, asthma and portal hypertension predates the Patient and
Education guides introduced on the access/billing branch. Those records therefore cover
the core physiology/model/read-out teaching only. They do **not** attest the new paid
guide copy. Paid public launch must add an explicit `patient-guide` / `education-guide`
review scope (or a new review record) before those surfaces are presented as clinically
reviewed.

## Maintenance rule

Do not edit a reviewed commit SHA to make a record look current. When a medical change is
made, preserve the historical reviewed commit and add/update the attestation to the new
commit after review. The point of this directory is to make review drift visible.
