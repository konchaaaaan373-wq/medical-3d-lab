# Beta release — what is open, what is not, and how to keep working

所有: 公開範囲（どのシーンが誰に開いているか）。
実装の source of truth は [`../src/catalog/release.js`](../src/catalog/release.js) です。
本書と実装が矛盾したら**実装が勝ち**、本書を直します。

昇格の条件そのものは [`adding-a-scene.md`](adding-a-scene.md)、
ゲートと実装順は [`public-release-roadmap.md`](public-release-roadmap.md) が所有します。
ここが所有するのは「**今この瞬間、何を公開しているか**」だけです。

---

## 1. 何を公開しているか

β版で公開するのは **臓器モデル**（解剖と正常な動き）だけです。
病態モデルは実装も開発も続いていますが、公開はしていません。

境界はカタログがすでに持っている `scene.disease` そのものです。

| | 判定 | 理由 |
| --- | --- | --- |
| `disease === null` | **公開** | 主張しているのは形と動き |
| `disease` あり | **ロック** | 画面に数値を出す＝主張する |

新しい判定リストは作りません。シーンを 1 つ足せば、`disease` の有無で
自動的にどちらかに入ります。**「β で公開する臓器モデル一覧」を
どこかに書き写さないでください。**

現在の内訳は `node -e "import('./src/catalog/release.js').then(m =>
console.log(m.RELEASED_SCENES.length, m.LOCKED_SCENES.length))"` で数えられ、
`tests/beta-release.test.js` が分割の不変条件を守っています。

### なぜ疾患モデルを止めるのか

臓器モデルが主張するのは形です。病態モデルは画面に数値を出し、
**数値は主張**です。`alpha` 以上のシーンが数値を出す資格を持つのは
モデル層・evidence dossier・model card・scope panel の 4 点が揃ったときだけ、
というのが既存のルール（CLAUDE.md / `adding-a-scene.md`）で、
β はそのルールを公開範囲にも適用しただけです。

### ロックされているルートの見え方

- **シーン**（例 `#/heart-failure`）— `src/app/LockedSurface.js` が
  「TO BE UPDATED / 準備中」を返します。共有済みリンクは死にません。
  何を指していたかを名前で示し、公開中のモデルへの導線を出します
- **`#/lab`（Experimental Lab）** — β では prototype が公開側の臓器モデルなので、
  Lab は開発者向け surface として閉じています
- **`#/`, `#/organs`, `#/trust`, 法務文書** — 開いています。
  ランディングとカタログは臓器モデルへの入口そのもので、
  法務文書は WebGL が起動しない端末でも読めなければならないためです

カタログ上、ロックされたモデルは**消えません**。Landing と Explorer は
一覧に残したまま、リンクではない（`<span>` / `<div>`）カードとして描きます。
何を作っているのかが見えることは製品の主張の一部で、
クリックできそうに見えて謝るリンクより、最初からリンクでないほうが誠実です。

---

## 2. 裏で開発を続ける

ゲートはブラウザ側の**カーテンであって鍵ではありません**。
シーンのコードはビルドに含まれています。
「読まれたら困るもの」をこの裏に置かないでください。

| したいこと | やり方 |
| --- | --- |
| ローカルで全部見る | `npm run dev`（無条件でアンロック） |
| デプロイ済みビルドで全部見る | 任意の URL に `?preview=1` を付けて 1 回開く |
| その端末で元に戻す | `?preview=0` |
| テストで検証する | `resolveDevUnlock()` は純関数です |

`?preview=1` は `localStorage` の `m3l.beta-preview` に記憶され、
以後は普通に navigate できます。読み込み後にアドレスバーからは取り除かれるので、
レビュワーがそこから URL をコピーしてもアンロックは共有されません。

判定は 1 ページロードにつき 1 回だけ行われ（`src/app/releaseGate.js`）、
Landing・Explorer・ルーターは同じ答えを見ます。

---

## 3. β を終わらせるとき

`src/catalog/release.js` の `RELEASE_CHANNEL` を `'beta'` から変えると、
`isSceneReleased()` が全シーンに `true` を返し、ロックは一斉に外れます。
そのとき同時に見直すもの:

- `PUBLIC_SCENES` / `LAB_SCENES` の投影は β の間も意味を保っています。
  Explorer は β のあいだだけ全カタログを描き、それ以外では `PUBLIC_SCENES` に戻ります
- Landing の hero は臓器モデルのローテーションのままで構いません
  （[`../src/data/landingHero.js`](../src/data/landingHero.js)）
- Lab へのリンクは β の間だけ隠されています

---

## 4. 既知のギャップ

**prototype の臓器モデルは crawlable ではありません。**
`scripts/check-site-output.js` が「Prototype work must not be published to the
crawlable surface」を強制しており、prerender・sitemap・link-preview カード
（`public/social/`）はいずれも `PUBLIC_SCENES` を対象にしています。
つまり `#/breathing-lungs` を SNS に貼っても、専用の OGP カードではなく
サイト共通カードが出ます。

これは意図的に**変更していません**——prototype をクローラに出すのは
「するつもりのない主張をする」ことだ、という既存の判断
（[`discoverability.md`](discoverability.md)）を、公開範囲の変更のついでに
覆すべきではないためです。SNS の入口として個別カードが必要になったら、
それは「その臓器モデルを `alpha` に上げる」という別の判断です。
