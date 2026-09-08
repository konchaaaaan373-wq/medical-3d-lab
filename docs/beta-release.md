# Beta release — what is open, what is not, and how to keep working

所有: 公開範囲（どのシーンが誰に開いているか）。
実装の source of truth は [`../src/catalog/release.js`](../src/catalog/release.js) です。
本書と実装が矛盾したら**実装が勝ち**、本書を直します。

昇格の条件そのものは [`adding-a-scene.md`](adding-a-scene.md)、
ゲートと実装順は [`public-release-roadmap.md`](public-release-roadmap.md) が所有します。
ここが所有するのは「**今この瞬間、何を公開しているか**」だけです。

---

## 1. 何を公開しているか

**公開βは「脳と心臓の 3D 解剖」です。解剖モデルだけを出します。**
病態・生理のモデルは開発を続けますが、このβには出しません。

現在公開しているのは **`brain-anatomy` の 1 件**です。
`heart-anatomy` は候補として登録済みですが、**シーンがまだ存在しません**。

```
node -e "import('./src/catalog/release.js').then(m=>console.log(
  JSON.stringify(m.BETA_CANDIDATE_STATUS, null, 1)))"
```

### 候補に名前があることは、公開ではない

`BETA_ANATOMY_CANDIDATES` は**候補**の一覧です。文字列が一致するだけでは
何の資格も与えません。`betaPublicationProblems()` が空になったときだけ開きます。

| # | 条件 | どこが答えるか |
| --- | --- | --- |
| 1 | カタログに登録され、taxonomy が知っている status を持つ | `scenes.js` / `taxonomy.js` |
| 2 | 解剖の主張だけをする（`disease` が無く、mechanism level が `none`、個別化なし、臨床用途の宣言なし） | `modelProfiles.js` |
| 3 | profile が挙げる asset がすべて asset release gate を通る（ライセンス・obligation・hash・QA） | `assetManifest.js` |
| 4 | 医学レビュー記録が `stale` でない | `clinicalReview.js` |
| 5 | この scene と **その asset revision に結びついた公開判断記録**がある | `BETA_PUBLICATION_DECISIONS` |

未知の status、profile の欠落、ライセンス不明、hash が変わったあとの古い判断——
どれも**閉じる**側に倒れます。`tests/beta-release.test.js` がその 1 つ 1 つを
実際に注入して確かめます。

### 公開判断記録は医学レビューではない

`BETA_PUBLICATION_DECISIONS` は「この scene が指す構造を、実際に配信している
ファイル（hash 指定）に対して確認した」という記録です。
**医学レビューの sign-off ではありません**——それは
[`clinical-reviews/registry.json`](clinical-reviews/registry.json) が所有し、
`brain-anatomy` については現在 `pending` です。UI もそう表示します。

メッシュを再エクスポートすれば hash が変わり、その判断は自動的に効かなくなります。
あるファイルについての判断は、別のファイルについての判断ではありません。

### 未完成の心臓解剖を、病態モデルで代用しない

**これがこのβの中心的な決定です。** 以前のルールは「脳・心臓に属する
非 prototype シーンを公開する」で、心臓には解剖シーンが無いから心不全・
低心拍出・心筋虚血を——数値ごと——公開する、という理由づけでした。
それは逆です。**病態モデルはラベルを変えた解剖モデルではありません。**

`heart-anatomy` が未登録・不合格のあいだ、βは臓器 1 つを開いてそう言います。
Landing の hero も「心臓を見る」を出しません（`src/data/landingHero.js` の
`HERO_ROTATION` が公開集合で絞ります）。心臓が戻るのは `heart-anatomy` が
上の 5 条件を通った日で、そのとき hero・カタログ・クロール面・カードは
**どれも編集不要**です。

心臓に解剖モデルが無いことは、
「全臓器に脳と同じ A2 水準の解剖モデルを持つ」という製品要件
（[`grand-design.md`](grand-design.md) §4.5、台帳は
[`../src/catalog/anatomy.js`](../src/catalog/anatomy.js)）の未達項目です。

### なぜ prototype を出さないのか

`prototype` は定義上「形は概略、動きは仮」です（CLAUDE.md / taxonomy.js）。
条件 1 がこれを弾きます。

### ロックされているルートの見え方

- **シーン**（例 `#/copd`）— `src/app/LockedSurface.js` が
  「TO BE UPDATED / 準備中」を返します。共有済みリンクは死にません
- **`#/lab`（Experimental Lab）** — 全部 prototype なので閉じています
- **`#/`, `#/organs`, `#/trust`, 法務文書** — 開いています
- **アカウント管理** — ルートではなくヘッダーのコントロールで、
  ロック画面を含む全サーフェスに載ります。モデルを閉じることと、
  既存の契約者を自分の請求・解約導線から締め出すことは別です

**公開の情報設計からは外します。** Landing も Explorer も、
公開中のモデルだけを並べます。以前は未公開の 26 件を「準備中」の行・カードとして
残していましたが、それは「手に入らないもの」が製品を数で圧倒するページでした。
カタログからは消えません（`#/trust` は全モデルのレビュー状態を出し続けます）。

## 2. 裏で開発を続ける

| したいこと | やり方 |
| --- | --- |
| ローカルで全部見る | `npm run dev`（無条件でアンロック） |
| レビュー用ビルドを作る | `VITE_ALLOW_PREVIEW=1 npm run build` |
| そのビルドで全部見る | 任意の URL に `?preview=1` を付けて 1 回開く（`?preview=0` で解除） |
| テストで検証する | `resolveDevUnlock()` は純関数です |

### production ではアンロックできません

**`?preview=1` も、保存済みの `m3l.beta-preview` も、production ビルドでは
何も開きません。** アンロックはビルド時に決まる capability で、URL・
hostname 文字列・ブラウザに残った値からは決まりません
（`VITE_ALLOW_PREVIEW`、`src/app/releaseGate.js` と `vite.config.js` が同じ変数を読む）。
preview と production が同じ origin で配信された場合に備えて、
production ビルドは保存済みのアンロック値を**消します**。

### そして、配信そのものを絞ります

`scripts/scene-loaders-plugin.js` が、production ビルドから
**公開しないシーンの dynamic import を落とします**。チャンクが出ない＝
コードが配信されない、ということです（preview ビルドは全部残します——
レビュワーが作業中のものを開けなければ意味がないので）。
`npm run verify:site` が dist を歩いて、非公開シーンのチャンク・カード・
静的ページ・source map・service worker が残っていないかを確かめます。

### これで「秘匿」できるわけではありません

**リポジトリは公開されています。** 誰でも読めて、ビルドして、
カタログ全部を動かせます。ここでやっているのは
「製品が何を提供するか」を揃えることであって、ソースの秘匿ではありません。
読まれたら困るものをこの裏に置かないでください。
private 化や履歴の書き換えを勝手に行わないこと。

---

## 3. UI 担当への公開契約

公開中のモデルの一覧は
[`../src/catalog/publicManifest.js`](../src/catalog/publicManifest.js) が
唯一の答えです。UI は公開判定を再実装しません。

```js
import { PUBLIC_MANIFEST, organIsPublished } from '../catalog/publicManifest.js';
// PUBLIC_MANIFEST = { schemaVersion, revision, channel, models, organs, count }
// models[] = { sceneId, organId, organLabelJa, titleJa, titleEn, route,
//              posterPath, posterKind, modelInfoRoute, modelCard }
```

- **`ready: false` の仮データは作りません。** 開けないモデルは行がありません。
  「なぜ心臓が無いのか」は `BETA_CANDIDATE_STATUS` が理由つきで答えます
- `posterKind` は `'link-preview-card'` です。これは**カタログの文字から描いた
  1200x630 のカードであって、モデルの 3D レンダリングではありません**。
  「モデルの写真」として出さないでください
- 行の形は `tests/public-manifest.test.js` が固定しています

---

## 4. β を終わらせるとき

`src/catalog/release.js` の `RELEASE_CHANNEL` を `'beta'` から変えると、
`isSceneReleased()` は候補リストを見なくなり、prototype 以外の全シーンに
`true` を返します。そのとき同時に見直すもの:

- `PUBLIC_SCENES` / `LAB_SCENES` の投影は β の間も意味を保っています
- Landing の hero は臓器モデルのローテーションのままで構いません
  （[`../src/data/landingHero.js`](../src/data/landingHero.js)）
- Lab へのリンクは β の間だけ隠されています
- `npm run cards` を実行し直してください（下）

---

## 5. クロール面とカード

**クロール可能なページとリンクプレビューのカードは「公開中 かつ prototype でない」
シーンだけ**です（`CRAWLABLE_SCENES`）。理由は 2 つあり、どちらか片方だけで
集合を作ると、もう片方のチャンネルでバグになります。

- **公開していない** — 静的ページが「対話モデルを開く」と誘っておいて
  「準備中」を返すのは、サイトが守れない約束です
- **prototype** — 形も動きも仮なので、検索結果はその但し書きが最も剥がれる場所です

`RELEASED_SCENES` だけで作ると、**β を終わらせた瞬間に prototype 14 件が
クロール面に出ます**。`PUBLIC_SCENES` だけで作るのは β 前の状態でした。

いま出ているのは 1 ページ ＋ カード 2 枚（サイトカード込み）です。
`public/social/` のカードは `public/` ごと dist にコピーされるので、
**コミットされている集合が、そのまま配信される集合です**。
公開範囲を変えたら `npm run cards` を実行してください——
`npm run cards:check` はそれまで落ちます。サイトカードの「公開モデル N 件」も
この集合から数えます。

```
npm i --no-save playwright
CHROMIUM_PATH=<chromium> npm run cards   # ブラウザが要る唯一の工程
npm run cards:check                       # ブラウザ不要。CI で回る
```
