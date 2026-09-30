/**
 * 「今、何が起きた？」 for the cardiac output model — one rule per input and
 * direction, each in a Medical and a Patient voice.
 *
 * Every sentence was written against the model's own output, not against the
 * textbook: each input was moved alone, one press and across its whole range,
 * and the directions of SV, CO and MAP read off the solve (the table is in
 * `tests/change-explanation.test.js`, which re-solves it). Two things follow:
 *
 * - **A result the copy names is a condition of the rule.** One press of
 *   resistance raises MAP 89 → 92 while the read-out still says 4.7 L/min, so
 *   the resistance rule says cardiac output "did not rise" — true at 4.7 and
 *   at 4.1 — rather than "fell", which would contradict the figure beside it.
 * - **Mechanism words only where the model has the mechanism.** Afterload and
 *   preload are this model's inputs; end-systolic volume is its output. The
 *   rate rules do not say *why* stroke volume falls with rate, because the
 *   model's reason (a closed circuit redistributing its volume) is not the one
 *   a reader would assume (filling time), and naming either would be a claim.
 *
 * The patient copy follows `docs/pathology-explanation-handoff.md` 「患者向けの
 * 文言」. It is shown only where the model offers patient explanation, which
 * requires a current medical review (`patientPurpose.js`); this model has none
 * yet, so the patient voice is written and tested but not on the released
 * product (F-237).
 *
 * Input ids are the model's (`CONTROL_IDS`); result keys are
 * `changeSignature`'s (`changeSummary.js`).
 */
export const CARDIAC_OUTPUT_EXPLANATIONS = Object.freeze([
  Object.freeze({
    id: 'resistance-up',
    when: {
      moved: { systemicResistanceMmHgSPerMl: 'up' },
      results: { map: 'up', sv: 'down', co: ['down', 'same'] },
    },
    medical: {
      en: 'Systemic vascular resistance rose and mean arterial pressure went up. But the higher afterload lowered stroke volume, and cardiac output did not rise: a higher pressure is not more flow.',
      ja: '体血管抵抗（SVR）が上がり、平均動脈圧は上昇しました。一方で後負荷が増えて1回拍出量が減り、心拍出量は増えていません。血圧が上がることと、流れる血液が増えることは同じではありません。',
    },
    patient: {
      en: 'The small blood vessels tightened and the blood pressure rose. But the heart now pushes against them, so it sends out less with each beat. Higher pressure is not the same as more blood reaching the body.',
      ja: '全身の細い血管が締まり、血圧は上がりました。ただ、心臓は締まった血管に向かって押し出すことになり、1回に送り出す血液は減っています。血圧が上がることと、全身に流れる血液が増えることは同じではありません。',
    },
  }),
  Object.freeze({
    id: 'resistance-down',
    when: {
      moved: { systemicResistanceMmHgSPerMl: 'down' },
      results: { map: 'down', co: ['up', 'same'] },
    },
    medical: {
      en: 'Systemic vascular resistance fell and mean arterial pressure went down. With less afterload the heart ejects more easily, and cardiac output did not fall: a lower pressure is not less flow.',
      ja: '体血管抵抗が下がり、平均動脈圧は低下しました。後負荷が減って心臓は送り出しやすくなり、心拍出量は減っていません。血圧が下がることと、流れる血液が減ることは同じではありません。',
    },
    patient: {
      en: 'The small blood vessels relaxed and the blood pressure fell. The heart pushes blood out more easily, and no less blood reaches the body.',
      ja: '細い血管がゆるみ、血圧は下がりました。心臓は血液を押し出しやすくなり、全身に流れる血液は減っていません。',
    },
  }),
  Object.freeze({
    id: 'contractility-down',
    when: {
      moved: { contractilityEesMmHgPerMl: 'down' },
      results: { esv: 'up', sv: 'down', map: 'down' },
    },
    medical: {
      en: 'Contractility fell, so more blood is left in the ventricle after each beat (end-systolic volume). Stroke volume fell, and mean arterial pressure with it.',
      ja: '収縮力が低下し、収縮後に心室に残る血液（収縮末期容積）が増えました。そのぶん1回拍出量が減り、平均動脈圧も低下しています。',
    },
    patient: {
      en: 'The heart muscle squeezes less strongly, so less blood leaves with each beat, and the blood pressure falls.',
      ja: '心臓の筋肉が縮む力が弱まり、1回の拍動で送り出せる血液が減りました。そのぶん血圧も下がっています。',
    },
  }),
  Object.freeze({
    id: 'contractility-up',
    when: {
      moved: { contractilityEesMmHgPerMl: 'up' },
      results: { esv: 'down', map: 'up', co: ['up', 'same'] },
    },
    medical: {
      en: 'Contractility rose, so less blood is left in the ventricle after each beat (end-systolic volume). Cardiac output did not fall, and mean arterial pressure rose.',
      ja: '収縮力が上がり、収縮後に心室に残る血液（収縮末期容積）が減りました。心拍出量は減らず、平均動脈圧は上昇しています。',
    },
    patient: {
      en: 'The heart muscle squeezes harder, so less blood is left behind after each beat. The blood pressure rises.',
      ja: '心臓の筋肉が縮む力が強まり、1回の拍動のあとに心臓に残る血液が減りました。血圧は上がっています。',
    },
  }),
  Object.freeze({
    id: 'filling-up',
    when: {
      moved: { fillingVolumeMl: 'up' },
      results: { edv: 'up', sv: 'up', map: 'up' },
    },
    medical: {
      en: 'Circulating filling rose, so the ventricle fills more in diastole (higher preload). Stroke volume rose, and mean arterial pressure with it.',
      ja: '循環する血液の充満が増え、心室は拡張期により多く満たされました（前負荷の増加）。1回拍出量が増え、平均動脈圧も上昇しています。',
    },
    patient: {
      en: 'More blood returns to the heart, so its chamber fills more. It sends out more with each beat, and the blood pressure rises.',
      ja: '心臓に戻ってくる血液が増え、心臓の部屋がより多く満たされました。1回に送り出す血液が増え、血圧も上がっています。',
    },
  }),
  Object.freeze({
    id: 'filling-down',
    when: {
      moved: { fillingVolumeMl: 'down' },
      results: { edv: 'down', sv: 'down', map: 'down' },
    },
    medical: {
      en: 'Circulating filling fell, so the ventricle fills less in diastole (lower preload). Stroke volume fell, and mean arterial pressure with it.',
      ja: '循環する血液の充満が減り、心室の拡張期の充満が減りました（前負荷の低下）。1回拍出量が減り、平均動脈圧も低下しています。',
    },
    patient: {
      en: 'Less blood returns to the heart, so its chamber fills less. It sends out less with each beat, and the blood pressure falls.',
      ja: '心臓に戻ってくる血液が減り、心臓の部屋が満たされにくくなりました。1回に送り出す血液が減り、血圧も下がっています。',
    },
  }),
  Object.freeze({
    id: 'rate-up',
    when: {
      moved: { heartRatePerMin: 'up' },
      results: { sv: 'down', co: 'up', map: 'up' },
    },
    medical: {
      en: 'Heart rate rose. Stroke volume fell, but with more beats a minute cardiac output rose, and mean arterial pressure with it.',
      ja: '心拍数が上がりました。1回拍出量は減りましたが、拍動の回数が増えたぶん心拍出量は増え、平均動脈圧も上昇しています。',
    },
    patient: {
      en: 'The heart beats faster. It sends out less each time, but with more beats, more blood reaches the body and the pressure rises.',
      ja: '心臓の拍動が速くなりました。1回に送り出す量は減りましたが、回数が増えたぶん、全身に流れる血液と血圧は上がっています。',
    },
  }),
  Object.freeze({
    id: 'rate-down',
    when: {
      moved: { heartRatePerMin: 'down' },
      results: { sv: 'up', co: 'down', map: 'down' },
    },
    medical: {
      en: 'Heart rate fell. Stroke volume rose, but with fewer beats a minute cardiac output fell, and mean arterial pressure with it.',
      ja: '心拍数が下がりました。1回拍出量は増えましたが、拍動の回数が減ったぶん心拍出量は減り、平均動脈圧も低下しています。',
    },
    patient: {
      en: 'The heart beats more slowly. It sends out more each time, but with fewer beats, less blood reaches the body and the pressure falls.',
      ja: '心臓の拍動がゆっくりになりました。1回に送り出す量は増えましたが、回数が減ったぶん、全身に流れる血液と血圧は下がっています。',
    },
  }),
]);

/** The component's own words (`ChangeExplanation.js`). */
export const CHANGE_EXPLANATION_COPY = Object.freeze({
  heading: Object.freeze({ en: 'What just happened?', ja: '今、何が起きた？' }),
});
