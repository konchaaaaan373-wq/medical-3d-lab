# CLAUDE.md

Three.js + Vite. 依存は `three` のみ。素の JS + JSDoc、フレームワークなし。

```bash
npm run dev        # vite
npm test           # node --test "tests/*.test.js"
npm run build      # vite build
```

- `src/app/` — シーンと UI の接続。`App.js` はシーンの中身を知らない
- `src/scenes/<theme>/` — 1 テーマ = 1 シーンモジュール
- `src/data/<theme>.js` — ステージ定義・配色・文言。描画コードに文章を書かない
- `src/components/` — 素の DOM の UI パーツ
- `tests/` — 医学モデルの整合性テスト（`node --test`）

---

## Product principles

設計判断の source of truth は
[`docs/product-principles.md`](docs/product-principles.md) です。
何かを追加・変更する前に、以下を前提にしてください。

- **3D is a means, not the goal.** 2D の静止画より理解が明確に改善しないなら
  3D にしない。「回せると格好いい」は理由にならない
- **Favor dynamic concepts.** 時間変化・因果・複数変数の連動があるものを選ぶ。
  静的な解剖ビューアは作らない
- **One medical source of truth.** 1 つの医学 state から 3D・数値・グラフ・
  ラベル・SNS・教材がすべて派生する。グラフ用に別の近似を書かない
- **Never alter physiology for visual impact.** 見えにくいときに動かすのは
  lighting / camera / color / opacity / animation timing であって、
  臨床パラメータではない
- **Separate medical and visualization parameters.** 臨床的な値は臨床的な名前と
  単位で（`edvMl`, `endDiastolicPressureMmHg`）、演出値はそれと分かる名前で
  （`glowIntensity`, `presentationEmphasis`）
- **Every feature should serve SNS / Interactive / Educational value.**
  「この機能はどの層の、どのユーザー価値を改善するのか？」に答えられない機能は
  追加しない。Interactive Web が中核、SNS は入口、Educational は定着
- **Heart Failure is the reference implementation.** 新しい実装は
  `src/scenes/heartFailure/` の構造を基準にする

### 医学表現

- educational conceptual model であって、患者個別シミュレーターでも研究用
  数値シミュレーターでもない。**誤ってはいけないが、完全である必要はない**
- モデル以上の主張をしない。精度を超える桁数を UI に出さない。較正パラメータを
  臨床計測値と同一視しない。一例を一般則として書かない
- 単純化したことは [`docs/medical-notes.md`](docs/medical-notes.md) に必ず書く
- 医学的な値を変えたら `npm test` を通す

### 新しいシーンを足すとき

[`docs/adding-a-scene.md`](docs/adding-a-scene.md) の
**Scene suitability check**（7 問）と **Scene proposal template** に先に答える。
