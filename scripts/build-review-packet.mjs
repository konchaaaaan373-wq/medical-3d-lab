#!/usr/bin/env node
/**
 * Build one review packet per scene, from what the product actually contains.
 *
 *   node scripts/build-review-packet.mjs amyloid-beta heart-failure copd-hyperinflation
 *
 * ## Generated, because copying it by hand is how it goes stale
 *
 * Every line below is read from the thing that decides it: the patient copy
 * from `PATIENT_GUIDES`, the professional copy from the scene's own stages, the
 * limits from the clinical-review registry, the claim type from the model
 * profile, the review state from the registry. Nothing is retyped here, so a
 * packet cannot disagree with the screen a reviewer is looking at.
 *
 * Re-run it after any change to the guide, the stages or the registry. What it
 * does **not** do is fill in an approval: the decision block is empty and this
 * script has no way to write into it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
/** Packets live here, so every link in one is written relative to this. */
const PACKET_DIR = 'docs/clinical-reviews/packets';
/** A repository path, as a link that works from inside a packet. */
const linkTo = (repoPath) => relative(PACKET_DIR, repoPath);
const { PATIENT_GUIDES } = await import(`${ROOT}/src/data/patientGuides.js`);
const { SCENE_MANIFEST } = await import(`${ROOT}/src/catalog/scenes.js`);
const { modelProfileForScene } = await import(`${ROOT}/src/catalog/modelProfiles.js`);
const { sceneById } = await import(`${ROOT}/src/catalog/index.js`);
const registry = JSON.parse(readFileSync(join(ROOT, 'docs/clinical-reviews/registry.json'), 'utf8'));
const reviews = Array.isArray(registry) ? registry : registry.reviews ?? [];

/** Where a reviewer can look at this scene, if anyone has photographed it. */
const SHOTS = {
  'amyloid-beta': 'docs/screenshots/b10-amyloid/',
  'heart-failure': 'docs/screenshots/b8-patient/',
  'copd-hyperinflation': 'docs/screenshots/b13/',
  'myocardial-ischemia': 'docs/screenshots/b10-ischemia/',
};
/** The long-form sheet, where one was already written. */
const SHEETS = {
  'amyloid-beta': 'docs/clinical-reviews/amyloid-beta-patient-7-steps.md',
  'heart-failure': 'docs/clinical-reviews/heart-failure-patient-6-steps.md',
  'myocardial-ischemia': 'docs/clinical-reviews/myocardial-ischemia-patient-6-steps.md',
};
const CERTAINTY_JA = {
  established: '確立している',
  associated: '関連が報告されている',
  hypothesised: '仮説（決着していない）',
  uncertain: '分かっていない',
};

/** Where a scene's data lives, when the file is not named after the slug. */
const DATA_MODULE = { 'copd-hyperinflation': 'copd', 'asthma-heterogeneity': 'asthma', 'amyloid-beta': 'amyloidBeta', 'heart-failure': 'heartFailure' };

const ids = process.argv.slice(2);
if (!ids.length) throw new Error('name at least one scene');

for (const id of ids) {
  const guide = PATIENT_GUIDES[id];
  if (!guide) throw new Error(`${id}: no patient guide`);
  const entry = SCENE_MANIFEST.find((scene) => scene.id === id || scene.slug === id);
  if (!entry) throw new Error(`${id}: not in the catalogue`);
  const module = await entry.load();
  const Scene = module.default ?? module.Scene ?? Object.values(module).find((v) => typeof v === 'function' && v.meta);
  const meta = Scene?.meta ?? {};
  const profile = modelProfileForScene(sceneById(id));
  const review = reviews.find((r) => r.sceneId === id) ?? null;
  const stages = meta.stages ?? [];
  const stageAt = (stageId) => stages.find((s) => s.id === stageId) ?? null;

  const out = [];
  const title = meta.titleJa ?? meta.title ?? id;
  out.push(`# 医学レビュー packet — ${title}`);
  out.push('');
  out.push('**このファイルは生成物です**（`node scripts/build-review-packet.mjs ' + id + '`）。');
  out.push('患者向けの文・専門家向けの文・限界は、すべて製品が実際に持っている値から読んでいます——');
  out.push('**手で書き写していないので、画面と食い違いません。**');
  out.push('');
  out.push('| | |');
  out.push('| --- | --- |');
  out.push(`| scene | \`${entry.slug}\`（\`#/${entry.slug}\`） |`);
  out.push(`| status | \`${entry.status}\` |`);
  out.push(`| model profile | \`${profile?.profileId ?? 'なし'}\` — mechanism level **${profile?.mechanismLevel ?? '-'}** |`);
  out.push(`| 臨床レビューの現状 | **${review?.reviewStatus ?? '記録なし'}**（${review?.reviewerRole ?? '-'}） |`);
  out.push(`| 患者説明 | ${guide.steps.length} 段 |`);
  // The guide's own title is on-screen copy too, so a reviewer signing off
  // on the wording has to see it here and not only the catalogue's name.
  if (guide.titleJa ?? guide.title) out.push(`| 患者説明のタイトル | 「${guide.titleJa ?? guide.title}」 |`);
  if (SHOTS[id]) out.push(`| 実画面 | \`${SHOTS[id]}\` |`);
  if (SHEETS[id] && existsSync(join(ROOT, SHEETS[id]))) {
    out.push(`| 詳細シート | [${SHEETS[id].split('/').pop()}](${linkTo(SHEETS[id])}) — 段ごとの根拠はこちら |`);
  }
  out.push('');
  out.push('---');
  out.push('');
  out.push('## 患者向けの説明（画面に出る実文）');
  out.push('');
  out.push('**区分の読み方** — `モデル出力`：この画面の数値・形はモデルが解いた結果です。');
  out.push('`educationalOnly`：**モデルは計算していません**。一般的な説明として出しており、');
  out.push('画面にもその旨が毎回出ます。');
  out.push('');

  for (const [i, step] of guide.steps.entries()) {
    const stage = stageAt(step.stage);
    out.push(`### ${i + 1}. ${step.titleJa}`);
    out.push('');
    out.push(`> ${step.bodyJa}`);
    out.push('');
    out.push(`- **画面のどこを見るか**：${step.lookJa}`);
    const bits = [];
    bits.push(step.educationalOnly ? '**educationalOnly（モデル出力ではありません）**' : 'モデル出力');
    if (step.certainty) bits.push(`確からしさ：**${CERTAINTY_JA[step.certainty] ?? step.certainty}**`);
    out.push(`- **区分**：${bits.join(' ／ ')}`);
    out.push(`- **モデルの状態**：\`${step.stage}\`（progress ${step.progress}）`
      + (step.frame ? ` ／ 視点 \`${step.frame}\`` : '')
      + (step.focus?.length ? ` ／ 注目 \`${step.focus.join('`, `')}\`` : ''));
    if (stage) {
      out.push(`- **専門家表示の同じ段**：**${stage.nameJa ?? stage.name}** — ${stage.summaryJa ?? stage.summary ?? '（要約なし）'}`);
    }
    out.push('');
  }

  // The middle layer, where a scene declares one. It is the layer most easily
  // mistaken for the model's output, because it is the layer on the screen.
  let mapping = [];
  try {
    const data = await import(`${ROOT}/src/data/${DATA_MODULE[id] ?? entry.slug}.js`);
    mapping = data.VISUAL_MAPPING ?? [];
  } catch { mapping = []; }

  if (mapping.length) {
    out.push('---');
    out.push('');
    out.push('## 3 つの層を分けています');
    out.push('');
    out.push('**① モデルが解いた量 → ② 教育目的の表示への写像 → ③ 患者／専門家の説明。**');
    out.push('②は「見せ方」であって測定値ではありません。画面から数値を読み取れる、と誤解されうるのがここです。');
    out.push('');
    out.push('| 画面の何が | 何から引いているか | 主張していること | **主張していないこと** |');
    out.push('| --- | --- | --- | --- |');
    for (const row of mapping) {
      const from = '`' + row.from + '`';
      // A `proportional` row is allowed to have no "not claiming" line: the
      // size on screen *is* the quantity, so there is nothing to warn about.
      const not = row.notClaimJa ?? row.notClaim;
      const warn = not ? `**${not}**` : '（比例表示。画面の大きさがそのまま量です）';
      out.push(`| ${row.target}（${row.channel}） | ${from} | ${row.claimJa ?? row.claim} | ${warn} |`);
    }
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push('## このモデルが自分で宣言している限界');
  out.push('');
  if (review?.unresolvedLimitations?.length) {
    for (const line of review.unresolvedLimitations) out.push(`- ${line}`);
  } else {
    out.push('- （レビュー registry に記載なし）');
  }
  out.push('');
  if (profile?.prohibitedUses?.length) {
    out.push(`**禁止用途**（model profile）：${profile.prohibitedUses.join(' / ')}`);
    out.push('');
  }
  out.push('## 既存の根拠');
  out.push('');
  for (const path of [`docs/model-cards/${entry.slug}.md`, `docs/model-evidence/${entry.slug}.md`]) {
    out.push(`- ${existsSync(join(ROOT, path)) ? `[\`${path}\`](${linkTo(path)})` : `\`${path}\`（未作成）`}`);
  }
  if (profile) out.push(`- model profile \`${profile.profileId}\` — \`src/catalog/modelProfiles.js\``);
  out.push('- 患者向けの文：`src/data/patientGuides.js`');
  out.push('');
  out.push('---');
  out.push('');
  out.push('## 確認していただきたいこと');
  out.push('');
  out.push('1. **患者向けの各段の文が、医学的に誤っていないか。** 言い過ぎ・言い足りないところ');
  out.push('2. **専門家表示と患者表示が、同じ状態の説明になっているか**（上の各段で並べています）');
  out.push('3. **`educationalOnly` の段が、モデルの計算結果と誤解されないか**');
  if (guide.steps.some((s) => s.certainty)) {
    out.push('4. **確からしさの区分**が妥当か（確立している／関連が報告されている／仮説／分かっていない）');
  }
  out.push(`${guide.steps.some((s) => s.certainty) ? 5 : 4}. **上の「限界」の一覧に、足すべきものがあるか**`);
  out.push(`${guide.steps.some((s) => s.certainty) ? 6 : 5}. **一般公開して差し支えないか**（患者・家族が医療者の同席なしに見ます）`);
  out.push('');
  out.push('---');
  out.push('');
  out.push('## 判断欄');
  out.push('');
  out.push('| | |');
  out.push('| --- | --- |');
  out.push('| レビュアー（氏名） | |');
  out.push('| role | |');
  out.push('| 日付（YYYY-MM-DD） | |');
  out.push('');
  out.push('- [ ] **approve** — この内容で公開してよい');
  out.push('- [ ] **revise** — 直すべき段と内容：');
  out.push('- [ ] **hold** — 追加で要るもの：');
  out.push('');
  out.push(`承認後の反映手順は [\`NEXT-BETA-APPLY.md\`](${linkTo('docs/decisions/NEXT-BETA-APPLY.md')}) にあります。`);
  out.push('**このファイルに承認を書き込んでも、それだけでは何も公開されません**——');
  out.push('registry と公開判断記録を更新して初めて gate が動きます。');
  out.push('');

  const path = join(ROOT, PACKET_DIR, `${entry.slug}.md`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${out.join('\n')}`);
  console.log(`${entry.slug}: ${guide.steps.length} steps -> ${PACKET_DIR}/${entry.slug}.md`);
}
