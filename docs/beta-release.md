# Beta release — what is open, what is not, and how to keep working

所有: 公開範囲（どのシーンが誰に開いているか）。
実装の source of truth は [`../src/catalog/release.js`](../src/catalog/release.js) です。
本書と実装が矛盾したら**実装が勝ち**、本書を直します。

昇格の条件そのものは [`adding-a-scene.md`](adding-a-scene.md)、
ゲートと実装順は [`public-release-roadmap.md`](public-release-roadmap.md) が所有します。
ここが所有するのは「**今この瞬間、何を公開しているか**」だけです。

---

## 1. 何を公開しているか

β版で公開するのは **脳と心臓のモデルで、prototype でないもの**だけです。
現在 5 件——脳アトラス、アミロイドβ、心不全、低心拍出、心筋虚血。

判定は `isSceneReleased()` の 1 か所です。

| | 判定 |
| --- | --- |
| `organ` が `brain` / `heart`、かつ `status !== 'prototype'` | **公開** |
| それ以外 | **ロック** |

新しい判定リストは作りません。脳・心臓に alpha 以上のシーンを足せば自動的に
公開に入り、prototype を足しても入りません。**「β で公開する一覧」を
どこかに書き写さないでください。**

現在の内訳は次で数えられ、`tests/beta-release.test.js` が不変条件を守ります。

```
node -e "import('./src/catalog/release.js').then(m=>console.log(
  m.RELEASED_SCENES.map(s=>s.id).join(', ')))"
```

### なぜ prototype を出さないのか

`prototype` は定義上「形は概略、動きは仮」です（CLAUDE.md / taxonomy.js）。
初めて来た人に最も未完成な側を渡し、モデル層・根拠資料・モデルカードを
備えたモデルを隠す——という状態を避けるための線引きです。

### なぜ「解剖モデルだけ」ではないのか

**心臓には解剖モデルが 1 つもありません。** カタログにある心臓のシーンは
すべて病態モデルです。したがって心臓を公開するとは、数値を出すモデルを
公開することです。これは意図した判断で、各シーンは scope panel を持ち、
成熟度と医学レビューの状態はカードと `#/trust` に別々に出ます。

なお「**全臓器に、脳と同じ A2 水準の解剖モデルを持つ**」は製品の要件です
（[`grand-design.md`](grand-design.md) §4.5、台帳は
[`../src/catalog/anatomy.js`](../src/catalog/anatomy.js)）。心臓に解剖モデルが
無いことは、その要件の未達項目の 1 つであって、β の線引きの根拠ではありません。

### ロックされているルートの見え方

- **シーン**（例 `#/copd`）— `src/app/LockedSurface.js` が
  「TO BE UPDATED / 準備中」を返します。共有済みリンクは死にません
- **`#/lab`（Experimental Lab）** — 全部 prototype なので閉じています
- **`#/`, `#/organs`, `#/trust`, 法務文書** — 開いています

カタログ上、ロックされたモデルは**消えません**。Explorer は臓器ごとに
リンクではないカードとして残し、Landing は公開モデルをカードで、
それ以外を 1 行ずつの一覧で見せます。

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

## 4. クロール面とカード

**クロール可能なページとリンクプレビューのカードは「公開中 かつ prototype でない」
シーンだけ**です（`CRAWLABLE_SCENES`）。理由は 2 つあり、どちらか片方だけで
集合を作ると、もう片方のチャンネルでバグになります。

- **公開していない** — 静的ページが「対話モデルを開く」と誘っておいて
  「準備中」を返すのは、サイトが守れない約束です
- **prototype** — 形も動きも仮なので、検索結果はその但し書きが最も剥がれる場所です

`RELEASED_SCENES` だけで作ると、**β を終わらせた瞬間に prototype 14 件が
クロール面に出ます**（`isSceneReleased` はチャンネルが変わると全 true）。
`PUBLIC_SCENES` だけで作るのは β 前の状態で、開けない 9 件を宣伝していました。

いま出ているのは 5 ページ ＋ カード 6 枚（サイトカード込み）です。
**公開範囲を広げたら `npm run cards` を実行してください**——
`npm run cards:check` はそれまで落ちます。サイトカードの「公開モデル N 件」も
この集合から数えるので、実行しないと数が古いままになります。
