# Pulse Physiology Engine — what a proof of concept found

*Recorded 2026-09-11. This is a feasibility note, not a decision, and nothing in
the product depends on anything here. The COPD and asthma scenes solve their own
models and would be unaffected if this file were deleted.*

## The question

The COPD and asthma scenes were raised as candidates for a technical proof of
concept with the [Pulse Physiology Engine](https://pulse.kitware.com/). The
brief was narrow on purpose: find out what can actually be obtained and run,
what it takes as input, what it produces, and what the smallest way of calling
it from this product would be — without stopping work on the scenes, and without
building a server, a WASM port, or anything that would have to be maintained.

## What was established

**It exists, it is real work, and the licence is permissive.** Pulse is a C++
whole-body physiology engine from Kitware, a fork of BioGears, published under
the Apache License 2.0 — stated by [Kitware's own
announcement](https://www.kitware.com/introducing-the-pulse-physiology-engine-open-source-computational-models-for-human-medical-simulation/)
and by the [Fab listing](https://www.fab.com/listings/6048381d-2019-4965-a2f8-c0ea9eea4a02)
for its Unreal plugin. Bindings exist for C, C#, Java and Python, and there are
maintained Unity and Unreal integrations.

**Apache 2.0 is compatible with how this repository records third-party work.**
It is a notice-and-attribution licence with no copyleft, so it would clear the
release gate's licence check the same way any other attribution-obligated
component does — recorded per component in `src/catalog/assetManifest.js`, with
the attribution obligation named rather than assumed. That is a statement about
the licence, not about the model.

**Nothing could be obtained or run from this environment.** Every route was
tried and every one is closed here:

| Route | Result |
| --- | --- |
| `pulse.kitware.com` (docs, CDM tables) | blocked by the egress policy |
| `gitlab.kitware.com/physiology/engine` (source) | blocked by the egress policy |
| `discourse.kitware.com` (the Python API thread) | blocked by the egress policy |
| `data.kitware.com` (binaries) | blocked by the egress policy |
| `pip download pulse-engine` | **a different project.** `pulse-engine` 0.2.47 on PyPI is an agent/LLM framework (FastAPI, LangChain, Celery). Downloaded and opened to confirm — it is a name collision, not the physiology engine |
| conda-forge `pulse-engine` | no such artifact (404 from the Anaconda API) |

So there is **no verified field name, no verified output list and no run** in
this note, and there must not be one. A plausible-looking JSON scenario for
`ChronicObstructivePulmonaryDisease` with `BronchitisSeverity` and
`EmphysemaSeverity` came back from a web search, and it is not recorded here as
fact: the page it would have come from is unreachable, so nothing distinguishes
a quotation from a reconstruction. Writing it down as the API would be exactly
the failure this repository's provenance rules exist to prevent.

**What that means for the PoC:** it is blocked on network access, not on design.
On a machine that can reach Kitware, the next step is one afternoon — install
the Python bindings, run the standard male patient with a COPD condition at two
severities, and print the engine's own output list. Until then the severity
fields, the output names and the units are unknown to this repository.

## The finding that does not depend on running it

The interesting result is architectural, and it points the other way from where
the PoC started.

**Pulse and these scenes are not the same kind of model, and it decides what
an integration could and could not do.** Pulse is a lumped whole-body
simulator: a systemic patient with a circulation, a respiratory system, gas
exchange and a drug system, advanced in real time. The COPD scene is twelve
lung units with a time constant each, and the asthma scene is a 255-branch
airway tree solved as a network. **The spatial structure is the entire point of
both of them** — which regions did not give their gas back, which branch lost
its air to its sister.

Pulse has no correspondence to those twelve units or those 255 branches, so
**the 3D state of an individual branch or region cannot be determined from
Pulse**. What *is* possible is the other direction: a Pulse global or
compartment-level output can be handed to this product's **educational visual
mapping** and change how the geometry here is drawn. A Pulse airway resistance
could drive the emphasis on airway narrowing in this scene exactly the way
`flowLimitedFraction` does today.

And the rule that governs it is the one already written down in
`src/data/visualMapping.js`: such a drawing is `illustrative`, and its
`notClaim` has to say that the calibre on screen is **not a diameter Pulse
calculated** and not anybody's measurement. A whole-body engine's resistance is
not a lumen any more than this repository's own resistance is.

**What Pulse would add is precisely what both scenes declare they do not do.**
Both model scopes exclude gas exchange outright: COPD's says "no PaO₂, no PaCO₂,
no SpO₂ — none of them follows from lung volumes", and asthma's says "there is no
blood in this model". Those are the numbers Pulse has. So the honest shape of an
integration is not "improve the COPD scene with Pulse"; it is **a second model,
making a second claim, with its own model profile, its own evidence dossier and
its own model card**, shown beside the mechanics rather than folded into it.

**And that second claim is a bigger one than it looks.** A number labelled SpO₂
on a screen a patient is looking at is a clinical-sounding value. It would need
its own entry in
[`docs/architecture/intended-use-and-model-provenance.md`](architecture/intended-use-and-model-provenance.md),
a `mechanismLevel` that says what it is, and a validation record — Pulse
publishes its own validation, and *its* validation is evidence about Pulse, not
about a scene that consumes it. Wiring a systemic engine's output into an organ
scene and letting the two read as one model is the single thing this repository
most needs not to do.

## If it goes ahead

The boundary that keeps this safe is worth stating before anyone writes code:

- **Offline, not runtime.** Pulse is a C++ engine; running it in the browser
  means a WASM port or a server, and the brief rules both out. The workable
  shape is the same one `docs/asset-pipeline.md` already uses for Blender —
  an offline step that produces a recorded artefact, checked in with its
  provenance, and a runtime that reads the artefact and never the engine.
- **An adapter, not a dependency.** Anything read from Pulse arrives as data
  through one module and is never imported by a scene. `npm test` stays a plain
  `node --test` run and `three` stays the only dependency.
- **Its own scene, its own profile.** Not a new number inside `copd` or
  `asthma`. Those two scenes stay exactly as they are, solving what they solve.
- **Nothing says "Pulse" on screen unless it is Pulse.** A figure derived from a
  recorded Pulse run is a figure from a whole-body simulator at a stated
  severity, and must be labelled as one — not as a property of the lung the
  reader is looking at.

## Status

Not started, and not blocking anything. The scenes it was a candidate for are
finished and independent of it.
