# CLAUDE.md

Three.js + Vite. 依存は `three` のみ。素の JS + JSDoc、フレームワークなし。

```bash
npm run dev        # vite
npm test           # node --test "tests/*.test.js"
npm run build      # vite build
```

- `src/catalog/` — **どんな system / organ / scene が存在するか**。ここが唯一の登録先
- `src/models/` — **医学モデル層**。純粋な JS で、`three` も DOM も import しません。
  `node --test` だけで検証できることが条件です。詳細は
  [`src/models/README.md`](src/models/README.md)
- `src/app/` — シーンと UI の接続。`App.js` はシーンの中身を知らない
- `src/scenes/<system>/organs/<organ>.js` — 臓器のジオメトリ。疾患シーン間で再利用する
- `src/scenes/<system>/scenes/<scene>/` — 1 シーン = 1 モジュール
- `src/scenes/shared/` — 全臓器シーンが載る土台（shell / materials / geometry / motion）
- `src/data/<theme>.js`, `src/data/prototypes/<system>.js` — ステージ定義・配色・文言。
  描画コードに文章を書かない
- `src/components/` — 素の DOM の UI パーツ
- `tests/` — カタログ整合性と医学モデルの整合性テスト（`node --test`）
- `docs/model-evidence/<scene>.md` — その主張がどこから来たか
  （Claim → Source → Implementation → Assumption → Validation）
- `docs/model-cards/<scene>.md` — そのモデルが答える問い、答えない問い、
  誤解を生みうる場所

ルーティングはハッシュ 1 本です。`#/<slug>` が 1 シーン、`#/organs`
（別名 `#/explore`）が全身の Organ Explorer。ルートは `src/catalog/scenes.js`
から生成されるので、**シーンを増やしても routing に手を入れません**。

---

## Product definition

> **Make invisible physiology visible, interactive, and understandable.**
> 見えない病態生理を、3D で動かし、触って理解する。

対象は心臓と脳だけではなく **人体全体** です。最終的に anatomy / physiology /
pathology / disease progression / treatment mechanism を臓器横断的に扱います。
ただし **anatomy atlas を作るのが目的ではありません**。中心はあくまで
「疾患・病態を理解するための 3D visualization」です。

設計判断の source of truth は
[`docs/product-principles.md`](docs/product-principles.md) です。
アプリ全体の完成形・現在地・優先順位と、**どの文書が何を所有しているかの地図**は
[`docs/grand-design.md`](docs/grand-design.md) にあります。触る領域の所有文書が
分からないときは、まずそこの document map を引いてください。
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
- **Heart Failure is the reference implementation.** 深く作り込むときは
  `src/scenes/cardiovascular/scenes/heartFailure/` の構造を基準にする。
  モデル層を分離した新しい書き方は `src/models/copd.js` +
  `src/scenes/respiratory/scenes/copd/` を参照

### Organ と Disease を混ぜない

臓器のジオメトリは `src/scenes/<system>/organs/` に、
それを使う 1 つの主題は `src/scenes/<system>/scenes/<scene>/` に置きます。
`normal-lung` と `asthma` は**同じ肺のジオメトリをパラメータ違いで使う 2 つのシーン**
であって、肺を 2 回モデリングしたものではありません。
臓器ビルダーに疾患名を持ち込まないでください。

### Scene status

カタログの各シーンは `prototype → alpha → reviewed → production` のどれかです。
`production` 以外は UI に **Prototype** バッジが出ます。
昇格の条件は [`docs/adding-a-scene.md`](docs/adding-a-scene.md) にあります。

**prototype は「形は概略、動きは仮」という約束です。** prototype のまま
臨床的な数値を出したり、精度を主張したりしないでください。

**`alpha` 以上のシーンは、モデル層・evidence dossier・model card・
scope panel の 4 点をセットで持ちます。** どれか 1 つでも欠けていれば、
そのシーンは数値を出す資格がありません。バッジが外れる（`production`）
条件には**臨床レビュー**が含まれます。レビューを受けずに上げないでください。

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

臓器を問わず繰り返し出てくる**レンダリング上の失敗モード**（収束する先端の UV 極、
両面シェルの二重合成、飽和が自分の修正を隠すこと、シルエットのテーパー対傾斜、
壁から生える構造の根）と、原因を推測せず切り分ける手順は
[`docs/organ-3d-playbook.md`](docs/organ-3d-playbook.md)。
**新しい臓器の形を作り終えたら、末尾のチェックリストを測ってください。**

### 新しいシーンを足すとき

[`docs/adding-a-scene.md`](docs/adding-a-scene.md) の
**Scene suitability check**（7 問）と **Scene proposal template** に先に答える。
prototype を 1 つ足すだけなら 7 問すべてに答える必要はありませんが、
**「何が時間とともに変化するのか」** には必ず答えてください。
動かないものを 3D にする理由はありません。
