# B7 — 他 agent が取り込む接続点

**branch**: `claude/heart-anatomy-b7`（remote 共有済み）
条件の確認記録は [`docs/share-conditions.md`](share-conditions.md)。

## Work へ

**`src/main.js` は触っていません。** 前回からの申し送りもそのままです。

- **loading veil の非 blocking 化は Work の課題として維持**します。ヴェールの除去が
  `observe()` / `reportSceneStart()` の解決に連動しているため、telemetry endpoint が
  遅い環境では**読み込み済みのモデルの上に「building model」が残ります**
- **`onRetryModel` の注入は最小形のまま**です。置き換えても panel 側は無改修

**今回から Work が知っておくとよいこと（外枠 UI を作り直す必要はありません）**：

| 何が | どこで | Work 側で必要なこと |
| --- | --- | --- |
| **カメラは帯（panel が覆っている割合）に追従します** | `src/app/App.js` の band watcher | `#ui` の属性を変える／`.rail`・`.console` の大きさを変える変更は、**カメラの再 framing を引き起こします**。意図した挙動です。読者がカメラに触れた後は止まります |
| **`data-anatomy-shell='calm'` が付くとコンソールが幅を失います** | `src/styles/anatomy-shell-presentation.css` | これが「起動直後だけ framing がずれていた」原因でした。今は追従しますが、**同種の遅延適用は同じ問題を作れます** |
| ~~**`.scope-next-link` / `.scope-next-note`**~~ **B11 で置き換え** | `src/components/RelatedScenesPanel.js`, `src/styles/ui.css` の `.related-*` | 行き先は scope パネルの外へ出ました。テストも `tests/related-scenes.test.js` です。下の 2. と合わせて [`b8-handoff.md`](b8-handoff.md) を正本として読んでください |
| **`.patient-guide-look`** | `src/styles/access.css`, `patient-presentation.css` | 患者説明の「画面のどこを見るか」行。presentation モードでは文字が大きくなります |

## Claude② へ（肺・肝臓・腎臓）

そのまま使える接続点が 3 つあります。**どれも臓器に依存しません。**

1. **`getSubjectBounds()` に `coverage` を返せます。** 返さなければ共有既定（0.78）。
   臓器から血管や管が伸びていて画面端で切れるなら、下げてください。
   `orbitLimitsForSubject()`（`src/app/framing.js`）が orbit の下限・上限を被写体から
   引くので、**小さい臓器でもカメラが 5 world unit に止まりません**
2. ~~**model scope に `next` / `nextNote` を足せます。**~~ **B11 で `meta.related`
   （`{ scenes, note, noteJa }`）に移りました。** scope パネルを持たないシーンからも
   宣言できます。**公開ゲートで閉じているシーンは自動で落ちます。**
   `note` は「別のモデルであって、この標本のその後ではない」を必ず書いてください。
   現行の書き方は [`b8-handoff.md`](b8-handoff.md) を見てください
3. **患者向けガイドは `stage` で scene stage と対にします。** `progress` はその stage の
   `at` と一致していなければテストが落ちます。1 ステップ 3 拍
   （どこが変わるか / 何が起こるか / 画面のどこを見るか）。
   雛形は `PATIENT_GUIDES['heart-failure']` と `tests/patient-guide-pairing.test.js`

## 検証の道具

- `npm run shots:anatomy` は**心臓も撮れるようになりました**（`/dev-assets/` を
  リポジトリ直下から返します）。それまでは 404 の写真を撮っていました
- `npm run verify:anatomy` は失敗時に**どの手順で止まったか**を言います
