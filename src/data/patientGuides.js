import {
  HEALTHY as COPD_HEALTHY,
  NARROWED as COPD_NARROWED,
  OBSTRUCTED as COPD_OBSTRUCTED,
} from './copdTeaching.js';
import { AIRWAY_STATES as ASTHMA_AIRWAY_STATES } from './asthmaTeaching.js';

/**
 * Patient-facing explanation copy.
 *
 * These guides deliberately avoid diagnosis, prognosis, treatment selection and
 * patient-specific numbers. They explain only the mechanism already represented
 * by the reviewed / production scene underneath them.
 *
 * A guide's `progress` must mean exactly what that scene's progression means.
 * Patient copy is not allowed to silently reinterpret a demand axis as disease
 * severity just because the resulting animation looks convenient.
 *
 * ## The three parts of a step
 *
 * `title` says **what changes**, `body` says **what happens because of it**,
 * and `look`/`lookJa` say **where on the screen to see it**. The third is the
 * one that was missing, and it is the one a person sitting in front of the
 * model actually needs: an explanation that does not say where to look is a
 * paragraph next to a moving picture, and the reader watches the wrong part of
 * it. It names what the product itself renders — a read-out's own label, or
 * something visible in the 3D — so the words and the screen cannot drift.
 *
 * Each of these is paired with a specialist walk-through on the same scene:
 * the scene's `getCausalStory()`, whose steps carry `watch` (which read-outs)
 * and `chart`. The two registers describe one model at one set of states, and
 * `tests/disease-explanations.test.js` holds them to that.
 */

/**
 * The three lungs the COPD explanations share.
 *
 * Imported rather than repeated: `src/data/copdTeaching.js` is where the
 * clinician's stepped walk-through defines them, and a patient explanation that
 * typed its own copy of "airway resistance × 2" would eventually be describing
 * a lung no clinician's version ever shows.
 */
const COPD_LUNGS = Object.freeze({
  healthy: COPD_HEALTHY,
  narrowed: COPD_NARROWED,
  obstructed: COPD_OBSTRUCTED,
});

/** The three airway trees the asthma explanations share. Same reason. */
const ASTHMA_TREES = ASTHMA_AIRWAY_STATES;

export const PATIENT_GUIDES = Object.freeze({
  /**
   * Amyloid-β, told without a causal chain it does not have.
   *
   * Every other guide in this file walks one mechanism, because the mechanism
   * is established. This one cannot. What is established here is that Aβ is
   * produced and cleared normally, and that plaques are extracellular deposits
   * and a neuropathological hallmark of Alzheimer's disease. What is
   * *associated* is soluble oligomers with synaptic dysfunction. What is
   * **hypothesised and contested** is that this sequence is what causes a
   * person's symptoms — and told as six steps in a row, that is exactly what it
   * would read as.
   *
   * So every step says how sure the field is (`certainty`), and the last two
   * exist specifically to stop the chain closing: the amount of deposit does
   * not tell you about the person, and the causal question is open. Neither is
   * a hedge appended to a story — they are the content.
   *
   * `educationalOnly` still means "the model does not produce this". The model
   * here is an aggregation-state illustration: it produces species and their
   * coexistence, and nothing about a person at all.
   */
  'amyloid-beta': Object.freeze({
    title: 'What amyloid-β is, and what is and is not known about it',
    titleJa: 'アミロイドβとは何か、何が分かっていて何が分かっていないか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'normal',
        certainty: 'established',
        title: 'It is there in a healthy brain',
        titleJa: '健康な脳にもあります',
        body: 'Amyloid-β is a small protein fragment the brain makes and clears all the time. Having some of it is normal.',
        bodyJa: 'アミロイドβは、脳が日常的に作っては取り除いている小さなタンパク質の断片です。あること自体は正常です。',
        look: 'The small separate specks are the individual molecules, spread through the space between cells.',
        lookJa: '小さくばらばらに散っている粒が、細胞のあいだにある分子ひとつひとつです。',
      },
      {
        progress: 0.16,
        stage: 'monomer',
        certainty: 'established',
        title: 'What matters is the balance',
        titleJa: '大事なのは差し引きです',
        body: 'If more is made than is cleared away, the amount in that space goes up. The question is never simply whether it is present.',
        bodyJa: '作られる量が取り除かれる量を上回ると、その場所にたまっていきます。「あるかないか」だけの問題ではありません。',
        look: 'The same specks, more of them. Nothing has changed shape yet.',
        lookJa: '同じ粒が増えています。形はまだ変わっていません。',
      },
      {
        progress: 0.4,
        stage: 'oligomer',
        certainty: 'associated',
        title: 'Some of it clumps into small groups',
        titleJa: '一部が小さなかたまりになります',
        body: 'Molecules can join into small clusters. These clusters are found alongside damage to the connections between nerve cells, in tissue and in laboratory work.',
        bodyJa: '分子どうしが集まって小さなかたまりを作ることがあります。このかたまりは、神経細胞どうしのつなぎ目の傷みと並んで見つかることが報告されています。',
        look: 'Watch specks pair up and travel together — those small groups are what this step is about.',
        lookJa: '粒どうしがくっついて一緒に動くのを見てください。その小さなかたまりが、この段階の話です。',
      },
      {
        progress: 0.62,
        stage: 'fibril',
        certainty: 'established',
        title: 'Some clusters line up into threads',
        titleJa: '一部が糸のように並びます',
        body: 'Some of the clusters extend into long ordered threads, which grow by adding more at their ends. Not everything becomes a thread.',
        bodyJa: 'かたまりの一部は、規則的に並んだ長い糸へと伸びていきます。端に付け足しながら伸びますが、すべてが糸になるわけではありません。',
        look: 'The elongated shapes are the threads. The loose specks and small groups are still there beside them.',
        lookJa: '細長い形が糸です。そのそばには、ばらばらの粒や小さなかたまりも残っています。',
      },
      {
        progress: 0.84,
        stage: 'plaque',
        certainty: 'established',
        title: 'Threads pack into deposits outside the cells',
        titleJa: '糸が集まって、細胞の外に沈着します',
        body: 'Threads gather into dense deposits in the space between cells. These deposits are one of the findings that define this disease under a microscope.',
        bodyJa: '糸が密に集まり、細胞と細胞のあいだに沈着します。この沈着は、顕微鏡でこの病気と判断するときの所見のひとつです。',
        look: 'The dense clumps outside the cell bodies are the deposits. Note that the earlier forms have not disappeared.',
        lookJa: '細胞の外にある濃いかたまりが沈着です。前の段階のものが消えていないことにも注目してください。',
      },
      {
        progress: 0.84,
        stage: 'plaque',
        certainty: 'uncertain',
        educationalOnly: true,
        title: 'How much is here does not tell you about the person',
        titleJa: '量から、その人のことは分かりません',
        body: 'People with a great deal of this deposit can have no memory difficulty, and people with little can have a lot. This picture is not a measure of anyone.',
        bodyJa: '沈着が多くても記憶の問題がない人もいれば、少なくても困っている人もいます。この画面は、誰かの状態を測ったものではありません。',
        look: 'Nothing new is drawn for this step: it is about what the picture cannot tell you.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵から分からないことについての説明です。',
      },
      {
        progress: 0.84,
        stage: 'plaque',
        certainty: 'hypothesised',
        educationalOnly: true,
        title: 'Whether this sequence is the cause is still argued',
        titleJa: 'この流れが原因かどうかは、まだ議論されています',
        body: 'That this build-up is what brings on the symptoms is one explanation researchers have put forward. Others disagree, and the question is open.',
        bodyJa: 'この蓄積が症状を引き起こすという考えは、研究者が挙げている説明の一つです。異なる立場もあり、決着はついていません。',
        look: 'The screen shows one sequence of shapes. It does not show why anyone became unwell.',
        lookJa: 'この画面が示すのは形の移り変わりだけです。誰かが不調になった理由を示すものではありません。',
      },
    ]),
  }),

  /**
   * Heart failure, said twice: once for a clinician and once for the person the
   * heart belongs to.
   *
   * **The pair is the point.** `stage` names the scene stage each step stands
   * beside, and `tests/patient-guide-pairing.test.js` holds `progress` to that
   * stage's own position on the scene's axis. The two explanations therefore
   * describe the same solved state by construction: patient copy cannot drift
   * onto a state the clinician's copy never describes, and re-tuning the model
   * moves both or fails the build.
   *
   * **Three beats, in this order, and no more per step.** What changes, what
   * follows from it, and where to look for it on screen. The last one is the
   * one that was missing: a person standing beside a monitor is being shown a
   * rotating 3D model and told a mechanism, and nothing was telling them which
   * part of it to watch. `look` is that sentence, and it points at what the
   * scene is actually drawing at this step — the annotations named in the
   * stage's own `focus` — rather than at anything invented here.
   *
   * What is deliberately absent: numbers, a rate, a cause for this person, a
   * treatment, a prognosis. The model has none of those for an individual, and
   * short copy is exactly where they would be easiest to smuggle in.
   *
   * **Three steps share the last stage, and the third of them is marked.** The
   * chain does not stop at the heart: the same solved state raises the pressure
   * in the vessels between the heart and the lungs, and the scene draws that —
   * `meanPulmonaryVenousPressure` comes out of the same closed-loop solve, and
   * the congestion overlay is drawn from it. So "the pressure reaches the lungs"
   * points at something this model actually produces.
   *
   * "Why breathing can feel harder" does not. The model solves pressures and
   * volumes; it does not solve symptoms. That step carries `educationalOnly`,
   * the panel says so on screen, and `tests/patient-guide-pairing.test.js` holds
   * every step without the flag to something the scene draws.
   */
  'heart-failure': Object.freeze({
    title: 'Why the heart can become less efficient',
    titleJa: '心臓の働きが弱くなる仕組み',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'normal',
        title: 'A healthy pump',
        titleJa: '正常なポンプ',
        body: 'The heart fills with blood, then squeezes it forward with each beat.',
        bodyJa: '心臓は血液を受け取り、1 回ごとの拍動で前へ送り出します。',
        look: 'Watch the chamber in the middle: it widens as it fills, then narrows as it empties.',
        lookJa: '中央の部屋を見てください。血液がたまると広がり、送り出すと縮みます。',
      },
      {
        progress: 0.18,
        stage: 'concentric-hypertrophy',
        title: 'The wall thickens',
        titleJa: '壁が厚くなる',
        body: 'Working against a higher load for a long time, the muscle can grow thicker. The room inside stays about the same.',
        bodyJa: '高い負担が長く続くと、筋肉は厚くなることがあります。中の広さはあまり変わりません。',
        look: 'Watch the muscle around the chamber, not the space inside it — the wall is what is changing here.',
        lookJa: '部屋の中ではなく、そのまわりの筋肉を見てください。ここで変わっているのは壁の厚さです。',
      },
      {
        progress: 0.42,
        stage: 'dilation',
        title: 'The chamber widens',
        titleJa: '部屋が広がる',
        body: 'Later the chamber itself can enlarge and become rounder, and the wall is thin for a room that size.',
        bodyJa: 'その後、部屋そのものが広がって丸みを帯び、その大きさに対して壁は薄くなります。',
        look: 'Watch the outline of the chamber: it is wider and rounder than it was at the start.',
        lookJa: '部屋の輪郭を見てください。最初より広く、丸くなっています。',
      },
      {
        progress: 0.64,
        stage: 'systolic-dysfunction',
        title: 'Less leaves with each beat',
        titleJa: '1 回に送り出せる量が減る',
        body: 'A wider chamber that squeezes less firmly empties less completely, so some blood stays behind.',
        bodyJa: '広がった部屋は縮む力も弱いため、完全には空になりません。血液が残ります。',
        look: 'Watch what is still inside at the end of a squeeze — that is the blood that did not leave.',
        lookJa: '縮み終わったときに中に残っているものを見てください。それが送り出せなかった血液です。',
      },
      {
        // Same state, same position on the axis: this step turns the reader's
        // attention from the heart to what the same solved state does behind it.
        // The pressure it is about is `meanPulmonaryVenousPressure`, which the
        // scene's own closed-loop solve produces, and the overlay it points at
        // is drawn from that pressure. Nothing is borrowed from another model.
        progress: 0.64,
        stage: 'systolic-dysfunction',
        // The camera rises above the heart for these last two steps. From the
        // opening view the pulmonary veins recede almost straight into the
        // screen, so "watch the vessels running to the lungs" pointed at
        // something pressed against the top edge of the frame. The framing is
        // the scene's own (`getGuideFramings`), and it moves nothing else.
        frame: 'pulmonary',
        focus: ['pressure', 'pulmonary-bed'],
        title: 'The pressure reaches the lungs',
        titleJa: '圧は肺のほうへ伝わる',
        body: 'Blood that cannot move forward backs up behind the heart, and the vessels between the heart and the lungs carry that raised pressure.',
        bodyJa: '前へ進めなかった血液は心臓の手前にたまり、心臓と肺のあいだの血管がその高い圧を受けます。',
        look: 'Watch above the heart, around the vessels running to the lungs: the haze that spreads there is how far the pressure has reached.',
        lookJa: '心臓の上、肺へ向かう血管のまわりを見てください。にじむように広がっているのが、圧が届いている範囲です。',
      },
      {
        // Not a model output. The model solves pressures and volumes; it does
        // not solve breathlessness, and this step says so on screen.
        progress: 0.64,
        stage: 'systolic-dysfunction',
        // Same picture as the step before: this one explains what that spread
        // means for a person rather than showing anything new.
        frame: 'pulmonary',
        focus: ['pressure', 'pulmonary-bed'],
        educationalOnly: true,
        title: 'Why breathing can feel harder',
        titleJa: '息が苦しく感じられる理由',
        body: 'When that pressure is high, fluid can move into the spaces around the small airways, and breathing takes more effort — often more so when lying flat.',
        bodyJa: 'その圧が高いと、細い気道のまわりの隙間に水分が移りやすくなり、呼吸に力が要るようになります。横になったときに強く感じられることもあります。',
        look: 'Nothing new is drawn for this step: it explains what the spread on screen tends to mean for a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面に出ている広がりが、人にとってどういうことかの説明です。',
      },
    ]),
  }),
  /**
   * Myocardial ischaemia, said twice — the second scene to use the shape the
   * heart-failure guide worked out.
   *
   * Same rules, held by the same contract (`src/data/guideContract.js`): each
   * step names the scene stage it stands beside and sits at that stage's own
   * position, three beats per step, and anything the model does not produce is
   * marked. Two steps share the `burden` stage: the muscle showing it, and what
   * that costs the whole ventricle. Same solved state, different picture.
   *
   * **What this model refuses is on the record and is respected here.** Its own
   * scope says ECG, chest pain, troponin and prognosis are not modelled, and
   * there is no infarction in it — no necrosis, no scar. So the step about what
   * a person feels carries `educationalOnly`, and no step calls this a heart
   * attack.
   */
  'myocardial-ischemia': Object.freeze({
    title: 'Why a narrowed artery makes part of the heart stop working',
    titleJa: '細くなった血管が、心臓の一部を動かなくする仕組み',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'baseline',
        focus: ['lad'],
        title: 'Each artery feeds its own region',
        titleJa: '血管はそれぞれ、担当する場所を養う',
        body: 'The arteries on the surface of the heart each carry blood to one region of muscle. At rest every region receives more oxygen than it uses.',
        bodyJa: '心臓の表面を走る血管は、それぞれ決まった場所の筋肉へ血液を運びます。安静時はどの場所も、使う量より多くの酸素を受け取っています。',
        look: 'Follow one artery down the front of the heart, then look at the muscle below it — that is the region it feeds.',
        lookJa: '心臓の前面を下る血管を目で追い、その下の筋肉を見てください。そこがその血管の担当する場所です。',
      },
      {
        progress: 0.22,
        stage: 'onset',
        focus: ['lad'],
        title: 'The flow through it falls',
        titleJa: 'そこを通る血流が減る',
        body: 'When that artery narrows, less blood reaches the region beyond it. For a while nothing on screen changes: the muscle is running short, but the shortage has to add up before it shows.',
        bodyJa: 'その血管が細くなると、先の場所へ届く血液が減ります。しばらく画面は変わりません——足りていないぶんが積み重なるまで、現れないからです。',
        look: 'Watch the artery, not the muscle. What has changed so far is how much is getting through it.',
        lookJa: '筋肉ではなく血管を見てください。いま変わったのは、そこを通る量です。',
      },
      {
        progress: 0.45,
        stage: 'burden',
        frame: 'wall',
        focus: ['anterior-wall', 'inferior-wall'],
        title: 'The muscle it feeds shows it',
        titleJa: '養われている筋肉に現れる',
        body: 'The shortage has added up, and the region that artery feeds changes colour. The muscle beside it, fed by a different artery, does not. The colour means short of oxygen — not dead.',
        bodyJa: '不足が積み重なり、その血管が養う場所の色が変わります。隣の、別の血管が養う筋肉は変わりません。色は「酸素が足りない」という意味で、壊死ではありません。',
        look: 'Compare the two regions: the border between them is where one artery ends and the next begins.',
        lookJa: '二つの場所を見比べてください。その境目が、担当する血管の切り替わるところです。',
      },
      {
        progress: 0.45,
        stage: 'burden',
        frame: 'wall',
        focus: ['anterior-wall'],
        title: 'That region stops pulling its weight',
        titleJa: 'その場所が縮まなくなる',
        body: 'Muscle short of oxygen contracts less. The rest of the heart carries on, so the whole heart sends out less with each beat than it would have.',
        bodyJa: '酸素の足りない筋肉は、縮む力が落ちます。他の部分は働き続けるので、心臓全体としては 1 回に送り出す量が減ります。',
        look: 'Watch that region move against the muscle beside it: one is still squeezing in, the other is barely moving.',
        lookJa: 'その場所と隣の筋肉の動きを見比べてください。片方は縮み、もう片方はほとんど動きません。',
      },
      {
        progress: 0.8,
        stage: 'reperfusion',
        frame: 'wall',
        focus: ['anterior-wall'],
        title: 'The flow comes back before the movement does',
        titleJa: '血流が戻っても、動きはすぐ戻らない',
        body: 'Open the artery and the blood returns almost at once. The muscle does not: it goes on moving poorly long after it is being supplied again.',
        bodyJa: '血管が開けば血液はほぼすぐに戻ります。筋肉は戻りません——また十分に養われるようになっても、しばらく動きは悪いままです。',
        look: 'The colour of the region recovers first. Keep watching how it moves — that is the part still lagging.',
        lookJa: 'まず色が戻ります。そのあとも動きを見ていてください。遅れているのはそちらです。',
      },
      {
        progress: 0.8,
        stage: 'reperfusion',
        frame: 'wall',
        focus: ['anterior-wall'],
        educationalOnly: true,
        title: 'Why it can be felt in the chest',
        titleJa: '胸に感じられることがある理由',
        body: 'Muscle working with too little oxygen can be felt — often as pressure or tightness across the chest, sometimes reaching the arm, jaw or back, and often brought on by exertion.',
        bodyJa: '酸素が足りないまま働いている筋肉は、感覚として現れることがあります。胸の圧迫感や締めつけとして、腕・あご・背中に広がることもあり、体を動かしたときに出やすいことが知られています。',
        look: 'Nothing new is drawn for this step: it says what the shortage on screen can mean for a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面の不足が、人にとってどういうことかの説明です。',
      },
    ]),
  }),
  /**
   * COPD, said twice: once as the stepped walk-through a clinician reads, and
   * once here.
   *
   * **The lungs are the same lungs.** `controls` on each step is one of the
   * three control sets `src/data/copdTeaching.js` exports, and the clinician's
   * walk-through steps through the same three. Neither explanation can arrive
   * at a lung the other never describes, and re-tuning one of those lungs moves
   * both or fails `tests/respiratory-guides.test.js`.
   *
   * **Three kinds of change, and a step says which it is asking for.** The
   * scene's own axis (`progress`) is what the body is *asking* the lungs for,
   * from sitting still to working hard — it is not a severity slider, and this
   * guide does not treat it as one. How obstructed the lung is lives on the
   * model controls, which is why the first two steps sit at the same place on
   * the axis and differ only in `controls`: the difference between them is the
   * airways, and the reader is being shown exactly that and nothing else.
   * `frame` and `focus` move the camera and the labels and change no physiology
   * at all.
   *
   * **Where the model stops is marked, and it stops early.** This model’s own
   * scope excludes gas exchange outright — no PaO₂, no PaCO₂, no SpO₂, because
   * none of them follows from lung volumes — and excludes dyspnoea and the work
   * of breathing with it. The last two steps are the ones a person actually
   * asks about, they are both `educationalOnly`, and the panel says on screen
   * that they are not drawn from the model. Nothing in this file turns a volume
   * into a blood gas or into a symptom.
   */
  'copd-hyperinflation': Object.freeze({
    title: 'Why breathing out gets harder, and what that leaves behind',
    titleJa: '息を吐きにくくなると、何が起きるのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'rest',
        controls: COPD_LUNGS.healthy,
        // The scene's own opening shot puts the diaphragm's label under the
        // console, and this step is about the diaphragm. Same line of sight,
        // lower in the frame.
        frame: 'base',
        focus: ['lungs', 'diaphragm'],
        certainty: 'established',
        title: 'Breathing out needs no pushing',
        titleJa: '息を吐くのに力は要りません',
        body: 'Breathing in is muscular work. Sitting quietly, breathing out is not: the lungs simply give back what was just put into them.',
        bodyJa: '息を吸うのは筋肉の仕事です。安静時に吐くほうはちがいます。いま入れた分を、肺がそのまま返しているだけです。',
        look: 'Watch the lungs rise and settle. Nothing is forcing the air out — they are returning to the size they rest at.',
        lookJa: '肺がふくらんで戻るのを見てください。押し出しているのではなく、元の大きさに戻っています。',
      },
      {
        progress: 0,
        stage: 'rest',
        // Same place on the axis, same body sitting still. What changed is the
        // lung, and that is the whole content of this step.
        controls: COPD_LUNGS.narrowed,
        frame: 'airway',
        focus: ['airway'],
        certainty: 'established',
        title: 'Narrower airways take longer to empty',
        titleJa: '気道が狭いと、出るのに時間がかかります',
        body: 'Narrow the passages the air leaves through and nothing stops it leaving — it just takes longer. At rest there is still time enough, so little looks different.',
        bodyJa: '空気の通り道が狭くなっても、出られなくなるわけではありません。時間がかかるだけです。安静時はまだ時間が足りているので、見た目はあまり変わりません。',
        look: 'The airways are narrower than a moment ago. The lungs beside them are still emptying to the same size between breaths.',
        lookJa: '気道が先ほどより細くなっています。隣の肺は、呼吸と呼吸の間に同じ大きさまで戻れています。',
      },
      {
        progress: 0.3,
        stage: 'light',
        controls: COPD_LUNGS.narrowed,
        focus: ['lungs', 'trapped'],
        certainty: 'established',
        title: 'Moving takes that time away',
        titleJa: '動くと、その時間が奪われます',
        body: 'Walking asks for more air each minute, so breaths come closer together. The part of each breath that gets shorter is the breathing-out part.',
        bodyJa: '歩くと必要な空気の量が増え、呼吸の間隔が詰まります。そのとき短くなるのは、吐いている時間のほうです。',
        look: 'The breaths are faster now. Watch the gap between them close — that gap was the time to breathe out.',
        lookJa: '呼吸が速くなりました。呼吸と呼吸の間隔が詰まるのを見てください。そこが吐くための時間でした。',
      },
      {
        progress: 0.6,
        stage: 'moderate',
        controls: COPD_LUNGS.narrowed,
        focus: ['trapped', 'lungs'],
        certainty: 'established',
        title: 'What did not get out is still in there',
        titleJa: '出きらなかった分は、そのまま残ります',
        body: 'The next breath in starts from wherever the last breath out reached. Breath after breath, the lungs settle at a larger size than before.',
        bodyJa: '次の吸気は、前の呼気が到達したところから始まります。呼吸を重ねるごとに、肺は前より大きい状態で落ち着くようになります。',
        look: 'The bright specks are the air each region did not give back. Watch the lungs settle a little larger each breath.',
        lookJa: '明るい粒が、各領域が返しきれなかった空気です。呼吸のたびに肺が少しずつ大きいまま落ち着くのを見てください。',
      },
      {
        progress: 0.6,
        stage: 'moderate',
        // Same workload, same axis position: this step adds the loss of recoil,
        // which is what closes the door on pushing harder.
        controls: COPD_LUNGS.obstructed,
        frame: 'airway',
        focus: ['airway'],
        certainty: 'established',
        title: 'Pushing harder stops helping',
        titleJa: '強く吐いても、もう増えません',
        body: 'When the lung has also lost its spring, pushing squeezes the airways shut as much as it drives air along them. Past a point, effort adds nothing.',
        bodyJa: '肺のばねが弱った状態では、強く吐こうとする力が、空気を押し出すのと同じだけ気道をつぶします。ある点を越えると、努力しても何も変わりません。',
        look: 'Watch the airways narrow as the breath goes out. That squeezing is the reason a harder push does not move more air.',
        lookJa: '吐くときに気道が細くなるのを見てください。この「つぶれ」があるために、強く吐いても空気は増えません。',
      },
      {
        progress: 1,
        stage: 'heavy',
        controls: COPD_LUNGS.obstructed,
        frame: 'base',
        focus: ['diaphragm', 'lungs'],
        certainty: 'established',
        title: 'The room to breathe in closes from above',
        titleJa: '吸う余裕が、上から狭まります',
        body: 'The chest can only hold so much. Starting each breath from a larger lung leaves less room to take one, and the muscle underneath is pushed flat.',
        bodyJa: '胸郭が入れられる量には上限があります。大きくふくらんだ状態から吸い始めるぶん、吸える余裕は減り、下にある筋肉は押されて平らになります。',
        look: 'Watch the dome underneath the lungs. It has flattened, and a flat one pulls less well than a domed one.',
        lookJa: '肺の下のドームを見てください。平らになっています。平らな状態では、ドーム型のときほど引けません。',
      },
      {
        progress: 1,
        stage: 'heavy',
        // Not a model output, and not a small omission: this model's own scope
        // excludes gas exchange outright, because none of it follows from lung
        // volumes. The step exists because it is the question a person asks,
        // and it says on screen that the screen is not answering it.
        controls: COPD_LUNGS.obstructed,
        frame: 'base',
        focus: ['diaphragm', 'lungs'],
        certainty: 'established',
        educationalOnly: true,
        title: 'Air moving is not the same as oxygen arriving',
        titleJa: '空気が動くことと、酸素が届くことは別です',
        body: 'Oxygen has to cross from the air into the blood, and carbon dioxide the other way. How well that happens is a separate question from how the lungs move.',
        bodyJa: '酸素は空気から血液へ、二酸化炭素は逆向きに移らなければなりません。それがどれだけうまくいくかは、肺の動きとは別の問題です。',
        look: 'Nothing here shows this: there is no blood in this picture, and no oxygen. It is only air being moved.',
        lookJa: 'この画面には血液も酸素も描かれていません。示しているのは空気の出入りだけです。',
      },
      {
        progress: 1,
        stage: 'heavy',
        controls: COPD_LUNGS.obstructed,
        frame: 'base',
        focus: ['diaphragm', 'lungs'],
        // Well supported as a group finding and highly variable between people,
        // which is exactly the distinction `associated` exists to keep.
        certainty: 'associated',
        educationalOnly: true,
        title: 'Why stopping to catch your breath happens',
        titleJa: '立ち止まって息を整えたくなる理由',
        body: 'People with lungs that empty slowly often describe breathing as effortful on exertion, and describe stopping as what settles it. How much it affects a person varies widely.',
        bodyJa: '吐き出しに時間のかかる肺の人は、動いたときに呼吸が苦しいと感じ、立ち止まると楽になると話すことが多く知られています。どの程度かは人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows the mechanics, not what anyone feels.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは力学であって、感じ方ではありません。',
      },
    ]),
  }),
  /**
   * Asthma, built on the mechanism the COPD explanation worked out and holding
   * the same promises — because it is the same contract, not a second one.
   *
   * **What is different is what the disease is.** The COPD walk ends with a
   * lung that cannot empty and a door that has closed. This one ends with a
   * tree that opens again, because that is the property that separates the two
   * scenes and the one a person most needs to hear said out loud. The states it
   * stands on — a tree that is not hyperresponsive, the asthmatic tree, and the
   * same tree with its smooth muscle released — are the three
   * `src/data/asthmaTeaching.js` declares, and the resistances quoted in its
   * comments are the model's own arithmetic.
   *
   * **The axis is the stimulus, and the guide does not pretend otherwise.** The
   * first two steps sit at zero on it: no stimulus at all, one tree that is
   * twitchy and one that is not, and nothing yet to see. That pairing is the
   * point — asthma is not visible in a quiet airway, which is exactly why the
   * step after it matters.
   *
   * **Where the model stops is marked.** Its own scope excludes gas exchange,
   * perfusion and every blood value outright; it has no blood in it. So the
   * step a person actually asks about — whether enough oxygen is arriving — is
   * `educationalOnly`, says on screen that it is not drawn from the model, and
   * is followed by the one about how much this varies between people, which is
   * marked `associated` because that is what the evidence supports and no more.
   */
  'asthma-heterogeneity': Object.freeze({
    title: 'Why the same air does not reach every part of the lung',
    titleJa: '同じ空気が、肺のすべての場所には届かない理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'quiet',
        controls: ASTHMA_TREES.notHyperresponsive,
        frame: 'tree',
        focus: ['tree', 'trachea'],
        certainty: 'established',
        title: 'Air gets in through a tree of tubes',
        titleJa: '空気は、枝分かれした管を通ります',
        body: 'One wide tube divides again and again into narrower ones, and every part of the lung is fed by the branch that reaches it.',
        bodyJa: '太い管が何度も枝分かれして細くなり、肺のどの場所も、そこへ届いた枝から空気を受け取ります。',
        look: 'Follow one branch down from the top and watch it divide. The small shapes underneath are the parts it feeds.',
        lookJa: '上から 1 本の枝をたどり、分かれていくのを見てください。下の小さな形が、その枝が受け持つ場所です。',
      },
      {
        progress: 0,
        stage: 'quiet',
        // Same place on the axis — nothing is provoking either tree. What
        // changed is the airway itself, which is the content of this step.
        controls: ASTHMA_TREES.asthmatic,
        frame: 'tree',
        focus: ['tree'],
        certainty: 'established',
        title: 'In asthma the tubes are different before anything happens',
        titleJa: '喘息では、何も起きていないときから管が違います',
        body: 'The walls are thicker than they should be and the muscle wrapped around them reacts more readily. With nothing provoking it, almost nothing looks wrong.',
        bodyJa: '壁は本来より厚く、そのまわりを取り巻く筋肉は反応しやすくなっています。刺激がなければ、見た目はほとんど変わりません。',
        look: 'The branches look much as they did. That is the point of this step — a quiet airway does not show it.',
        lookJa: '枝の見た目はほとんど変わりません。それがこの段階の要点です。静かな気道には現れません。',
      },
      {
        progress: 0.4,
        stage: 'held',
        controls: ASTHMA_TREES.asthmatic,
        frame: 'tree',
        focus: ['tree'],
        certainty: 'established',
        title: 'Something sets the muscle off, everywhere at once',
        titleJa: '筋肉が、いっせいに反応します',
        body: 'The muscle around every branch begins to tighten, evenly. At first the lung tissue attached outside holds the tubes open and little changes.',
        bodyJa: 'すべての枝を取り巻く筋肉が、均等に締まりはじめます。はじめは外側についた肺の組織が管を開いたままに保ち、大きな変化は起きません。',
        look: 'The branches are narrowing a little. Nothing here is being singled out — every one of them is getting the same stimulus.',
        lookJa: '枝がわずかに細くなっています。特定の枝だけが選ばれてはいません。どの枝にも同じ刺激が届いています。',
      },
      {
        progress: 0.75,
        stage: 'patchy',
        controls: ASTHMA_TREES.asthmatic,
        frame: 'units',
        focus: ['units', 'defect'],
        certainty: 'established',
        title: 'Where one branch gives way, its neighbour takes the air',
        titleJa: '負けた枝のぶんを、隣の枝が受け取ります',
        body: 'Air takes the easier route. A branch that narrows a little loses its share to the branch beside it, which then has more air holding it open.',
        bodyJa: '空気は通りやすいほうへ流れます。少し細くなった枝は、その分を隣の枝に奪われ、隣は空気に押されてさらに開きます。',
        look: 'Patches have gone dark, and they are next to each other. The bright regions beside them took the air.',
        lookJa: '暗くなった場所がまとまって現れています。その隣の明るい場所が、空気を受け取ったほうです。',
      },
      {
        progress: 1,
        stage: 'shift',
        controls: ASTHMA_TREES.asthmatic,
        frame: 'units',
        focus: ['units', 'tree'],
        certainty: 'established',
        title: 'Past a point, most of the lung goes together',
        titleJa: 'ある点を越えると、肺の大部分がまとめて変わります',
        body: 'Push the same even stimulus harder and the regions that were still coping give way too. The lung is even again — evenly getting very little.',
        bodyJa: '同じ均一な刺激が強くなると、持ちこたえていた場所も次々に変わります。肺はふたたび均一になりますが、均一に「ほとんど届かない」状態です。',
        look: 'Almost every region has gone dark now, and the branches above them are much narrower than they began.',
        lookJa: 'ほとんどの場所が暗くなり、その上の枝も最初よりずっと細くなっています。',
      },
      {
        progress: 1,
        stage: 'shift',
        // The same tree with its smooth muscle released. The signal is still at
        // its maximum; what changed is the muscle, and the model reopens the
        // tree from it. This is the property that separates this scene from the
        // COPD one, and it is the last thing the mechanism walk says.
        controls: ASTHMA_TREES.relaxed,
        frame: 'units',
        focus: ['units', 'tree'],
        certainty: 'established',
        title: 'When the muscle lets go, the tubes open again',
        titleJa: '筋肉がゆるむと、管はまた開きます',
        body: 'This narrowing is something the airway can come out of. Relax the muscle around it, with the same stimulus still arriving, and the air reaches those parts again.',
        bodyJa: 'この狭くなり方は、気道が元に戻れる種類のものです。同じ刺激が届いたままでも、まわりの筋肉がゆるめば、空気はふたたびその場所へ届きます。',
        look: 'Watch the dark patches light up again and the branches widen — with nothing else on screen changed.',
        lookJa: '暗かった場所が明るく戻り、枝が太くなるのを見てください。ほかは何も変えていません。',
      },
      {
        progress: 1,
        stage: 'shift',
        // Not a model output. This model's own scope excludes gas exchange,
        // perfusion and every blood value: there is no blood in it at all.
        controls: ASTHMA_TREES.relaxed,
        frame: 'units',
        focus: ['units', 'tree'],
        certainty: 'established',
        educationalOnly: true,
        title: 'Air arriving is not the same as oxygen arriving',
        titleJa: '空気が届くことと、酸素が届くことは別です',
        body: 'Oxygen has to cross from the air into the blood. Air reaching a part of the lung unevenly is one reason that can go wrong, but it is a separate question.',
        bodyJa: '酸素は空気から血液へ移らなければなりません。空気の届き方にむらがあることはその一因になりますが、別の問題です。',
        look: 'There is no blood in this picture and no oxygen. The colours are how much air each part is getting.',
        lookJa: 'この画面に血液も酸素も描かれていません。色が示すのは、各場所に届いている空気の量です。',
      },
      {
        progress: 1,
        stage: 'shift',
        controls: ASTHMA_TREES.relaxed,
        frame: 'units',
        focus: ['units', 'tree'],
        // Variable between people and variable within one person over time,
        // which is what `associated` is for and what a single story would lose.
        certainty: 'associated',
        educationalOnly: true,
        title: 'Why it can come and go',
        titleJa: '出たり収まったりする理由',
        body: 'People describe chest tightness, a whistling sound or a cough that comes on and then settles again. What sets it off, and how much, differs a great deal between people.',
        bodyJa: '胸の締めつけ、ヒューヒューという音、せきが出て、また収まると話す人が多くいます。何をきっかけにどの程度起きるかは、人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows airways and air, not what anyone feels.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは気道と空気であって、感じ方ではありません。',
      },
    ]),
  }),
  /**
   * Pneumonia, on the same contract as the two scenes before it.
   *
   * This model is a regional ventilation/perfusion one: it solves what share of
   * a lung is consolidated, what share is still ventilated, and what share of
   * the blood is passing lung that is not being ventilated. Everything the walk
   * says up to the last two steps is one of those three numbers.
   *
   * **What it stops at is a hard line.** Its own scope excludes PaO₂, SpO₂,
   * imaging, the pathogen and every treatment decision. So the step about
   * oxygen says what the shunt mechanism *is* and says on screen that the
   * screen is not measuring anyone's oxygen, and the step about how it feels is
   * marked as well. No step names an organism, an antibiotic or an x-ray.
   */
  'pneumonia-consolidation': Object.freeze({
    title: 'Why filled air sacs make breathing less effective',
    titleJa: '空気の袋が埋まると、呼吸が効きにくくなる理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'aerated',
        focus: ['regional-ventilation'],
        certainty: 'established',
        title: 'Air and blood meet everywhere',
        titleJa: '空気と血液は、どこでも出会っています',
        body: 'The lung works by bringing air and blood close together in every part of it, so that oxygen can cross from one to the other.',
        bodyJa: '肺は、どの場所でも空気と血液を近づけることで働いています。そうして酸素が一方から他方へ移ります。',
        look: 'Every region is lit the same way. Both things it needs are arriving in all of them.',
        lookJa: 'どの領域も同じように光っています。必要な二つが、すべての場所に届いています。',
      },
      {
        progress: 0.22,
        stage: 'focal',
        frame: 'lower',
        focus: ['consolidated-unit'],
        certainty: 'established',
        title: 'One patch fills up',
        titleJa: '一部が埋まります',
        body: 'In one part, the tiny air sacs fill with fluid and cells instead of air. Air cannot get into a sac that is already full.',
        bodyJa: 'ある場所で、小さな空気の袋が空気ではなく液体と細胞で満たされます。すでに埋まった袋に空気は入れません。',
        look: 'One region has changed colour. That is the part where air is no longer arriving.',
        lookJa: '一部の領域の色が変わりました。そこが、空気の届かなくなった場所です。',
      },
      {
        progress: 0.5,
        stage: 'shunt',
        frame: 'lower',
        focus: ['consolidated-unit', 'persistent-perfusion'],
        certainty: 'established',
        title: 'The blood still goes there',
        titleJa: '血液はそこへ流れ続けます',
        body: 'Blood keeps flowing past that filled patch. It arrives, finds no air to collect oxygen from, and leaves much as it came.',
        bodyJa: '血液は、埋まった場所のそばを流れ続けます。着いても酸素を受け取る空気がないため、ほとんどそのまま出ていきます。',
        look: 'The blood flow marks are still there over the filled region — that is the part of this that matters.',
        lookJa: '埋まった領域の上にも血流の印が残っています。ここがこの段階の要点です。',
      },
      {
        progress: 0.82,
        stage: 'multifocal',
        frame: 'lower',
        focus: ['persistent-perfusion', 'regional-ventilation'],
        certainty: 'established',
        title: 'The lung diverts some of it, but not all',
        titleJa: '肺は血流を一部そらしますが、すべてではありません',
        body: 'The lung narrows the vessels going to parts with no air, pushing some blood towards parts that still have it. It can only do so much.',
        bodyJa: '肺は、空気のない場所へ向かう血管を細くして、血液を空気のある場所へ回そうとします。ただし、できる範囲には限りがあります。',
        look: 'Compare the two: more blood is reaching the lit regions now, and some is still crossing the filled ones.',
        lookJa: '見比べてください。明るい領域へ向かう血液が増えていますが、埋まった領域を通る分も残っています。',
      },
      {
        progress: 0.82,
        stage: 'multifocal',
        frame: 'lower',
        // The model solves what share of the blood passes lung that is not
        // ventilated. It does not solve what that does to anyone's blood
        // oxygen — its own scope excludes PaO2 and SpO2 outright.
        focus: ['persistent-perfusion', 'regional-ventilation'],
        certainty: 'established',
        educationalOnly: true,
        title: 'How much oxygen arrives is a separate question',
        titleJa: '酸素がどれだけ届くかは別の話です',
        body: 'The share of blood passing unventilated lung is what this screen is about. How much oxygen ends up in a person is not something it works out.',
        bodyJa: '換気されていない肺を通る血液の割合が、この画面の主題です。その人の血液にどれだけ酸素が入るかは、ここでは計算していません。',
        look: 'There is no oxygen level anywhere on this screen. What is shown is where the blood goes and where the air does.',
        lookJa: 'この画面に酸素の値はどこにもありません。示しているのは、血液と空気それぞれの行き先だけです。',
      },
      {
        progress: 0.82,
        stage: 'multifocal',
        frame: 'lower',
        focus: ['persistent-perfusion', 'regional-ventilation'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What people notice',
        titleJa: '本人が気づくこと',
        body: 'A cough, a fever, and breathing that takes more effort are commonly described. Which of them appear, and how strongly, differs widely between people.',
        bodyJa: 'せき、発熱、呼吸のしづらさが訴えられることがよくあります。どれが出るか、どの程度かは人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows air and blood, not a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは空気と血液であって、人ではありません。',
      },
    ]),
  }),

  /**
   * Pulmonary embolism — the mirror image of the pneumonia walk, deliberately.
   *
   * Both scenes are about air and blood failing to meet, and they fail in
   * opposite directions: in pneumonia the blood arrives where the air cannot,
   * here the air arrives where the blood cannot. Reading them one after the
   * other is the point, and `RELATED` on each scene is what makes that possible.
   *
   * **The load step is carefully worded.** This model's own scope excludes
   * pulmonary artery pressure, cardiac output and right-ventricular function.
   * It solves the conductance of a fixed twelve-territory network, so the walk
   * says the remaining routes have to carry everything and says nothing about a
   * pressure, a heart or a number.
   */
  'pulmonary-embolism': Object.freeze({
    title: 'Why breathing into a part with no blood does nothing',
    titleJa: '血液の来ない場所に空気を送っても、意味がない理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'matched',
        focus: ['continued-ventilation'],
        certainty: 'established',
        title: 'Both have to arrive in the same place',
        titleJa: '二つが同じ場所に届く必要があります',
        body: 'Oxygen crosses from air to blood only where the two are side by side. Air on its own does nothing, and blood on its own does nothing.',
        bodyJa: '酸素が空気から血液へ移るのは、その二つが隣り合っている場所だけです。空気だけでも、血液だけでも何も起きません。',
        look: 'Every territory has both. That pairing is what the rest of this is about.',
        lookJa: 'どの領域にも両方があります。この対応関係が、以降の話の軸です。',
      },
      {
        progress: 0.25,
        stage: 'segmental',
        focus: ['vascular-obstruction'],
        certainty: 'established',
        title: 'A blood vessel is blocked',
        titleJa: '血管が詰まります',
        body: 'Something lodges in one of the vessels carrying blood into the lung. Beyond it, blood stops arriving — and the air keeps arriving, because nothing blocked the airway.',
        bodyJa: '肺へ血液を運ぶ血管の一本が、何かでふさがれます。その先には血液が届かなくなります。気道はふさがれていないので、空気は届き続けます。',
        look: 'Watch the blocked vessel, then the region beyond it: the air is still going there and the blood is not.',
        lookJa: '詰まった血管と、その先の領域を見てください。空気は届いていて、血液は届いていません。',
      },
      {
        progress: 0.52,
        stage: 'redistribution',
        focus: ['underperfused-region', 'continued-ventilation'],
        certainty: 'established',
        title: 'That breath is wasted',
        titleJa: 'その呼吸は無駄になります',
        body: 'Air reaching a part with no blood in it cannot hand its oxygen to anything. The effort of that breath is spent and nothing is exchanged.',
        bodyJa: '血液のない場所へ届いた空気は、酸素を渡す相手がありません。その呼吸にかけた力は使われますが、何も交換されません。',
        look: 'The pale regions are still being ventilated. They are the share of each breath that achieves nothing.',
        lookJa: '淡い色の領域にも空気は届いています。そこが、何も生まない呼吸の割合です。',
      },
      {
        progress: 0.82,
        stage: 'afterload',
        focus: ['vascular-obstruction', 'underperfused-region'],
        certainty: 'established',
        title: 'The routes that are left carry everything',
        titleJa: '残った通り道が、すべてを引き受けます',
        body: 'Blood through the lung takes many parallel routes. Close some and the same amount has to go through the ones still open, which is harder work to push through.',
        bodyJa: '肺を通る血液は、多くの並行した経路に分かれています。いくつかが閉じれば、同じ量が残りの経路を通ることになり、押し送るのに余計な力が要ります。',
        look: 'Count what is still open against what was open at the start — that difference is what this step is about.',
        lookJa: '開いている経路を、最初の状態と見比べてください。その差がこの段階の主題です。',
      },
      {
        progress: 0.82,
        stage: 'afterload',
        // The model solves the conductance of a fixed network. It does not
        // solve a pressure, a cardiac output or anything about the heart —
        // its own scope says so — and it solves no blood value either.
        focus: ['vascular-obstruction', 'underperfused-region'],
        certainty: 'established',
        educationalOnly: true,
        title: 'What this screen is not working out',
        titleJa: 'この画面が計算していないこと',
        body: 'How hard any heart is having to push, and how much oxygen is reaching a person, are both outside what is drawn here. This is about where air and blood go.',
        bodyJa: '心臓がどれだけの力で押しているか、その人にどれだけ酸素が届いているかは、どちらもここに描かれていません。示しているのは空気と血液の行き先です。',
        look: 'There is no heart on this screen and no oxygen level. Neither is being calculated.',
        lookJa: 'この画面に心臓も酸素の値もありません。どちらも計算していません。',
      },
      {
        progress: 0.82,
        stage: 'afterload',
        focus: ['vascular-obstruction', 'underperfused-region'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What people notice',
        titleJa: '本人が気づくこと',
        body: 'Sudden breathlessness and chest discomfort are commonly described, and sometimes very little is noticed at all. How much any of it shows differs widely.',
        bodyJa: '急な息苦しさや胸の違和感が訴えられることがよくあり、ほとんど何も感じない場合もあります。現れ方は人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows air and blood, not a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは空気と血液であって、人ではありません。',
      },
    ]),
  }),

  /**
   * Pulmonary oedema — the one respiratory walk whose oxygen step is the model
   * talking.
   *
   * Every other scene here stops before the blood: COPD, asthma, pneumonia and
   * embolism all exclude PaO₂ and SpO₂ from their scope, so the step a person
   * asks about is marked. This model does not stop there — it solves the shunt
   * fraction, an arterial oxygen tension and the alveolar–arterial difference,
   * and reads them out. So the step about oxygen here is an ordinary step, and
   * only the one about what a person feels is marked.
   *
   * That difference is the reason these marks exist. Two scenes drawing lungs
   * side by side answer different questions, and a reader has no way to tell
   * which is which by looking.
   */
  'pulmonary-edema': Object.freeze({
    title: 'Where the water goes, and when it starts to matter',
    titleJa: '水はどこへ行き、いつから問題になるのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'dry',
        focus: ['interstitium', 'hilum'],
        certainty: 'established',
        title: 'A healthy lung leaks, and drains',
        titleJa: '健康な肺も水を漏らし、そして流し出します',
        body: 'A small amount of water crosses out of the blood vessels into the lung all the time. Drainage channels carry away exactly that much, so the lung stays dry.',
        bodyJa: '血管から肺へ、わずかな水がつねに染み出しています。排水の通り道がちょうど同じ量を運び去るので、肺は乾いたままでいられます。',
        look: 'Watch the space around the vessels. Water is moving through it and not collecting in it.',
        lookJa: '血管のまわりの空間を見てください。水はそこを通り抜けていて、たまってはいません。',
      },
      {
        progress: 0.4,
        stage: 'buffered',
        focus: ['interstitium', 'hilum'],
        certainty: 'established',
        title: 'More pressure, and the drains keep up',
        titleJa: '圧が上がっても、排水が追いつきます',
        body: 'When the pressure pushing water out rises, more crosses — and the drainage speeds up to match. For a while nothing accumulates and nothing is felt.',
        bodyJa: '水を押し出す圧が上がると、染み出す量も増えます。排水もそれに合わせて速くなります。しばらくは何もたまらず、自覚もありません。',
        look: 'More water is crossing than before, and the space around the vessels has barely changed.',
        lookJa: '染み出す量は増えていますが、血管まわりの空間はほとんど変わっていません。',
      },
      {
        progress: 0.68,
        stage: 'interstitial',
        focus: ['interstitium'],
        certainty: 'established',
        title: 'The space around the air sacs fills first',
        titleJa: 'まず、空気の袋のまわりが満たされます',
        body: 'Past what the drainage can carry, water collects — but in the space between the air sacs, not inside them. Breathing gets heavier while the sacs are still dry.',
        bodyJa: '排水が運べる量を超えると、水がたまり始めます。ただし空気の袋の中ではなく、袋と袋のあいだの空間にです。袋が乾いたままでも、呼吸は重くなります。',
        look: 'The filling is around the air sacs, not in them. That distinction is the whole of this step.',
        lookJa: 'たまっているのは袋の中ではなく、そのまわりです。この違いが、この段階のすべてです。',
      },
      {
        progress: 1,
        stage: 'alveolar',
        focus: ['alveoli'],
        certainty: 'established',
        title: 'Then it crosses into the air sacs',
        titleJa: 'やがて、袋の中へ入ります',
        body: 'When that space can hold no more, water crosses into the air sacs themselves. A flooded sac still has blood arriving at it and no longer has air.',
        bodyJa: 'その空間が満杯になると、水は空気の袋そのものへ入ります。水で満たされた袋にも血液は届きますが、空気はもうありません。',
        look: 'The sacs themselves have changed now. That is a different thing from the step before it.',
        lookJa: '今度は袋そのものが変わりました。前の段階とは別のことが起きています。',
      },
      {
        progress: 1,
        stage: 'alveolar',
        // An ordinary step, not a marked one: this model solves the shunt
        // fraction, the arterial oxygen tension and the A-a difference, and
        // reads all three out. The scenes either side of it do not.
        focus: ['alveoli'],
        certainty: 'established',
        title: 'Now the oxygen falls',
        titleJa: 'ここで酸素が下がります',
        body: 'Blood arriving at a flooded sac finds no air to take oxygen from and carries on past. This is the point at which the amount reaching the body drops.',
        bodyJa: '水で満たされた袋に届いた血液は、酸素を受け取る空気がないまま通り過ぎます。体に届く量が落ちるのは、この時点からです。',
        look: 'The flooded sacs still have blood going to them. That blood is the part that is not picking anything up.',
        lookJa: '水で満たされた袋にも血液は向かっています。その血液が、何も受け取れていない分です。',
      },
      {
        progress: 1,
        stage: 'alveolar',
        focus: ['alveoli'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'Why lying flat can make it worse',
        titleJa: '横になると苦しくなることがある理由',
        body: 'Breathlessness that is worse lying down, and eases on sitting up, is commonly described. How much, and how quickly, differs a great deal between people.',
        bodyJa: '横になると息苦しく、起き上がると楽になると訴えられることがよくあります。程度も現れ方も、人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows where the water is, not how anyone feels.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは水の位置であって、感じ方ではありません。',
      },
    ]),
  }),

  /**
   * Portal hypertension, on the same contract as the respiratory scenes.
   *
   * **The axis is the liver's own resistance and nothing else.** The scene says
   * so: splanchnic vasodilation — the second half of the story — is a control
   * of its own, and this walk does not touch it. So the steps are about one
   * thing getting harder to cross, and the last mechanism step says plainly
   * that the detours do not fix it because the resistance behind them and the
   * inflow in front of them are both still there. That is the scene's own
   * finding and the reason it exists.
   *
   * **What it refuses is on the record and is respected here.** Its scope
   * excludes ascites, varices, bleeding, encephalopathy and liver function of
   * every kind — it has flows, not consequences — so no step names any of them
   * as something that follows. The two marked steps say what the picture does
   * not contain and that what happens to a person is not in it.
   *
   * No step gives a pressure. The model reports a portal pressure gradient and
   * an HVPG and is emphatic that they are not the same number; a patient-facing
   * figure would be the easiest place in the product to conflate them.
   */
  'portal-hypertension': Object.freeze({
    title: 'Why pressure builds up before the liver',
    titleJa: '肝臓の手前で圧が上がる理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'healthy',
        frame: 'system',
        focus: ['liver', 'portal'],
        certainty: 'established',
        title: 'Blood from the gut goes through the liver first',
        titleJa: '腸からの血液は、まず肝臓を通ります',
        body: 'Blood leaving the stomach and intestines does not go straight back to the heart. It is routed through the liver on the way, in its own vein.',
        bodyJa: '胃や腸から出た血液は、そのまま心臓へ戻るのではありません。途中で肝臓を通るよう、専用の静脈で導かれています。',
        look: 'Follow the vein into the liver and out the other side. A healthy liver is very easy to flow through.',
        lookJa: '肝臓に入り、反対側から出ていく静脈を目で追ってください。健康な肝臓は、とても通りやすい場所です。',
      },
      {
        progress: 0.35,
        stage: 'scarring',
        frame: 'system',
        focus: ['liver', 'portal'],
        certainty: 'established',
        title: 'Scarring makes the liver hard to cross',
        titleJa: '瘢痕化で、肝臓を通りにくくなります',
        body: 'Scar tissue and regrowing nodules change the inside of the liver, and blood has to be pushed harder to get through it. The pressure in front of it rises.',
        bodyJa: '瘢痕の組織と再生した結節が肝臓の内部を変え、血液を通すのにより強い力が要るようになります。その手前の圧が上がります。',
        look: 'Nothing about the vein has changed. What changed is the liver the vein has to push through.',
        lookJa: '静脈そのものは変わっていません。変わったのは、静脈が血液を押し通す先の肝臓です。',
      },
      {
        progress: 0.6,
        stage: 'collaterals',
        frame: 'system',
        focus: ['collateral', 'portal'],
        certainty: 'established',
        title: 'Other veins open, and carry blood around it',
        titleJa: '別の静脈が開き、迂回路になります',
        body: 'Over months and years, small existing veins widen into a network that carries a large share of the blood past the liver instead of through it.',
        bodyJa: '数か月から数年かけて、もともとある細い静脈が広がってつながり、血液のかなりの部分を肝臓の中ではなく脇を通して運ぶようになります。',
        look: 'New routes have appeared beside the liver. Watch how much of the flow moves onto them.',
        lookJa: '肝臓の脇に新しい通り道が現れています。どれだけの流れがそちらへ移るかを見てください。',
      },
      {
        progress: 1,
        stage: 'advanced',
        frame: 'system',
        focus: ['collateral', 'splanchnic'],
        certainty: 'established',
        title: 'The detours help, and the pressure stays high',
        titleJa: '迂回路は効きますが、圧は高いままです',
        body: 'The detours take a real share of the load and the pressure comes down a little. It stays far above normal, because the liver is still hard to cross and blood keeps arriving.',
        bodyJa: '迂回路は負荷のかなりの部分を引き受け、圧は少し下がります。それでも正常よりはるかに高いままです。肝臓が通りにくいことも、血液が届き続けることも変わらないからです。',
        look: 'Compare the two routes, then look at the pressure. Most of the blood has moved and the pressure has barely followed.',
        lookJa: '二つの通り道を見比べ、それから圧を見てください。血液の大半は移ったのに、圧はほとんど下がっていません。',
      },
      {
        progress: 1,
        stage: 'advanced',
        // The model has flows, not consequences: its scope excludes ascites,
        // varices, bleeding, encephalopathy and liver function of every kind.
        frame: 'system',
        focus: ['collateral', 'splanchnic'],
        certainty: 'established',
        educationalOnly: true,
        title: 'This screen is pressure and flow, and nothing else',
        titleJa: 'この画面は圧と流れだけです',
        body: 'What the liver does as an organ — the work it performs for the body — is not represented here at all. Neither is anything that happens as a result of the pressure.',
        bodyJa: '肝臓が臓器として果たしている働きは、ここには一切描かれていません。圧が高いことによって起きることも同様です。',
        look: 'There is no liver function anywhere on this screen. What is drawn is where blood goes and how hard it is pushed.',
        lookJa: 'この画面に肝臓の働きを示すものはありません。描かれているのは血液の行き先と、押す力の強さだけです。',
      },
      {
        progress: 1,
        stage: 'advanced',
        frame: 'system',
        focus: ['collateral', 'splanchnic'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What high pressure here can lead to varies greatly',
        titleJa: 'ここで圧が高いと何が起きるかは、人によって大きく違います',
        body: 'Raised pressure in this system is associated with several problems elsewhere in the body. Which of them appear, and when, differs widely and is not shown here.',
        bodyJa: 'この系の圧が高いことは、体の別の場所で起きるいくつかの問題と関連が知られています。どれがいつ現れるかは人によって大きく異なり、ここには示されていません。',
        look: 'Nothing new is drawn for this step. The picture shows a pressure, not what will happen to anyone.',
        lookJa: 'この段階で新しく描かれるものはありません。示しているのは圧であって、誰かに起きることではありません。',
      },
    ]),
  }),

  /**
   * Hepatorenal syndrome — the walk where one solve really does span three
   * organs, and the one place in this product where that may be said.
   *
   * `solveHepatorenal` **imports and calls** `solvePortalCirculation`: the liver
   * on this screen is solved by the same function the portal-hypertension scene
   * uses, inside one solve with one unknown, and the kidney's perfusion pressure
   * comes out of it. So the chain this walk describes — the liver, the
   * circulation, then the kidney — is numerically coupled, not two pictures
   * placed side by side.
   *
   * **And now the screen shows it.** The scene reads out the portal pressure
   * gradient and the splanchnic inflow beside the filtration rate, all from the
   * same solve: along this axis the gradient goes 3.0 → 17.0 mmHg, the inflow
   * 1016 → 1289 mL/min, the arterial pressure 90 → 79 mmHg and the filtration
   * 120 → 53 mL/min. The walk has a step for each of those, in that order, so
   * the reader meets the whole chain in one scene rather than being asked to
   * carry it across a link.
   *
   * **That is exactly why the neighbouring links say the opposite.** Moving
   * from the portal-hypertension scene to this one is navigation between two
   * models; nothing is carried across. The coupling is inside this scene, and
   * `RELATED` in `src/data/hepatorenal.js` says so rather than letting the two
   * facts blur into each other.
   *
   * **The scene's own boundary is the last mechanism step, not a footnote.**
   * This model gives the kidney no injury at all, and filtration still collapses
   * — which is the measure the scene exists to give. The step after it says, on
   * screen, that a person's kidney may be injured as well and that this picture
   * has none of it to weigh. No step names a diagnosis, a criterion, a drug or
   * a course: the scope excludes ascites, every tubule, all structural injury
   * and all time, and the patient copy rules forbid the rest.
   */
  'hepatorenal-syndrome': Object.freeze({
    title: 'How a liver problem reaches the kidneys',
    titleJa: '肝臓の問題が、どうやって腎臓に届くのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'healthy',
        frame: 'chain',
        // Start from one kidney. The step that compares two of them turns the
        // comparison on; this makes sure the walk begins somewhere known
        // whatever the reader had on screen before.
        compare: false,
        focus: ['liver', 'kidney'],
        certainty: 'established',
        title: 'Two organs on one circulation',
        titleJa: '一つの循環につながった二つの臓器',
        body: 'The liver and the kidneys are far apart and share one blood supply. Neither is defending itself against anything here.',
        bodyJa: '肝臓と腎臓は離れていますが、血液の流れは一つでつながっています。ここではどちらも、何かに対抗している状態ではありません。',
        look: 'Both organs are on screen at once. That pairing is what the rest of this is about.',
        lookJa: '二つの臓器が同時に映っています。この組み合わせが、以降の話の軸です。',
      },
      {
        progress: 0.18,
        stage: 'vasodilation',
        // The liver step, and the reason it can be here at all: this scene's
        // solve contains the portal circulation's, so the pressure in front of
        // the liver is one of *this* model's outputs — 3.0 mmHg at the start of
        // the axis, 8.1 here, 17.0 at the end. The scene reads it out beside
        // the filtration rate, from the same solve.
        frame: 'chain',
        focus: ['liver'],
        certainty: 'established',
        title: 'The liver becomes hard to get through',
        titleJa: '肝臓を通りにくくなります',
        body: 'Blood from the gut is routed through the liver on its way back. When the liver is scarred it becomes hard to cross, and the pressure in front of it rises.',
        bodyJa: '腸からの血液は、戻る途中で肝臓を通ります。肝臓が瘢痕化すると通りにくくなり、その手前の圧が上がります。',
        look: 'Watch the liver on the left and the vessel arriving at it. Everything after this step follows from what is happening here.',
        lookJa: '左の肝臓と、そこへ届く血管を見てください。この先の段階は、すべてここから始まります。',
      },
      {
        progress: 0.18,
        stage: 'vasodilation',
        frame: 'chain',
        focus: ['splanchnic', 'aorta'],
        certainty: 'established',
        title: 'The vessels around the gut open wide',
        titleJa: '腸のまわりの血管が大きく開きます',
        body: 'A liver that blood cannot cross easily causes the arteries feeding the gut to widen. That is a large, easy route opening in parallel with every other one.',
        bodyJa: '血液が通りにくくなった肝臓のために、腸へ向かう動脈が広がります。ほかのすべての経路と並んで、大きくて通りやすい道が開くということです。',
        look: 'Watch the vessels in the middle widen. The pressure through the whole system falls as they do.',
        lookJa: '中央の血管が広がるのを見てください。それにつれて、系全体の圧が下がります。',
      },
      {
        progress: 0.38,
        stage: 'defended',
        frame: 'chain',
        focus: ['afferent', 'efferent', 'kidney'],
        certainty: 'established',
        title: 'The body tightens everything it can',
        titleJa: '体は、締められるところをすべて締めます',
        body: 'To hold the pressure up, the body narrows the vessels that still respond. The ones around the gut do not, so most of that narrowing lands elsewhere — the kidneys among them.',
        bodyJa: '圧を保つため、体はまだ反応する血管を細くします。腸のまわりの血管は反応しないので、その締めつけの多くは別の場所に及びます。腎臓もその一つです。',
        look: 'Watch the two small vessels at the kidney. The one leaving is tightening more than the one arriving.',
        lookJa: '腎臓の二本の細い血管を見てください。出ていく側のほうが、入ってくる側より強く締まっています。',
      },
      {
        progress: 0.58,
        stage: 'failure',
        frame: 'chain',
        focus: ['afferent', 'filtrate'],
        certainty: 'established',
        title: 'The kidney runs out of ways to protect itself',
        titleJa: '腎臓が、自分を守る手立てを使い切ります',
        body: 'The kidney had been widening its incoming vessel to keep its own flow up. There is a limit to that, and past it the kidney simply follows the falling pressure.',
        bodyJa: '腎臓は、入ってくる血管を広げることで自らの血流を保ってきました。それには限界があり、超えた先では、腎臓は下がる圧にただ従うことになります。',
        look: 'The incoming vessel cannot widen any further. Watch what is filtered fall from here.',
        lookJa: '入ってくる血管はもう広がれません。ここから、ろ過される量が落ちていくのを見てください。',
      },
      {
        progress: 1,
        stage: 'circulatory-share',
        // No framing named here on purpose. The scene has its own shot for when
        // two models are on screen, and asking for the single-organ one would
        // hold the pair at a distance chosen for a chain that is no longer what
        // is being drawn.
        // These two labels belong to the scene's comparison, so the steps that
        // say "compare the two kidneys" have to put the second one on screen.
        // Presentation, not physiology: a second model drawn beside this one,
        // with nothing about this one changed.
        compare: true,
        focus: ['thisKidney', 'releasedKidney'],
        certainty: 'established',
        title: 'Nothing here has damaged the kidney',
        titleJa: 'ここでは、腎臓そのものは傷んでいません',
        body: 'Filtering has fallen to a fraction of normal and the kidney in this picture is undamaged throughout. This is how far the circulation alone can carry it.',
        bodyJa: 'ろ過の量は正常のごく一部まで落ちましたが、この絵の腎臓は最後まで傷んでいません。循環の変化だけで、ここまで到達し得るということです。',
        look: 'Compare the two kidneys: the same organ, with and without the signal squeezing it. Neither is injured.',
        lookJa: '二つの腎臓を見比べてください。締めつけの信号があるかないかの違いだけで、どちらも傷んではいません。',
      },
      {
        progress: 1,
        stage: 'circulatory-share',
        // The model's own boundary, said on screen: it has no structural
        // injury in it at all, so it cannot weigh one part against the other.
        // No framing named here on purpose. The scene has its own shot for when
        // two models are on screen, and asking for the single-organ one would
        // hold the pair at a distance chosen for a chain that is no longer what
        // is being drawn.
        // These two labels belong to the scene's comparison, so the steps that
        // say "compare the two kidneys" have to put the second one on screen.
        // Presentation, not physiology: a second model drawn beside this one,
        // with nothing about this one changed.
        compare: true,
        focus: ['thisKidney', 'releasedKidney'],
        certainty: 'established',
        educationalOnly: true,
        title: 'A person’s kidney may also be injured',
        titleJa: '実際には、腎臓自体が傷んでいることもあります',
        body: 'In a person, damage to the kidney itself can be present alongside all of this. There is none of it in this picture, so nothing here can weigh one against the other.',
        bodyJa: '実際には、これらと並んで腎臓そのものの傷みがあることもあります。この絵にはそれが一切ないため、どちらがどれだけかを比べることはできません。',
        look: 'The kidney on screen is undamaged by construction. That is a choice about the model, not a finding about anyone.',
        lookJa: '画面の腎臓は、作りとして傷んでいません。これはモデル上の設定であって、誰かについて分かったことではありません。',
      },
      {
        progress: 1,
        stage: 'circulatory-share',
        // No framing named here on purpose. The scene has its own shot for when
        // two models are on screen, and asking for the single-organ one would
        // hold the pair at a distance chosen for a chain that is no longer what
        // is being drawn.
        // These two labels belong to the scene's comparison, so the steps that
        // say "compare the two kidneys" have to put the second one on screen.
        // Presentation, not physiology: a second model drawn beside this one,
        // with nothing about this one changed.
        compare: true,
        focus: ['thisKidney', 'releasedKidney'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'How far and how fast this goes varies',
        titleJa: 'どこまで、どのくらいの速さで進むかは様々です',
        body: 'This screen shows one path through the changes at a single moment each time. It has no days or weeks in it, and people do not follow one course.',
        bodyJa: 'この画面が示すのは、変化の中の一本の道を、そのつど一瞬ずつ見たものです。日や週といった時間はなく、経過も人によって一様ではありません。',
        look: 'Nothing new is drawn for this step. There is no time anywhere in this picture.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵のどこにも時間はありません。',
      },
    ]),
  }),
  /**
   * The kidney — the one walk in this file that is a **list of alternatives**
   * rather than a sequence.
   *
   * Every other guide here follows one mechanism getting further along. This
   * scene is not built that way and must not be explained that way: it has a
   * `situation` control that selects *which thing has gone wrong* — not enough
   * blood arriving, a damaged lining, a blockage below, a sieve that stopped
   * choosing — and a progression axis that means "how far into **that**". Told
   * as one story, four different diseases read as four stages of one, which is
   * the single worst thing a kidney explanation can teach.
   *
   * **So four of the steps sit at the same position on the axis.** They differ
   * only in the situation, the axis does not move between them, and each one
   * says in its own words that it is a different problem. `src/data/
   * guideModelState.js` knows the difference too: a control that is a `choice`
   * is switching subject, and a control that is a number is not.
   *
   * **The numbers behind the copy are the model's.** Pre-renal takes the
   * filtration from 128 to 66 mL/min while the fraction of sodium excreted
   * *falls* from 0.70 to 0.18 % and the urine concentrates; tubular injury
   * takes it to 14 with sodium excretion rising to 5.5 % and no concentrating
   * at all; obstruction raises the pressure in Bowman's space from 15 to 28
   * mmHg; nephrotic leaves filtration near normal and loses grams of protein.
   * The patient copy says the direction of each and none of the figures.
   *
   * **The last mechanism step is the only one that goes further along the
   * axis**, and it stays on the obstruction it just introduced, because that
   * is the one whose "further along" has a plain meaning: the back-pressure
   * rises until it meets the pressure doing the filtering.
   *
   * The two marked steps carry the thing this scene most needs to refuse. It
   * shows four mechanisms; it does not decide which one anybody has.
   */
  'renal-filtration': Object.freeze({
    title: 'Four different things that go wrong in a kidney',
    titleJa: '腎臓で起きる、4 つの別々の問題',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'intact',
        controls: { situation: 'normal' },
        frame: 'nephron',
        focus: ['glomerulus', 'proximalConvoluted'],
        certainty: 'established',
        title: 'A kidney throws almost everything away, then takes it back',
        titleJa: '腎臓は、いったん捨ててから取り戻します',
        body: 'Blood is filtered at one end into a tube, and almost all of the water and salt in what was filtered is taken back along that tube. Most of the work is the taking back.',
        bodyJa: '血液は一方の端で濾されて管へ入り、濾された水と塩のほとんどは、その管を通るあいだに取り戻されます。仕事の大半は、取り戻すほうです。',
        look: 'Follow the tuft at the top into the tube below it. What leaves the tuft is not what leaves the tube.',
        lookJa: '上の毛玉から、その下の管へと目で追ってください。毛玉を出たものと、管を出るものは違います。',
      },
      {
        progress: 0.5,
        stage: 'compensating',
        // A different problem, not a later stage. The axis does not move here
        // and does not move again until the last mechanism step.
        controls: { situation: 'prerenal' },
        frame: 'nephron',
        focus: ['glomerulus', 'proximalConvoluted'],
        certainty: 'established',
        title: 'One: not enough blood arriving',
        titleJa: 'その 1：血液が足りない',
        body: 'With less blood reaching it, the kidney tightens the vessel leaving the filter so that filtering continues. It also holds on hard to salt and water.',
        bodyJa: '届く血液が減ると、腎臓は濾過器から出ていく血管を締めて、濾過を続けようとします。同時に、塩と水をしっかり抱え込みます。',
        look: 'Watch the vessel on the far side of the tuft narrow. The tube below it is undamaged and is working harder.',
        lookJa: '毛玉の向こう側の血管が細くなるのを見てください。その下の管は傷んでおらず、よく働いています。',
      },
      {
        progress: 0.5,
        stage: 'compensating',
        controls: { situation: 'tubularInjury' },
        frame: 'nephron',
        focus: ['proximalConvoluted', 'loopTip'],
        certainty: 'established',
        title: 'Two: the lining of the tube is damaged',
        titleJa: 'その 2：管の内張りが傷む',
        body: 'A different problem, not a later one. Here the filter is fine and the tube cannot take back what was filtered, so salt and water leave instead of returning.',
        bodyJa: 'これは別の問題であって、続きではありません。濾過器は無事で、管が濾したものを取り戻せません。塩と水は戻らずに出ていきます。',
        look: 'The tube is what changed, not the tuft. Compare it with the step before, where the tube was the healthy part.',
        lookJa: '変わったのは毛玉ではなく管です。管が健常だった前の段階と見比べてください。',
      },
      {
        progress: 0.5,
        stage: 'compensating',
        controls: { situation: 'nephrotic' },
        frame: 'nephron',
        focus: ['glomerulus'],
        certainty: 'established',
        title: 'Three: the sieve stops choosing',
        titleJa: 'その 3：ふるいが選ばなくなる',
        body: 'Again a different problem. The amount being filtered is close to normal, but the filter has stopped holding protein back, so protein goes through it into the tube.',
        bodyJa: 'これもまた別の問題です。濾す量はほぼ正常のまま、濾過器がタンパク質を留めなくなり、タンパク質が管のほうへ通り抜けます。',
        look: 'Watch the tuft, not the tube. Nothing about how much passes has changed — only what is allowed to.',
        lookJa: '管ではなく毛玉を見てください。通る量は変わっていません。変わったのは「何を通すか」です。',
      },
      {
        progress: 0.5,
        stage: 'compensating',
        controls: { situation: 'obstruction' },
        frame: 'nephron',
        focus: ['collectingDuct', 'glomerulus'],
        certainty: 'established',
        title: 'Four: the way out is blocked',
        titleJa: 'その 4：出口がふさがれる',
        body: 'The fourth problem is below the kidney altogether. Nothing about the filter or the tube has changed — what has changed is that the fluid they make cannot get away.',
        bodyJa: '4 つめの問題は、腎臓より下にあります。濾過器も管も変わっていません。変わったのは、作られた液が出ていけないことです。',
        look: 'Look at the bottom of the tube first, and then back up at the tuft. The blockage is at one end and it will be felt at the other.',
        lookJa: 'まず管の下端を見て、それから毛玉へ戻ってください。詰まりは一方の端にあり、影響はもう一方に出ます。',
      },
      {
        progress: 1,
        stage: 'established',
        // The one step that moves along the axis, and it stays on the situation
        // the step before introduced. The model's own result: the pressure in
        // Bowman's space rises from 15 to 28 mmHg and filtration falls with it.
        controls: { situation: 'obstruction' },
        frame: 'nephron',
        focus: ['collectingDuct', 'glomerulus'],
        certainty: 'established',
        title: 'A blockage reaches back up to the filter',
        titleJa: '詰まりは、濾過器まで戻ってきます',
        body: 'Fluid that cannot leave backs up, and the pressure it builds pushes against the pressure doing the filtering. Where the two meet, filtering stops.',
        bodyJa: '出ていけない液はたまり、その圧が、濾過を行っている圧を押し返します。両者が釣り合ったところで、濾過は止まります。',
        look: 'Watch the space around the tuft rather than the tuft itself. That is where the returning pressure is felt.',
        lookJa: '毛玉そのものではなく、そのまわりの空間を見てください。戻ってきた圧を受けるのはそこです。',
      },
      {
        progress: 1,
        stage: 'established',
        // What this scene most needs to refuse. It shows four mechanisms; it
        // does not decide which one anybody has.
        controls: { situation: 'obstruction' },
        frame: 'nephron',
        focus: ['collectingDuct', 'glomerulus'],
        certainty: 'established',
        educationalOnly: true,
        title: 'Which of the four it is, is not on this screen',
        titleJa: 'どの 4 つなのかは、この画面にはありません',
        body: 'These are four separate things that go wrong, and telling them apart in a person is done with tests and history. This picture shows the mechanisms, not the answer.',
        bodyJa: 'この 4 つは別々の問題であり、実際にどれなのかは検査や経過から見分けます。この絵が示すのは仕組みであって、答えではありません。',
        look: 'Nothing new is drawn for this step. The screen shows one mechanism at a time because you chose it, not because it was found.',
        lookJa: 'この段階で新しく描かれるものはありません。仕組みが 1 つずつ映るのは選んだからであって、見つかったからではありません。',
      },
      {
        progress: 1,
        stage: 'established',
        controls: { situation: 'obstruction' },
        frame: 'nephron',
        focus: ['collectingDuct', 'glomerulus'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What people notice, and how much, varies',
        titleJa: '気づくこと、その程度は様々です',
        body: 'Swelling, passing less water, and tiredness are described in kidney trouble of several kinds. Some people notice very little. None of it is shown here.',
        bodyJa: 'むくみ、尿の量が減ること、だるさは、いろいろな腎臓の不調で語られます。ほとんど気づかない人もいます。どれもここには描かれていません。',
        look: 'Nothing new is drawn for this step. The screen shows one nephron, not a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面にあるのはネフロン 1 本であって、人ではありません。',
      },
    ]),
  }),
  /**
   * Biliary obstruction — four places, not four stages.
   *
   * Built on the shape the renal walk worked out, because the disease has the
   * same shape: the site is a **choice** and the axis is how complete the
   * blockage is. A reader who moves from the cystic duct to the common bile
   * duct has changed the question, and every step that changes the site leaves
   * the axis exactly where it was, which
   * `tests/pathology-guides.test.js` holds.
   *
   * **The model's own answers are what the copy says.** With the cystic duct
   * blocked, the flow to the gut is unchanged to six decimal places and the
   * duct pressures do not move at all — the gallbladder is simply cut off, and
   * that is the whole visible content. With the common bile duct blocked, every
   * segment above it is pressurised, the gallbladder with them, and the
   * pancreatic duct is untouched. Only at the papilla does one blockage take
   * both, because that is the only resistance the two paths share.
   *
   * **What it refuses is most of what the words mean in a clinic.** The model
   * has pressures and flows and no pigment, no stone, no inflammation and no
   * time. So no step names jaundice, a stone, an operation or a test, and the
   * marked steps at the end say on screen that what a person notices is not
   * drawn from this.
   */
  'biliary-obstruction': Object.freeze({
    title: 'Where a blockage sits decides what it does',
    titleJa: 'どこで詰まるかが、何が起きるかを決めます',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'patent',
        controls: { site: 'none' },
        frame: 'whole',
        focus: ['gallbladder', 'papilla'],
        certainty: 'established',
        title: 'Bile leaves the liver and runs to the gut',
        titleJa: '胆汁は肝臓を出て、腸へ向かいます',
        body: 'The liver makes bile all the time. It runs down a tube into the gut, and a small bag hangs off the side of that tube along the way.',
        bodyJa: '肝臓はつねに胆汁を作っています。胆汁は管を下って腸へ入り、その途中で、管の脇に小さな袋がぶら下がっています。',
        look: 'Follow the stream from the top of the screen to the bottom. The bag beside it is on a side branch, not on the way.',
        lookJa: '画面の上から下へ、流れを目で追ってください。脇の袋は本道ではなく枝の先にあります。',
      },
      {
        progress: 0.5,
        stage: 'partial',
        // The axis moves and the site is entered for the first time. From here
        // every change of site happens with the axis standing still, so the
        // three blockages are compared like for like.
        controls: { site: 'common-bile-duct' },
        frame: 'lower',
        focus: ['commonBile', 'papilla'],
        certainty: 'established',
        title: 'Narrow the main tube part of the way',
        titleJa: '本道を途中まで狭くします',
        body: 'Most blockages are partial for a while. Less gets through, and what cannot get through backs up behind — so the pressure above starts to rise before anything is fully shut.',
        bodyJa: '多くの閉塞は、しばらくは部分的です。通る量が減り、通れない分は手前にたまります。完全に閉じる前から、上流の圧は上がり始めます。',
        look: 'The stream past the narrowing has thinned. The tube above it has begun to widen.',
        lookJa: '狭くなった先の流れが細くなりました。その上の管は広がり始めています。',
      },
      {
        progress: 1,
        stage: 'complete',
        controls: { site: 'common-bile-duct' },
        frame: 'lower',
        focus: ['commonBile', 'gallbladder'],
        certainty: 'established',
        title: 'The main tube, blocked all the way',
        titleJa: '本道が完全に詰まる',
        body: 'Nothing gets past now, so everything above the blockage fills and widens — the bag included, because it is still connected to what is filling.',
        bodyJa: '今度は先へ進めないため、閉塞の上流はすべて満ちて広がります。袋もつながったままなので、一緒に広がります。',
        look: 'Watch how far up the widening reaches. Everything above the block is in it, and nothing below is.',
        lookJa: '広がりがどこまで上に達しているかを見てください。閉塞より上はすべて含まれ、下は含まれていません。',
      },
      {
        progress: 1,
        stage: 'complete',
        // The contrast, and the reason it comes after the main tube rather
        // than before it: what a blockage here does is best seen against what
        // one on the path just did. The axis has not moved.
        controls: { site: 'cystic-duct' },
        frame: 'upper',
        focus: ['gallbladder', 'cystic'],
        certainty: 'established',
        title: 'Now put the same blockage on the side branch',
        titleJa: '同じ閉塞を、枝のほうに置きます',
        body: 'A different place, not a worse one. The bag is cut off — and what runs down the main tube to the gut does not change at all, because the bag was never on the way.',
        bodyJa: '別の場所であって、悪化した状態ではありません。袋は切り離されますが、本道を下って腸へ届く分はまったく変わりません。袋はもともと本道になかったからです。',
        look: 'The stream into the bag has stopped. Look at the main tube below it — it is running exactly as it was.',
        lookJa: '袋へ入る流れが止まりました。その下の本道を見てください。先ほどとまったく同じように流れています。',
      },
      {
        progress: 1,
        stage: 'complete',
        controls: { site: 'ampulla' },
        frame: 'lower',
        focus: ['papilla', 'pancreaticDuct'],
        certainty: 'established',
        title: 'And the shared doorway at the end',
        titleJa: '最後に、共有の出口',
        body: 'A third place, at the very end. Another tube arrives from a different organ and leaves through the same doorway, so blocking it stops both at once.',
        bodyJa: '3 つめは、いちばん端です。別の臓器から来る管が同じ出口を使っているため、ここが詰まると両方が同時に止まります。',
        look: 'Two streams arrive at the bottom of the screen, not one. Watch both stop, which did not happen a moment ago.',
        lookJa: '画面の下には、1 本ではなく 2 本の流れが届いています。両方が止まるのを見てください。前の段階では起きなかったことです。',
      },
      {
        progress: 1,
        stage: 'complete',
        // The model has pressures and flows and no pigment at all.
        controls: { site: 'ampulla' },
        frame: 'lower',
        focus: ['papilla', 'pancreaticDuct'],
        certainty: 'established',
        educationalOnly: true,
        title: 'What backs up here is not what is measured in a clinic',
        titleJa: 'ここでたまるものと、外来で測るものは別です',
        body: 'Bile carries a colouring that the body normally sends out this way. Where it goes when this route closes is a separate question, and this picture has none of it in it.',
        bodyJa: '胆汁には、体が普段この経路で送り出している色素が含まれています。この道が閉じたときにそれがどこへ行くかは別の問題で、この絵には含まれていません。',
        look: 'There is no colour in this picture and no blood. What is drawn is a pressure and a flow.',
        lookJa: 'この絵に色素も血液もありません。描かれているのは圧と流れです。',
      },
      {
        progress: 1,
        stage: 'complete',
        controls: { site: 'ampulla' },
        frame: 'lower',
        focus: ['papilla', 'pancreaticDuct'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What people notice depends on where it is',
        titleJa: '気づくことは、どこで詰まったかによります',
        body: 'Discomfort after eating, and a change in the colour of the skin or eyes, are described with blockages of this kind. Which of them appear depends on the place, and varies between people.',
        bodyJa: '食後の不快感や、皮膚や目の色の変化が、この種の閉塞で語られます。どれが現れるかは場所によって異なり、人によっても違います。',
        look: 'Nothing new is drawn for this step. The screen shows tubes and what runs through them, not a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは管と、その中を流れるものであって、人ではありません。',
      },
    ]),
  }),

  /**
   * Achalasia — the third shape a walk in this file takes.
   *
   * The lung scenes walk a severity, the nephron and the biliary tree walk a
   * list of alternatives, and this one walks a **balance being found**: nothing
   * changes for several swallows, then something accumulates, then the thing
   * that accumulated takes over the work. That is the disease, and it is why
   * the scene is worth animating rather than drawing.
   *
   * **Two failures, named apart.** The walk gives the wave and the ring a step
   * each before showing them together, because a reader who meets them as one
   * thing has learned the wrong lesson: the model says a tight ring with a good
   * wave and a relaxed ring with no wave behave differently, and neither is the
   * pair. The scene's controls let a reader take one away; the walk shows why
   * they would want to.
   *
   * **The model's own answers.** At the middle of the axis 38 mL is standing in
   * the oesophagus, the column is 6.4 cm tall, and every swallow still gets
   * through — because of what is already there. At the end, 132 mL, a column
   * the height of the organ, and nothing gets through at all, because a column
   * that tall is worth about sixteen millimetres of mercury and the ring holds
   * twenty-five.
   *
   * What it refuses: no cause, no test, no operation, no risk. The model has a
   * ring and a wave and no reason for either, and the marked steps say so.
   */
  achalasia: Object.freeze({
    title: 'Why a swallow can stop on the way down',
    titleJa: '飲み込んだものが、途中で止まってしまう理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'normal',
        frame: 'whole',
        focus: ['wave', 'sphincter'],
        certainty: 'established',
        title: 'A swallow is carried, and then let through',
        titleJa: '嚥下は「運ばれて」「通される」',
        body: 'A squeeze travels down the tube behind what you swallowed, and the ring of muscle at the bottom lets go as it arrives. Both have to happen.',
        bodyJa: '飲み込んだものの後ろを、収縮が管を下って進みます。それが届くのに合わせて、下端の筋肉の輪が緩みます。両方が要ります。',
        look: 'Watch the narrowing travel from the top all the way down, and the ring open as it gets there.',
        lookJa: '狭まりが上から下まで進むのと、そこに届いたときに輪が開くのを見てください。',
      },
      {
        progress: 0.35,
        stage: 'aperistaltic',
        // Nothing is retained yet, and that is the content of this step: the
        // wave has already stopped travelling the whole way and swallows still
        // get through.
        frame: 'whole',
        focus: ['wave'],
        certainty: 'established',
        title: 'First the squeeze stops travelling',
        titleJa: 'まず、収縮が最後まで届かなくなります',
        body: 'A failing squeeze does not push more gently. It stops partway down, so nothing arrives at the bottom behind what you swallowed — and for a while, swallows still get through anyway.',
        bodyJa: '弱った収縮は「やさしく押す」のではありません。途中で止まってしまい、飲み込んだものの後ろから何も届かなくなります。それでもしばらくは、嚥下は通過できます。',
        look: 'Watch how far down the narrowing gets before it fades. It is no longer reaching the bottom.',
        lookJa: '狭まりがどこまで下りてから消えるかを見てください。もう下端には届いていません。',
      },
      {
        progress: 0.5,
        stage: 'retaining',
        frame: 'ring',
        focus: ['retained', 'sphincter'],
        certainty: 'established',
        title: 'Then the ring stops letting go, and something collects',
        titleJa: '次に輪が緩まなくなり、たまり始めます',
        body: 'With the ring staying tight, swallows stop getting through — so what was swallowed stands in the tube. And what stands there presses down on the ring with its own weight.',
        bodyJa: '輪が締まったままになると、嚥下は通過しなくなり、飲み込んだものが管の中に立ったまま残ります。そして、そこに溜まったものが、自らの重みで輪を押します。',
        look: 'The tube below has widened and is holding a column. Watch its top, not the bottom — that is what is new.',
        lookJa: '下側の管が広がり、内容物を抱えています。下端ではなく、その上端を見てください。それが新しく起きたことです。',
      },
      {
        progress: 0.65,
        stage: 'balanced',
        frame: 'ring',
        focus: ['retained', 'sphincter'],
        certainty: 'established',
        title: 'What collected starts doing the pushing',
        titleJa: 'たまったものが、押す役を引き継ぎます',
        body: 'The taller the column, the harder it presses. It stops growing when its own weight is enough to get each swallow through — so swallowing works again, from a tube that is now holding a lot.',
        bodyJa: '液柱が高いほど、押す力は強くなります。1 回ぶんの嚥下を通せるだけの重みになったところで、増えるのは止まります。つまり嚥下はまた通るようになります——大量に抱えた管から、ですが。',
        look: 'Swallows are getting through again. Notice what it took: the column is most of the way up the tube.',
        lookJa: '嚥下はまた通っています。ただし、その代償を見てください。液柱は管のかなりの高さまで来ています。',
      },
      {
        progress: 1,
        stage: 'failed',
        frame: 'ring',
        focus: ['retained', 'sphincter'],
        certainty: 'established',
        title: 'Past a point, there is not enough height to be had',
        titleJa: 'ある点を越えると、必要な高さが足りません',
        body: 'A column can only be as tall as the tube it stands in, and that is worth less pressure than the ring holds. Past a point, nothing the tube can collect is enough.',
        bodyJa: '液柱は、立っている管の高さまでしかなれません。その高さぶんの圧は、輪が締めている力に届きません。ある点を越えると、どれだけ溜めても足りなくなります。',
        look: 'The tube is full to the top and nothing is getting through. It cannot press any harder than this.',
        lookJa: '管は上まで満ちていますが、何も通っていません。これ以上強く押すことはできません。',
      },
      {
        progress: 1,
        stage: 'failed',
        // The model has a ring and a wave and no reason for either.
        frame: 'ring',
        focus: ['retained', 'sphincter'],
        certainty: 'established',
        educationalOnly: true,
        title: 'Why the muscle stops working is not on this screen',
        titleJa: 'なぜ筋肉がそうなるのかは、この画面にありません',
        body: 'Something has to go wrong with the nerve supply for both of these to fail together. What that is, and why, is a separate question this picture does not contain.',
        bodyJa: 'この 2 つが同時に起きるには、神経の側に何かが起きている必要があります。それが何で、なぜなのかは別の問題で、この絵には含まれていません。',
        look: 'There are no nerves in this picture. What is drawn is a squeeze, a ring, and what is left in between.',
        lookJa: 'この絵に神経は描かれていません。描かれているのは収縮と輪、そのあいだに残ったものだけです。',
      },
      {
        progress: 1,
        stage: 'failed',
        frame: 'ring',
        focus: ['retained', 'sphincter'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What people notice, and how slowly',
        titleJa: '気づくこと、その現れ方の遅さ',
        body: 'Food feeling as though it stops, bringing things back up, and discomfort behind the breastbone are described, often over a long time. How much differs greatly.',
        bodyJa: '食べ物がつかえる感じ、戻してしまうこと、胸骨の裏の不快感が語られます。長い時間をかけて現れることが多く、程度は人によって大きく違います。',
        look: 'Nothing new is drawn for this step. The screen shows a tube, not a person, and it has no days in it.',
        lookJa: 'この段階で新しく描かれるものはありません。画面にあるのは管であって人ではなく、日数もありません。',
      },
    ]),
  }),

  /**
   * Benign prostatic enlargement.
   *
   * The walk exists for one correction: this is not a gland that gets
   * uniformly bigger. So the first three steps are all about *which part*, and
   * the channel only appears once the reader has seen that the middle is what
   * grew and the outside is what was pushed.
   *
   * Everything a person would actually notice is at the end, marked, and says
   * on screen that the picture has no urine in it.
   */
  'benign-prostatic-enlargement': Object.freeze({
    title: 'Which part of the prostate is getting bigger',
    titleJa: '前立腺の、どの部分が大きくなるのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'normal',
        frame: 'gland',
        focus: ['peripheral', 'transition'],
        certainty: 'established',
        title: 'Most of the gland is on the outside',
        titleJa: '腺の大部分は外側にあります',
        body: 'The prostate is not one block of tissue. Most of it lies on the outside. A much smaller part sits in the middle, wrapped around the channel that runs through it.',
        bodyJa: '前立腺は、ひとつの塊ではありません。大部分は外側にあります。ずっと小さな部分が中央にあり、そこを通る通り道を取り巻いています。',
        look: 'Two colours. The large one on the outside, and the small one in the middle against the channel.',
        lookJa: '色は 2 つです。外側の大きな部分と、通り道に接した中央の小さな部分です。',
      },
      {
        progress: 0.45,
        stage: 'inner-gland',
        frame: 'gland',
        focus: ['transition'],
        certainty: 'established',
        title: 'The small middle part is what grows',
        titleJa: '大きくなるのは中央の小さな部分です',
        body: 'Enlargement starts in that small middle part, and only there. The large outer part is not growing — which is why the gland as a whole changes far less than its middle does.',
        bodyJa: '大きくなるのは中央の小さな部分だけで、外側の大きな部分は大きくなりません。だから腺全体の変化は、中央の変化よりずっと小さくとどまります。',
        look: 'Watch the middle, not the outline. The middle is several times what it was; the outline has barely moved.',
        lookJa: '輪郭ではなく中央を見てください。中央は数倍になり、輪郭はほとんど動いていません。',
      },
      {
        progress: 0.45,
        stage: 'inner-gland',
        frame: 'gland',
        focus: ['peripheral'],
        certainty: 'established',
        title: 'The outside is pushed outward, not used up',
        titleJa: '外側は押しやられます。減るのではありません',
        body: 'The large outer part gets thinner on screen. Nothing has been taken out of it: it is being pressed outward from the inside, into a thin shell around what grew.',
        bodyJa: '外側の大きな部分は、画面上で薄くなります。何かが失われたのではありません。内側から押され、大きくなった部分を包む薄い層になっています。',
        look: 'Follow the outer colour. It becomes a shell around the middle, and it stays the same amount of tissue.',
        lookJa: '外側の色を追ってください。中央を包む層になりますが、組織の量は変わりません。',
      },
      {
        progress: 1,
        stage: 'rim',
        frame: 'channel',
        focus: ['urethra'],
        certainty: 'established',
        title: 'The channel runs through the part that grew',
        titleJa: '通り道は、大きくなった部分の中を通ります',
        body: 'The channel out of the bladder passes straight through the middle part. When that part grows around it, the channel is narrowed along its whole length inside the gland.',
        bodyJa: '膀胱から出る通り道は、その中央の部分を貫いています。そこが周りで大きくなると、腺の中を通る区間の全長にわたって狭くなります。',
        look: 'The channel has changed colour where it is narrowed. That is the whole stretch inside the gland.',
        lookJa: '狭くなった区間は色が変わっています。腺の中を通る全長です。',
      },
      {
        progress: 1,
        stage: 'rim',
        frame: 'channel',
        focus: ['bladderNeck'],
        // The one step that moves the model: the same growth, arranged
        // differently. It is a shape and not a severity, which is exactly why
        // it is a control rather than a position on the axis.
        controls: { medianLobeShare: 1 },
        certainty: 'established',
        title: 'The same amount, in a different place, does something else',
        titleJa: '同じ量でも、場所が違えば起きることも違います',
        body: 'The growth does not always sit the same way. Arranged as a lobe pushing up at the exit from the bladder, the same amount leaves the length alone and narrows the exit instead.',
        bodyJa: '大きくなる場所は一通りではありません。膀胱の出口へ突き出す形になると、同じ量でも腺の中の全長は狭まらず、代わりに出口が狭くなります。',
        look: 'The narrowing has moved to the top, where the channel leaves the bladder. The stretch below it has opened.',
        lookJa: '狭窄が上端——膀胱から通り道が出るところ——へ移り、その下の区間は開いています。',
      },
      {
        progress: 1,
        stage: 'rim',
        frame: 'channel',
        educationalOnly: true,
        certainty: 'associated',
        title: 'What people notice, and why size alone does not settle it',
        titleJa: '気づくことと、大きさだけでは決まらないこと',
        body: 'A weaker stream, going more often, and getting up at night are described. How much someone notices is not set by how large the gland is; the two are not a simple pair.',
        bodyJa: '勢いが弱い、回数が増える、夜に起きる、といったことが語られます。どれだけ気づくかは腺の大きさだけでは決まらず、単純な比例関係ではありません。',
        look: 'Nothing new is drawn for this step. There is no urine anywhere in this picture, and no person in it.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵に尿はなく、人もいません。',
      },
      {
        progress: 1,
        stage: 'rim',
        frame: 'channel',
        educationalOnly: true,
        certainty: 'established',
        title: 'What this picture does not contain',
        titleJa: 'この絵に含まれていないもの',
        body: 'This is a shape and only a shape. Nothing flows through it, so no figure on the screen is a size, a speed or an amount that was measured in anybody.',
        bodyJa: 'ここにあるのは形だけです。何も流れていないので、画面の値は誰かの体で測った大きさ・速さ・量ではありません。',
        look: 'The numbers are ratios of this drawing against itself, and nothing else.',
        lookJa: '画面の数値は、この絵の中での比です。大きさや速さを表すものではありません。',
      },
    ]),
  }),

  /**
   * Bowel obstruction.
   *
   * The walk exists for one distinction: this is not a scale. Three steps
   * establish what a blockage does at all, and then the site *moves* — twice —
   * so that the reader sees two obstructions rather than two amounts of one.
   *
   * The last two steps are marked, and say on screen that there is no person in
   * the picture and no time in the model.
   */
  'bowel-obstruction': Object.freeze({
    title: 'What a blockage does, and what the place of it changes',
    titleJa: '腸が塞がると何が起きるのか、そして場所で何が変わるのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'patent',
        frame: 'whole',
        focus: ['smallBowel', 'colon'],
        certainty: 'established',
        title: 'The gut is one path, end to end',
        titleJa: '腸は端から端まで続く 1 本の道です',
        body: 'Everything that goes in at the top travels the same single path to the bottom. There is no way round any part of it.',
        bodyJa: '上から入ったものは、同じ 1 本の道を通って下まで進みます。途中のどこかを迂回する道はありません。',
        look: 'Follow it once: the coiled small bowel first, then the wider frame around it, which is the colon.',
        lookJa: 'ひと通り目で追ってください。まず渦を巻いた小腸、次にその周りの太い枠が結腸です。',
      },
      {
        progress: 0.5,
        stage: 'partial',
        frame: 'whole',
        focus: ['transition'],
        certainty: 'established',
        title: 'Something in the way, and part of it still gets past',
        titleJa: '塞がっていても、一部はまだ通ります',
        body: 'Where the path is narrowed rather than shut, some of what arrives still crosses. Less collects above it, and the far side is not empty yet.',
        bodyJa: '道が塞がりきらず狭くなっているだけなら、届いたものの一部はまだ通過します。上流に溜まる量は少なく、向こう側もまだ空ではありません。',
        look: 'The ring marks the place. The two sides of it already look different, but only a little.',
        lookJa: '輪が場所を示しています。その両側はすでに違って見えますが、その差はまだわずかです。',
      },
      {
        progress: 1,
        stage: 'complete',
        frame: 'whole',
        focus: ['transition'],
        certainty: 'established',
        title: 'Nothing crosses it, and the two sides part company',
        titleJa: '何も通らなくなり、両側が別の姿になります',
        body: 'Above it, what keeps arriving has nowhere to go, so it collects and the bowel widens. Below it nothing arrives at all, and it empties.',
        bodyJa: '上流では、届き続けるものの行き場がなくなり、溜まって腸が太くなります。下流には何も届かず、空になります。',
        look: 'One side is wide and warm, the other is drained of colour. The ring is where it changes.',
        lookJa: '片側は太く色が濃く、反対側は色が抜けています。切り替わるのが輪の位置です。',
      },
      {
        progress: 1,
        stage: 'complete',
        frame: 'small-bowel',
        focus: ['smallBowel'],
        // The site moves, and that is the point of the step: this is a second
        // obstruction, not more of the first.
        controls: { site: 'proximal-small-bowel' },
        certainty: 'established',
        title: 'High up: a short length takes all of it',
        titleJa: '上のほうで塞がると、短い区間がすべてを受けます',
        body: 'Near the top there is very little bowel above the blockage. The same amount arriving goes into that little, so it widens the furthest — and nearly all of the gut below is empty.',
        bodyJa: '上のほうでは、閉塞より上流の腸はごくわずかです。届く量は同じなので、その短い区間が最も大きく広がり、下流のほとんどは空になります。',
        look: 'Only a short stretch is wide. Look at how much of the rest has gone pale.',
        lookJa: '太くなっているのは短い区間だけです。残りのどれだけが淡くなったかを見てください。',
      },
      {
        progress: 1,
        stage: 'complete',
        frame: 'colon',
        focus: ['colon'],
        controls: { site: 'distal-colon' },
        certainty: 'established',
        title: 'Far down: much more bowel is above it, and each part less',
        titleJa: '下のほうなら上流は長く、1 区間あたりは小さく',
        body: 'Move it to the far end and almost the whole gut is above it. The same amount spread over that much length widens each part of it far less.',
        bodyJa: '下の端へ移すと、ほぼ腸全体が上流になります。同じ量がその長さに分かれるため、1 区間あたりの広がりはずっと小さくなります。',
        look: 'Nearly all of it is wide now, and none of it is as wide as the short stretch was.',
        lookJa: '今度はほぼ全体が太くなりますが、どこもさきほどの短い区間ほどは太くありません。',
      },
      {
        progress: 1,
        stage: 'complete',
        frame: 'caecum',
        focus: ['caecum', 'tension'],
        certainty: 'established',
        title: 'The wall that carries the most is at neither end',
        titleJa: '壁の負担が最大なのは、どちらの端でもありません',
        body: 'A wider tube at the same pressure pulls harder on its own wall. So the part under the most strain is the widest part above the blockage — here, the first part of the colon.',
        bodyJa: '同じ圧なら、太い管ほど自らの壁を強く引きます。最も負担が大きいのは閉塞部ではなく、上流で最も太い部分——ここでは結腸の最初の部分です。',
        look: 'The lit stretch is the widest one above the blockage, not the one next to it.',
        lookJa: '光っているのは、閉塞の隣ではなく、上流で最も太い区間です。',
      },
      {
        progress: 1,
        stage: 'complete',
        frame: 'caecum',
        focus: ['valve'],
        controls: { valveCompetence: 0 },
        certainty: 'established',
        title: 'A one-way join above it changes how much is behind',
        titleJa: '上流の一方通行の継ぎ目が、上流の量を変えます',
        body: 'Where the small bowel meets the colon there is a one-way join. If it holds, the colon alone takes it; if it gives way, the small bowel shares it and the colon widens less.',
        bodyJa: '小腸と結腸の継ぎ目は一方通行です。保たれていれば結腸だけが受け止め、緩めば小腸も分け合うので、結腸の広がりは小さくなります。',
        look: 'Watch the coil. It was at its resting width; now it is sharing, and the colon has narrowed.',
        lookJa: '渦の部分を見てください。さきほどは安静時の太さでしたが、いま分け合い、結腸は細くなりました。',
      },
      {
        progress: 1,
        stage: 'complete',
        frame: 'whole',
        educationalOnly: true,
        certainty: 'associated',
        title: 'What people notice, and why it depends on where',
        titleJa: '気づくこと、そしてそれが場所によって違う理由',
        body: 'Feeling sick, being unable to keep things down, a swollen belly and nothing passing are described. Which of them comes first is said to depend on how high up it is.',
        bodyJa: '吐き気、戻してしまうこと、お腹が張ること、何も出なくなること、などが語られます。どれが先に現れるかは、閉塞の高さによると言われます。',
        look: 'Nothing new is drawn for this step. There is no person in this picture and nothing in it is a symptom.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵に人はおらず、症状も描かれていません。',
      },
      {
        progress: 1,
        stage: 'complete',
        frame: 'whole',
        educationalOnly: true,
        certainty: 'established',
        title: 'What this picture does not contain',
        titleJa: 'この絵に含まれていないもの',
        body: 'There is no time in it. The slider is how completely the path is shut, not how long it has been shut, and nothing here says what happens next.',
        bodyJa: 'ここに時間はありません。スライダーは「どれだけ塞がっているか」であって経過時間ではなく、この先どうなるかも示していません。',
        look: 'The numbers are ratios of this drawing against itself. None of them is a width, a pressure or a risk.',
        lookJa: '画面の数値は、この絵の中での比です。太さも圧も危険度も表すものではありません。',
      },
    ]),
  }),

  /**
   * Uterine fibroid.
   *
   * The walk exists to take one number away from the reader. Three steps
   * establish what a lump in the middle of a wall does, and then the *location*
   * moves twice at the same size — so the volume stays on screen, unchanged,
   * beside two entirely different pictures.
   */
  'uterine-fibroid': Object.freeze({
    title: 'Where in the wall it sits, and what that changes',
    titleJa: '壁のどこにあるかが、何を変えるのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'small',
        frame: 'whole',
        focus: ['wall', 'fibroid'],
        certainty: 'established',
        title: 'A lump growing inside the wall of the uterus',
        titleJa: '子宮の壁の中で育つ塊',
        body: 'A fibroid is muscle growing inside the wall itself, not in the space inside. How deep in that wall it sits is what this screen is about.',
        bodyJa: '筋腫は、内側の空間ではなく壁そのものの中で育つ筋肉です。この画面の主題は、その壁のどの深さにあるかです。',
        look: 'Seen from the side, so the thickness of the wall runs left to right. The pale ball is the fibroid.',
        lookJa: '横から見ています。壁の厚みが左右方向になります。淡い球が筋腫です。',
      },
      {
        progress: 0.6,
        stage: 'reaching',
        frame: 'wall',
        focus: ['fibroid', 'cavity'],
        certainty: 'established',
        title: 'In the middle, it reaches nothing until it reaches both',
        titleJa: '中央にあると、届かないか、両側に届くか',
        body: 'A lump in the middle of the wall touches neither side while it is small. Grown to about the depth of the wall, it reaches the inner space and the outer surface together.',
        bodyJa: '壁の中央にある塊は、小さいうちはどちらにも触れません。壁の厚みほどになると、内側の空間と外表面へ同時に届きます。',
        look: 'It has just crossed both boundaries. The inner surface has changed colour where it is pressed.',
        lookJa: 'いま両側の境界を越えたところです。押されている内側の面は色が変わっています。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'wall',
        focus: ['fibroid'],
        certainty: 'established',
        title: 'How large the uterus is does not say what it is against',
        titleJa: '子宮の大きさは、何に接しているかを語りません',
        body: 'The lump adds the same amount to the uterus wherever it sits. So the size of the uterus is the same in all three pictures, and it is the picture that differs.',
        bodyJa: '塊がどこにあっても、子宮に加わる量は同じです。3 通りのどれでも子宮の大きさは同じで、違うのは絵のほうです。',
        look: 'Note the first number. It will not change in the next two steps.',
        lookJa: '最初の数値に注目してください。次の 2 段階でも変わりません。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'cavity',
        focus: ['cavity'],
        // The location moves, at the same size: a second fibroid, not more of
        // the first.
        controls: { location: 'submucosal' },
        certainty: 'established',
        title: 'Just under the inner space: it presses into it',
        titleJa: '内側のすぐ下にあると、そこを押し込みます',
        body: 'Moved to just under the inner surface, the same lump presses into the space inside from its smallest size upward, and never reaches the outside at all.',
        bodyJa: '同じ塊を内側の面のすぐ下へ移すと、小さいうちからその空間を押し込み、外側にはまったく届きません。',
        look: 'The inner surface is now taken up by it. The outline of the organ has not moved.',
        lookJa: '内側の面は大きく占められています。臓器の輪郭は動いていません。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'whole',
        focus: ['serosa'],
        controls: { location: 'subserosal' },
        certainty: 'established',
        title: 'Just under the outside: it pushes the outline out',
        titleJa: '外側のすぐ下にあると、外形を押し出します',
        body: 'Moved to just under the outer surface, the same lump stands out past it and is next to whatever the uterus is next to — and the inner space is untouched.',
        bodyJa: '同じ塊を外表面のすぐ下へ移すと、そこから外へ出て、子宮の隣にあるものに接します。内側の空間には触れません。',
        look: 'The inner surface is back to its own colour, and the ball now stands outside the organ.',
        lookJa: '内側の面は元の色に戻り、球は臓器の外へ出ています。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'whole',
        educationalOnly: true,
        certainty: 'associated',
        title: 'What people notice, and why size alone does not settle it',
        titleJa: '気づくこと、大きさだけでは決まらない理由',
        body: 'Heavier or longer periods, a feeling of pressure, and difficulty becoming pregnant are described. Which of them, and whether any, is not settled by how big it is.',
        bodyJa: '経血が多い・長い、圧迫される感じ、妊娠しにくいこと、などが語られます。どれが起きるか、起きるかどうかは、大きさだけでは決まりません。',
        look: 'Nothing new is drawn for this step. There is no person in this picture and nothing in it is a symptom.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵に人はおらず、症状も描かれていません。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'whole',
        educationalOnly: true,
        certainty: 'established',
        title: 'What this picture does not contain',
        titleJa: 'この絵に含まれていないもの',
        body: 'One lump, in a uterus that keeps its own shape around it. There is no time in it, and most people who have these have more than one.',
        bodyJa: 'ここにあるのは 1 つの塊と、その周りで形を保ったままの子宮です。時間はなく、実際には複数あることのほうが多いものです。',
        look: 'The numbers are ratios of this drawing against itself. None of them is a length or a volume.',
        lookJa: '画面の数値は、この絵の中での比です。長さでも体積でもありません。',
      },
    ]),
  }),

  /**
   * Multinodular goitre.
   *
   * Three steps establish that a goitre in the neck *moves* the airway, and
   * then the direction changes twice at the same size — once into the one
   * place with a boundary that will not move, and once backwards past the
   * structures on the gland's own back.
   *
   * The last step is the one the scene exists to make: a shape does not tell
   * you how the gland is working, and it is marked because nothing in the model
   * produces it.
   */
  'multinodular-goitre': Object.freeze({
    title: 'Which way it grew, and what that decides',
    titleJa: 'どちらへ大きくなったかが、何を決めるのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'nodular',
        frame: 'neck',
        focus: ['gland', 'trachea'],
        certainty: 'established',
        title: 'The gland is wrapped round the airway',
        titleJa: '甲状腺は気道を取り巻いています',
        body: 'The thyroid sits across the front and sides of the windpipe, with the two halves joined in front of it. Anything it grows into, it grows into from there.',
        bodyJa: '甲状腺は気管の前面と側面にまたがり、左右が前で繋がっています。大きくなるときは、必ずそこから広がります。',
        look: 'The grey tube in the middle is the airway. The gland is the darker tissue on either side of it.',
        lookJa: '中央の灰色の管が気道です。腺はその両側にある濃い色の組織です。',
      },
      {
        progress: 0.55,
        stage: 'grown',
        frame: 'airway',
        focus: ['trachea'],
        certainty: 'established',
        title: 'In the neck, it pushes the airway across',
        titleJa: '頸部では、気道を横へ押しやります',
        body: 'Everything around the gland in the neck will give way, so the airway moves rather than being squeezed. It ends up off to one side, and it is still as wide as it was.',
        bodyJa: '頸部で腺の周りにあるものはすべて動くため、気道は締めつけられるのではなく移動します。片側に寄りますが、太さは変わりません。',
        look: 'The airway has bent away from the larger side. Watch its width, not its position: it has not changed.',
        lookJa: '気道は大きいほうと反対側へ曲がっています。位置ではなく太さを見てください。変わっていません。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'airway',
        focus: ['trachea'],
        certainty: 'established',
        title: 'Larger still, and still only moved',
        titleJa: 'さらに大きくなっても、動かされるだけ',
        body: 'Twice as much tissue pushes it twice as far and does nothing else to it. Where there is somewhere to go, that is what happens.',
        bodyJa: '組織が 2 倍になれば 2 倍押しやりますが、それ以外のことは起きません。逃げ場がある限り、起きるのはそれだけです。',
        look: 'It is well off the midline now. The width across it is unchanged.',
        lookJa: '正中からかなり外れています。幅は変わっていません。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'inlet',
        focus: ['inlet', 'trachea'],
        // The direction changes at the same size: the one place with a boundary
        // that will not move.
        controls: { direction: 'retrosternal' },
        certainty: 'established',
        title: 'Down behind the breastbone, there is nowhere to go',
        titleJa: '胸骨の裏では、逃げ場がありません',
        body: 'The way into the chest is a ring of bone. A gland that has followed the airway down into it cannot push anything aside, so the same amount of tissue makes the airway narrower instead.',
        bodyJa: '胸へ入る口は骨の輪です。気道に沿ってそこまで下がった腺は何も押しのけられないため、同じ量の組織が代わりに気道を細くします。',
        look: 'The pale ring is that boundary. The airway has changed colour where it passes through it.',
        lookJa: '淡い色の輪がその境界です。そこを通る部分で気道の色が変わっています。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'behind',
        focus: ['nerve', 'parathyroid'],
        controls: { direction: 'posterior' },
        certainty: 'established',
        title: 'Backwards, the gland goes past what lies behind it',
        titleJa: '後方へ広がると、後ろのものを追い越します',
        body: 'A nerve to the voice box runs in the groove behind the gland, and four small glands sit on its back. An enlargement that goes backwards passes them rather than approaching them.',
        bodyJa: '声帯へ向かう神経が腺の後ろの溝を走り、4 つの小さな腺が背面にあります。後方への腫大は、それらに近づくのではなく追い越します。',
        look: 'Seen from behind. The lit structures are where they always were; the gland has come past them.',
        lookJa: '後方から見ています。光っているものは元からその位置にあり、腺のほうが追い越しました。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'neck',
        educationalOnly: true,
        certainty: 'associated',
        title: 'What people notice, and when',
        titleJa: '気づくこと、そしてその時期',
        body: 'A swelling in the neck, a sense of something in the throat, and a change in the voice are described. Many are noticed by someone else first, or not at all.',
        bodyJa: '首の腫れ、のどに何かある感じ、声の変化などが語られます。他の人に先に気づかれることも、まったく気づかれないことも多いものです。',
        look: 'Nothing new is drawn for this step. There is no person in this picture and no air moving through it.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵に人はおらず、空気も流れていません。',
      },
      {
        progress: 1,
        stage: 'large',
        frame: 'neck',
        educationalOnly: true,
        certainty: 'established',
        title: 'The shape does not tell you how the gland is working',
        titleJa: '形からは、腺の働きは分かりません',
        body: 'A gland this shape may be working normally, too much, or too little. None of that is in this picture, and none of it can be read off a shape.',
        bodyJa: 'この形の腺でも、働きは正常のことも、過剰なことも、不足していることもあります。そのどれもこの絵にはなく、形からは読み取れません。',
        look: 'Nothing about how the gland works is drawn anywhere on this screen.',
        lookJa: '腺の働きに関わるものは、この画面のどこにも描かれていません。',
      },
    ]),
  }),

  /**
   * Knee osteoarthritis.
   *
   * The walk is a correction. Three steps take one compartment down to nothing
   * while the other keeps its layer, and the fourth turns the reader to look at
   * that other side — because "the cartilage wore out" is a sentence about a
   * joint, and this is not one.
   *
   * The fifth spreads the same loss evenly, at the same position on the axis,
   * so that confined and even are seen as two pictures rather than two amounts.
   */
  'knee-osteoarthritis': Object.freeze({
    title: 'Which part of the knee lost its layer',
    titleJa: '膝のどの部分が、層を失ったのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'intact',
        frame: 'knee',
        focus: ['cartilage', 'meniscus'],
        certainty: 'established',
        title: 'Nothing in a working knee is bone against bone',
        titleJa: '働いている膝に、骨と骨が当たる場所はありません',
        body: 'Each bone end is covered by a smooth layer, and on each side a wedge sits between them. The two bones never touch each other.',
        bodyJa: 'それぞれの骨端はなめらかな層に覆われ、左右それぞれの側で、その間に楔が挟まっています。2 つの骨が触れ合うことはありません。',
        look: 'The pale blue films over the bone ends are that layer. The cream wedges beside them are the two menisci.',
        lookJa: '骨端を覆う淡い青色の膜がその層です。その脇にあるクリーム色の楔が 2 つの半月板です。',
      },
      {
        progress: 0.55,
        stage: 'thinning',
        frame: 'joint-line',
        focus: ['cartilage'],
        certainty: 'established',
        title: 'One side is losing it, and the other is not',
        titleJa: '片側だけが失われ、もう片側は残ります',
        body: 'The layer goes from one half of the joint. As those two surfaces come together, the wedge between them has one way to go, and it is squeezed outward.',
        bodyJa: '関節の片側の半分から層が失われていきます。その 2 つの面が近づくと、間の楔には行き場が 1 つしかなく、外へ押し出されます。',
        look: 'Follow the colour on that side. The wedge beside it has already begun to move out of the joint.',
        lookJa: 'その側の色を追ってください。脇の楔はすでに関節の外へ動き始めています。',
      },
      {
        progress: 1,
        stage: 'gone',
        frame: 'joint-line',
        focus: ['cartilage', 'osteophyte'],
        certainty: 'established',
        title: 'On that side the two surfaces now meet',
        titleJa: 'その側では、2 つの面が接します',
        body: 'With nothing left between them the bones are drawn touching, and new bone has grown at the rim of that half of the joint.',
        bodyJa: '間に何も残っていないため、骨は接して描かれます。そして関節のその半分の辺縁に、新しい骨ができています。',
        look: 'The pale swelling at the edge is that new bone. It is at that rim, and only that one.',
        lookJa: '縁にある淡い膨らみがその新生骨です。その辺縁だけにあります。',
      },
      {
        progress: 1,
        stage: 'gone',
        frame: 'both',
        focus: ['other'],
        certainty: 'established',
        title: 'The other half of the same joint still has its own',
        titleJa: '同じ関節のもう半分は、まだ保たれています',
        body: 'This is what "worn out" misses. It is not the knee that has lost its layer; it is one compartment of it, and the other is as it was.',
        bodyJa: '「すり減った」という言い方では、ここが抜け落ちます。層を失ったのは膝ではなく、その片方の区画であって、もう一方は元のままです。',
        look: 'Look across to the other side. The film is intact, the wedge has not moved, and the rim is smooth.',
        lookJa: '反対側を見てください。膜は保たれ、楔も動いておらず、縁もなめらかです。',
      },
      {
        progress: 1,
        stage: 'gone',
        frame: 'both',
        focus: ['other'],
        // The same amount lost, spread evenly: a different picture rather than
        // a worse one.
        controls: { confinement: 0 },
        certainty: 'established',
        title: 'Spread evenly, the same amount is a different picture',
        titleJa: '同じ量でも、均等なら別の像になります',
        body: 'Take the same loss and share it between both halves. Nothing about the amount has changed, and yet there is no longer a side to point at.',
        bodyJa: '同じだけの消失を両側で分け合わせてみます。量は何も変わっていませんが、もう「こちら側」と指せる場所はありません。',
        look: 'Both films have gone and both rims have swollen. Compare it with the step before, not with the first one.',
        lookJa: '両方の膜が失われ、両方の縁が膨らんでいます。最初の段階ではなく、1 つ前と見比べてください。',
      },
      {
        progress: 1,
        stage: 'gone',
        frame: 'knee',
        educationalOnly: true,
        certainty: 'associated',
        title: 'What people notice, and how loosely it follows the picture',
        titleJa: '気づくこと、そして絵との結びつきの緩さ',
        body: 'Pain with use, stiffness after sitting, and a knee that feels different are described. How much of any of it there is does not follow closely from how much layer is left.',
        bodyJa: '動かしたときの痛み、座ったあとのこわばり、膝の感じが変わることなどが語られます。その程度は、残っている層の量から近く決まるわけではありません。',
        look: 'Nothing new is drawn for this step. There is no person in this picture and no weight on this knee.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵に人はおらず、この膝に体重もかかっていません。',
      },
      {
        progress: 1,
        stage: 'gone',
        frame: 'knee',
        educationalOnly: true,
        certainty: 'established',
        title: 'What this picture does not contain',
        titleJa: 'この絵に含まれていないもの',
        body: 'No weight, no walking and no time. The slider is how much is gone, not how long it took, and nothing here shows why it went from one side.',
        bodyJa: '体重も歩行も時間もありません。スライダーは「どれだけ失われたか」であって経過時間ではなく、なぜ片側から失われたのかも示していません。',
        look: 'The numbers are shares of the layer this drawing started with, and nothing else.',
        lookJa: '画面の数値は、この絵が最初に持っていた層に対する割合であって、それ以外ではありません。',
      },
    ]),
  }),

  /**
   * ACL injury.
   *
   * The walk turns on one sentence: a torn ligament is a state of the same
   * structure, not an intact one somewhere else. So the first three steps are
   * the ligament itself — whole, thinned, in two pieces — and the fourth asks
   * the reader to look at what is holding the bone instead.
   */
  'acl-injury': Object.freeze({
    title: 'What was holding the bone, and what is holding it now',
    titleJa: '何が骨を支えていたのか、そしていま支えているもの',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'intact',
        frame: 'knee',
        focus: ['acl', 'tibia'],
        certainty: 'established',
        title: 'The cord that stops the lower bone sliding forward',
        titleJa: '下の骨が前へ滑るのを止めている索',
        body: 'It runs from the back of the upper bone down to the front of the lower one. When the lower bone tries to go forward, this is what is in the way.',
        bodyJa: '上の骨の後ろから、下の骨の前へ向かって走っています。下の骨が前へ出ようとするとき、行く手をふさいでいるのがこれです。',
        look: 'The pale cord crossing the middle of the joint. Note where each end is fixed.',
        lookJa: '関節の中央を斜めに横切る淡い色の索です。両端がどこに付いているかを見てください。',
      },
      {
        progress: 0.5,
        stage: 'stretched',
        frame: 'notch',
        focus: ['acl'],
        certainty: 'established',
        title: 'Stretched and thinner, and holding less',
        titleJa: '伸びて細くなり、支える力が落ちます',
        body: 'It is still one piece, and it is not where it was moved to — it is the same cord in a different condition. Part of what it was holding is already gone.',
        bodyJa: 'まだ 1 本につながっていますが、どこかへ移されたのではありません。同じ索が別の状態になっているのです。支えていた力の一部はすでに失われています。',
        look: 'Compare it with the step before: thinner, and sagging rather than taut.',
        lookJa: '1 つ前と見比べてください。細くなり、張っているのではなく、たわんでいます。',
      },
      {
        progress: 1,
        stage: 'torn',
        frame: 'notch',
        focus: ['acl', 'gap'],
        certainty: 'established',
        title: 'Two ends, and a gap between them',
        titleJa: '2 つの断端と、そのあいだの隙間',
        body: 'Once it is no longer one piece it carries none of what it carried. That does not happen gradually: a cord that has parted stops holding, and stops all at once.',
        bodyJa: '1 本につながらなくなると、それまで担っていたものを一切担わなくなります。それは徐々にではありません。切れた索は支えるのをやめ、しかも一度にやめます。',
        look: 'A stump at each end. Nothing crosses the middle of the joint any more.',
        lookJa: '両端に断端が残っています。もう関節の中央を横切るものはありません。',
      },
      {
        progress: 1,
        stage: 'torn',
        frame: 'side',
        focus: ['tibia'],
        certainty: 'established',
        title: 'So the lower bone sits further forward',
        titleJa: 'その結果、下の骨は前に出た位置に座ります',
        body: 'With less in the way it can rest further forward than it could. Seen from the side, the two bones are no longer stacked where they were.',
        bodyJa: '行く手をふさぐものが減れば、より前の位置まで出られます。横から見ると、2 つの骨の重なり方が元とは違っています。',
        look: 'From the side. Watch where the lower bone’s front edge is against the upper one.',
        lookJa: '横から見ています。下の骨の前縁が、上の骨に対してどこにあるかを見てください。',
      },
      {
        progress: 1,
        stage: 'torn',
        frame: 'knee',
        focus: ['secondary'],
        certainty: 'established',
        title: 'What is holding it now, and how much of it there is',
        titleJa: 'いま支えているものと、その量',
        body: 'The wedges and the capsule were always holding a small part of it. Now they are holding all of what is left — and what is left is a small part of what there was.',
        bodyJa: '楔と関節包は、もともとその一部を支えていました。いまは残っているものすべてを担っています。そしてその残りは、元の量のごく一部です。',
        look: 'The lit wedges are what the picture is resting on. Read the first number beside them.',
        lookJa: '光っている楔が、いまこの絵を支えているものです。その横の最初の数値を読んでください。',
      },
      {
        progress: 1,
        stage: 'torn',
        frame: 'knee',
        educationalOnly: true,
        certainty: 'associated',
        title: 'What people notice, and what is not on this screen',
        titleJa: '気づくこと、そしてこの画面にないもの',
        body: 'A knee that gives way turning, swelling soon after, and a feeling of not trusting it are described. None of it follows from anything drawn here.',
        bodyJa: '方向を変えたときに膝が崩れること、その後の腫れ、信頼できない感じ、などが語られます。どれもここに描かれたものから導かれるわけではありません。',
        look: 'Nothing new is drawn for this step. There is no person in this picture and nothing here is being tested.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵に人はおらず、ここで何かが検査されているのでもありません。',
      },
      {
        progress: 1,
        stage: 'torn',
        frame: 'knee',
        educationalOnly: true,
        certainty: 'established',
        title: 'Nobody is examining this knee',
        titleJa: 'この膝を誰も診察していません',
        body: 'The way a knee is checked by hand is a person pulling on it and judging what they feel. There is no hand here, no pull, and nothing on this screen is that.',
        bodyJa: '膝を手で調べる方法は、人が引いてみて、その手ごたえを判断するものです。ここに手はなく、引く力もなく、この画面のどれもそれではありません。',
        look: 'The distance shown is a share of this drawing. It is not a measurement of anyone’s knee.',
        lookJa: '表示されている距離は、この絵の中での割合です。誰かの膝を測ったものではありません。',
      },
    ]),
  }),

});

export const patientGuideFor = (sceneId) => PATIENT_GUIDES[sceneId] ?? null;
