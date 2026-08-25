# Product architecture

層の依存関係を 1 枚に固定した文書です。設計思想の全体は
[`../product-principles.md`](../product-principles.md)。

---

## The one rule

> **SNS and Educational layers consume the medical model.
> They must not fork the medical truth.**

SNS 用に別の EF 値を持つ、Educational 用に別の geometry を作る、グラフ用に
別の近似を書く——いずれも禁止です。これが崩れた瞬間、「絵と数字が食い違う」
という教材として最悪の状態が構造的に防げなくなります。

---

## Dependency direction

```text
                    ┌──────────────────────┐
                    │  Shared Medical Model │   circulation.js / hemodynamics.js
                    │   (single source of   │   aggregationLayout.js
                    │        truth)         │
                    └───────────┬──────────┘
                                │  getState()
                                ▼
                    ┌──────────────────────┐
                    │        state         │   1 つの解 / 1 つの進行度
                    └───────────┬──────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
   ┌───────────┐         ┌───────────┐          ┌───────────┐
   │    3D     │         │  charts   │          │  metrics  │
   │ geometry  │         │ PV / wave │          │  read-out │
   │ animation │         │           │          │  labels   │
   └─────┬─────┘         └─────┬─────┘          └─────┬─────┘
         └──────────────────────┼──────────────────────┘
                                ▼
                    ┌──────────────────────┐
                    │  presentation layer  │   camera / lighting / opacity
                    │                      │   timing / emphasis
                    └───────────┬──────────┘
                    ┌───────────┴──────────┐
                    ▼                      ▼
             ┌───────────┐          ┌──────────────┐
             │   Reel    │          │  Learning    │
             │  (SNS)    │          │  (Education) │
             └───────────┘          └──────────────┘
```

**矢印は一方向です。** 下の層は上の層を読みますが、上の層に書き込みません。

---

## 何がどちら側か

| Medical model 側（触らない） | Presentation 側（自由に調整） |
| --- | --- |
| `edvMl` `esvMl` `ejectionFraction` | `cameraDistance` `bloomStrength` |
| `endDiastolicPressureMmHg` | `glowIntensity` `particleOpacity` |
| `meanAtrialPressureMmHg` | `presentationEmphasis` |
| `preload` `afterload` | `labelOffset` `cueOpacity` |
| `congestionLevel` `interstitialFluidLevel` | `uWaveStrength` `uFieldOpacity` |

Reel が「うっ血ビートを目立たせたい」ときに動かしてよいのは右列だけです。
実装例は `HeartFailureScene.setCongestionEmphasis()` — 医学 state を一切変えずに
グロー・波・不透明度・カメラだけを動かします。

---

## 現在の実装との対応

| 層 | 実装 |
| --- | --- |
| Shared Medical Model | `scenes/heartFailure/circulation.js`, `hemodynamics.js` / `scenes/amyloidBeta/aggregationLayout.js` |
| state | `Playback` の進行度 1 つ + Scene が解いた state |
| 3D | `Chamber.js` `BloodField.js` `CongestionOverlay.js` `AggregationField.js` |
| charts | `components/PressureVolumePanel.js` `PressureWavePanel.js` |
| metrics | `components/MetricsPanel.js` `LabelLayer.js` |
| presentation | `app/framing.js` `Viewer.js` / Scene の `set*Emphasis()` |
| Reel | `app/ReelMode.js` + Scene の `getReel()` |
| Learning | `components/LearningPanel.js` + Scene の `getLearningModules()` |

---

## 実装時のチェック

新しい機能を書く前に:

1. **この機能はどの層に属するか？**
2. 医学モデルに書き込んでいないか？（presentation 側で解決できないか）
3. 数値を出すなら、それは 3D と同じ state から出ているか？
4. Reel / Learning が Scene に「その層専用の分岐」を要求していないか？

4 に該当する場合は、Scene 側に**汎用フック**を足してから使ってください。
`setCardiacPhaseDriven()` がその例です — Reel 専用ロジックではなく
「位相を外部から駆動できる」という一般的な能力として実装されています。

## Learning 層が model を fork しないということ

Educational Module は、モデルへの privileged path を持ちません。

- スライダーと**同じ** `setModelControl()` / `setProgress()` を通して操作する
- 数値は**同じ** `getMetrics()` から読む。教材専用の計算はしない
- 応用問題の「どちらが大きいか」は、教材が**その場でモデルを 2 回解いて測る**。
  文章に書いた値ではない

そのうえで、教材が保存している「正解」は `tests/learning.test.js` が
**モデルから再導出して照合**します。教材はモデルについての主張なので、
その主張は CI で検証できなければなりません。

```text
lesson copy  ──asserts──▶  model behaviour
      ▲                          │
      └────── CI re-derives ─────┘
```
