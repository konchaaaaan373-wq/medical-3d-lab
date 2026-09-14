/**
 * What the scene-failure page says, per reason.
 *
 * These sentences deliberately do **not** name where the buttons under them go.
 * They used to say "the public models" / "公開モデル一覧", which was a third
 * name for the Explorer sitting directly above a button that calls it something
 * else — the drift `app/shellDestinations.js` exists to stop. The buttons carry
 * their own names, so the prose only has to say that they are there.
 */
const GUIDANCE = Object.freeze({
  asset_error: Object.freeze({
    kickerEn: '3D model data could not be loaded',
    kickerJa: '3Dモデルを読み込めませんでした',
    helpEn: 'Check your connection and try this model again. If it still fails, the buttons below will take you somewhere that works.',
    helpJa: '通信状況を確認して、このモデルをもう一度読み込んでください。繰り返し失敗する場合は、下のボタンから移動できます。',
    retry: true,
    retryEn: 'Try again',
    retryJa: '再読み込み',
  }),
  no_context: Object.freeze({
    kickerEn: '3D is unavailable in this browser',
    kickerJa: 'この環境では3D表示を開始できません',
    helpEn: 'Use a current browser with WebGL and hardware acceleration available. There is no need to retry repeatedly — the buttons below still work.',
    helpJa: 'WebGLとハードウェアアクセラレーションを利用できる最新ブラウザで開いてください。繰り返し再試行する必要はありません。下のボタンからは移動できます。',
    retry: false,
    retryEn: null,
    retryJa: null,
  }),
  scene_error: Object.freeze({
    kickerEn: 'The 3D model could not start',
    kickerJa: '3Dモデルを開始できませんでした',
    helpEn: 'Try this model once more. If the problem continues, copy the diagnostics below, or use the buttons to go elsewhere.',
    helpJa: 'このモデルをもう一度読み込めます。解消しない場合は、下の診断情報をコピーするか、ボタンから移動してください。',
    retry: true,
    retryEn: 'Try again',
    retryJa: '再読み込み',
  }),
  unknown: Object.freeze({
    kickerEn: 'The 3D model could not start',
    kickerJa: '3Dモデルを開始できませんでした',
    helpEn: 'Try this model again, or use the buttons below to go elsewhere. Diagnostics below can be copied without sending anything automatically.',
    helpJa: 'このモデルをもう一度読み込むか、下のボタンから移動できます。下の診断情報は自動送信されず、内容を確認してコピーできます。',
    retry: true,
    retryEn: 'Try again',
    retryJa: '再読み込み',
  }),
});

export function sceneFailureGuidance(reason) {
  return GUIDANCE[reason] ?? GUIDANCE.unknown;
}
