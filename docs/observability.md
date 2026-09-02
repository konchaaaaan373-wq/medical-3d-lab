# Observability — performance budgets, telemetry, errors and feedback

Owner document for everything the product knows about **itself**: how fast it
is allowed to be, what it may count, what it may never carry, and how somebody
tells us it is wrong.

It does not own anything medical. No number here may influence a model, a
scene's physiology or a displayed clinical value; the frame budget changes
lighting cost and resolution, never a parameter with a unit.

Related: [`public-release-roadmap.md`](public-release-roadmap.md) (Gate 1 and
Gate 3 own the release decisions), [`grand-design.md`](grand-design.md) §7,
[`access-and-billing.md`](access-and-billing.md) (what the account layer
stores, which is a different question from what telemetry sends).

---

## 1. Performance budgets

`src/app/performanceBudget.js` is the single declaration. `Viewer` applies its
decisions and holds none of its own.

| Budget | phone | tablet | desktop |
| --- | --- | --- | --- |
| Target frame rate | 60 fps | 60 fps | 60 fps |
| Floor (degrade below this) | 38 fps | 38 fps | 38 fps |
| Recover above (sustained) | 52 fps | 52 fps | 52 fps |
| Jank ratio tolerated | 25 % | 20 % | 20 % |
| Pixel-ratio ceiling | 1.5× | 2× | 2× |
| Start-up to first frame | 4000 ms | 3000 ms | 2500 ms |

Device class comes from viewport width: phone ≤ 719 px, tablet ≤ 1279 px,
desktop above.

**Quality ladder.** `high` → `medium` (bloom off) → `low` (pixel ratio 1×).
The order is the policy: bloom is a flourish, resolution is legibility of the
anatomy, so the flourish goes first and the anatomy last. `low` is the floor —
below it there is nothing left to take that is not medical content.

**Degradation and recovery.** A window of 90 frames is over budget when its
mean frame time exceeds the floor *or* its jank ratio exceeds the tolerance —
mean alone hides 8/8/60 ms stutter, which is what a viewer actually notices.
Recovery needs four consecutive windows above the recover threshold, which sits
well above the floor. Degrading costs a flourish; restoring too eagerly costs a
visible stutter that the user cannot attribute to our optimism.

**Ship weight.** `BUNDLE_BUDGET_KB`, in gzipped kB, measured by
`npm run budget` (CI runs it after `npm run build`):

| Line | Budget | What it protects |
| --- | --- | --- |
| `entry` | 90 | What a visitor downloads before anything renders |
| `largestChunk` | 260 | What opening one model costs after that |
| `css` | 120 | Loaded eagerly today |
| `code` | 700 | Slow accumulation no single chunk looks guilty for |
| `media` | 6000 | Specimen data, fetched only by the scene that needs it |

Raising a line is allowed; doing it silently is not. Change the constant and
say in the pull request why the product is now permitted to cost more.

### Landing flow-field budget

The landing route has one Canvas 2D ambient layer. It is decorative chrome,
not a renderer and not a physiological simulation. Its separate budget lives
in `src/app/landingFlowField.js` and is checked by `tests/landing.test.js`:

| Device | Particle ceiling | Frame ceiling | Pixel-ratio ceiling |
| --- | ---: | ---: | ---: |
| phone | 58 | 24 fps | 1.25× |
| tablet | 92 | 30 fps | 1.5× |
| desktop | 132 | 30 fps | 1.5× |

The foreground circulation preview adds 24 small CSS particles. Those particles
are part of the explanatory instrument; the ambient ceiling above does not hide
them in its count. `prefers-reduced-motion` makes the ambient canvas static and
stops most foreground particles. A hidden document stops requesting frames.
When the browser reports `Save-Data`, a 55% count scale is applied before the
28-particle readability floor and the device ceiling; frame rate is capped at
20 fps and pixel ratio at 1×. None of these choices changes a model parameter
or displayed value.

---

## 2. What may be collected — and what may not

Three rules, enforced by structure rather than by intention.

### 2.1 Nothing leaves the browser without consent

`src/telemetry/telemetry.js` holds events in memory until the consent question
is answered. Granting flushes what was gathered; **refusing destroys it**, so a
later grant cannot resurrect it. With no endpoint configured — the default, and
the whole of local development — there is no transport at all: events are
validated, redacted and dropped.

The banner (`src/components/ConsentBanner.js`) shows once, blocks nothing,
pre-ticks nothing, and offers refusal in the same size and shape as consent.

### 2.2 Metrics cannot carry prose

`src/telemetry/metrics.js` is the vocabulary, and its property kinds are
`enum`, `sceneId`, `number`, `boolean` and `fingerprint`. **There is no
free-text kind.** A metric therefore cannot carry a name, an address, a note or
a search term, because there is no shape for one to travel in. An event that
fails validation is dropped rather than trimmed, so a caller cannot smuggle a
field through by adding it.

`tests/launch-metrics.test.js` fails if a new property kind appears.

### 2.3 Diagnostics travel separately, and redacted

Errors do need prose, so they use their own channel — `telemetry.reportError` —
and every string in it passes through `src/telemetry/redact.js` first. The
*metric* that accompanies an error carries only an eight-character fingerprint.

Redaction covers what this product can plausibly touch: the auth/recovery token
that arrives **in the URL hash** on this app, provider keys and billing ids,
email addresses, long digit runs (a medical product is exactly where somebody
eventually pastes a record number), IP addresses, UUIDs and developer home
directories. `tests/redaction.test.js` checks the output with an independent
`looksSensitive` predicate rather than re-running the same expressions.

### 2.4 No identifier that outlives the page

- A `sessionRef` groups the events of one page load. It is regenerated on every
  load and never written to storage.
- Retention is answered without an identifier at all: the browser counts *its
  own* days of use locally (`src/telemetry/retention.js`) and reports one of
  `first` / `returning` / `regular`. Clearing site data resets it to `first`,
  which is the honest answer to what we can then know.
- The only two things telemetry ever writes to disk are the consent answer and
  that visit count. `telemetry.forget()` removes both.

---

## 3. Launch metrics

The roadmap's Gate 3 metric list, as declared events. Each declares the product
question it answers; an event that cannot name one should not be collected.

| Event | Question |
| --- | --- |
| `model.start` | Do people open a model, and which ones? |
| `model.ready` | How long does a first frame take on real devices? |
| `model.quality` | How often does the frame budget force a degradation? |
| `story.complete` | Do people reach the end of a guided explanation? |
| `compare.complete` | Is side-by-side used, or only offered? |
| `learning.complete` | Does the educational layer get finished? |
| `patient_guide.open` | Is the patient presenter used in practice? |
| `reel.export` | Does the SNS layer produce anything anybody keeps? |
| `trust.open` | Do people look at the evidence boundary? |
| `account.conversion` | Where does a purchase decision actually happen? |
| `session.visit` | Do people come back? (buckets only) |
| `renderer.failure` | How often does WebGL fail, and does the fallback catch it? |
| `error.captured` | Which failures are widespread, not one unlucky session? |
| `feedback.submitted` | Is feedback reachable from where people get stuck? |

### How an event reaches a metric

Presentation modules do not import telemetry. They announce facts on
`src/app/appEvents.js` in their own vocabulary — `story:complete`,
`reel:export`, `conversion:step` — and exactly one subscriber, in
`src/app/observability.js`, decides that a fact is a metric.

```text
StoryMode / LearningPanel / App / AccessManager
        ↓ emitAppEvent('story:complete', { steps, elapsedMs })
appEvents.js            (a bus; no idea telemetry exists)
        ↓ onAppEvent
observability.js        (the only module that knows both vocabularies)
        ↓ telemetry.record('story.complete', …)
telemetry.js → redact → consent gate → transport
```

`tests/app-events.test.js` fails if a declared event has no producer, if a
producer announces something undeclared, or if a presentation module starts
importing telemetry directly.

---

## 4. Feedback

`src/components/FeedbackPanel.js` is a separate route from analytics, for two
reasons that are the point of having it:

- **Prose is never analytics.** What somebody writes goes to the feedback
  endpoint and nowhere else. The metric records that feedback happened, its
  category and its surface — never a word of what was said.
- **It works when the product does not.** Plain DOM, no renderer, no account,
  no scene. It is mounted on the scene-failure fallback, which is when a report
  is most valuable.

With no endpoint configured it composes a mail message rather than discard what
somebody took the trouble to write. The copy asks explicitly for no
patient-identifying information.

---

## 5. Configuration

| Variable | Effect when unset |
| --- | --- |
| `VITE_TELEMETRY_ENDPOINT` | No transport. Events are validated and dropped. |
| `VITE_FEEDBACK_ENDPOINT` | The panel composes a mail message instead. |
| `VITE_RELEASE` | Batches are labelled `dev`. |

Both endpoints must be **same-origin** — the Content-Security-Policy in
`public/_headers` allows `connect-src 'self' https://*.supabase.co` and nothing
else. Point them at a function on the deployment (`/.netlify/functions/...`)
rather than widening the policy; `tests/security-headers.test.js` fails if the
policy is opened up.

---

## 6. What is deliberately not here

- **No third-party analytics or tag manager.** A script from another origin
  would be blocked by the CSP, and adding it would move the privacy boundary
  outside this repository, where none of the rules above could be enforced.
- **No session recording, heatmaps or scroll tracking.**
- **No A/B assignment.** It needs a durable identifier, which §2.4 rules out.
- **No metric that reads a medical value.** A model's state is not telemetry;
  reporting it would make the two coupled, and the coupling would eventually be
  read the other way round.
