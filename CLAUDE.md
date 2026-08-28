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

### アーキテクチャ規則

3D シーンで静かに壊れたバグの再発防止として、以下を守ってください。
詳細と実例は
[`docs/architecture-rules.md`](docs/architecture-rules.md)。

1. **Semantic geometry** — geometry の利用側は解剖学的な名前で位置を指す。
   曲線の正規化座標（`curve.getPointAt(0.11)`）を利用側に書かない
2. **Local coordinates** — 部分構造は、その部分自身のローカル座標で定義する。
   Valsalva 洞は「大動脈全長の 2.8%」ではなく「大動脈基部の 55%」
3. **Single state ownership** — 描画プロパティの最終値を決める場所は 1 つだけ。
   複数箇所から `material.opacity = ...` を書かない
4. **Physiology vs presentation** — 生理状態と Story の reveal / emphasis を
   分ける。Story は見せ方であり、解剖のサイズを変えてはならない
5. **Anatomical axes** — シーンの解剖軸をコード上に定義し、左右をそこから引く。
   `+x` / `-x` を各自が推測する状態にしない
6. **Visual regression** — 3D シーンは unit test の合格だけでは完成としない。
   実レンダリングの確認まで含めて Definition of Done とする

### 新しいシーンを足すとき

[`docs/adding-a-scene.md`](docs/adding-a-scene.md) の
**Scene suitability check**（7 問）と **Scene proposal template** に先に答える。
