const GUIDANCE = Object.freeze({
  asset_error: Object.freeze({
    kickerEn: '3D model data could not be loaded',
    kickerJa: '3Dモデルを読み込めませんでした',
    helpEn: 'Check your connection and try this model again. If it still fails, you can continue to the public models or home.',
    helpJa: '通信状況を確認して、このモデルをもう一度読み込んでください。繰り返し失敗する場合は、公開モデル一覧またはホームへ戻れます。',
    retry: true,
    retryEn: 'Try again',
    retryJa: '再読み込み',
  }),
  no_context: Object.freeze({
    kickerEn: '3D is unavailable in this browser',
    kickerJa: 'この環境では3D表示を開始できません',
    helpEn: 'Use a current browser with WebGL and hardware acceleration available. You can still browse model information without retrying repeatedly.',
    helpJa: 'WebGLとハードウェアアクセラレーションを利用できる最新ブラウザで開いてください。繰り返し再試行しなくても、モデル情報や公開モデル一覧は利用できます。',
    retry: false,
    retryEn: null,
    retryJa: null,
  }),
  scene_error: Object.freeze({
    kickerEn: 'The 3D model could not start',
    kickerJa: '3Dモデルを開始できませんでした',
    helpEn: 'Try this model once more. If the problem continues, copy the diagnostics below or return to the public models.',
    helpJa: 'このモデルをもう一度読み込めます。解消しない場合は、下の診断情報をコピーするか、公開モデル一覧へ戻ってください。',
    retry: true,
    retryEn: 'Try again',
    retryJa: '再読み込み',
  }),
  unknown: Object.freeze({
    kickerEn: 'The 3D model could not start',
    kickerJa: '3Dモデルを開始できませんでした',
    helpEn: 'Try this model again, or return to the public models. Diagnostics below can be copied without sending anything automatically.',
    helpJa: 'このモデルをもう一度読み込むか、公開モデル一覧へ戻れます。下の診断情報は自動送信されず、内容を確認してコピーできます。',
    retry: true,
    retryEn: 'Try again',
    retryJa: '再読み込み',
  }),
});

export function sceneFailureGuidance(reason) {
  return GUIDANCE[reason] ?? GUIDANCE.unknown;
}
