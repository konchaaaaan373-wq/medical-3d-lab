# UI framework scalability risk — Vanilla SPA をどこまで続けるか

Last updated: 2026-09-29

## Status

**Observation / architectural risk. Immediate migration is NOT recommended.**

Medical 3D Lab の現在のフロントエンドは **Vite + Three.js + Vanilla JavaScript** であり、
Next.js / React を使っていない。

現時点ではこの選択は合理的である。製品の中心は 3D renderer、医学モデル、
病態 state、アニメーション、操作 UI のリアルタイム同期であり、SSR や RSC は
主要課題ではない。

この文書の目的はフレームワーク移行を開始することではなく、製品が成長するにつれて
**アプリケーション shell まで独自実装し続けるコストが、Vanilla JS の単純さを上回る
時点を見逃さないこと**である。

---

## 1. 現在の構成

概略は以下。

```text
Browser
  ↓
Vite
  ↓
Vanilla JavaScript
  ├─ routing / navigation
  ├─ access / auth
  ├─ landing / explorer / document surfaces
  ├─ patient / education purpose switching
  ├─ loading / fallback / handover
  ├─ telemetry / observability
  └─ UI panels
       ↓
Three.js renderer
       ↓
medical model / scene state
```

依存は非常に少なく、runtime の主要 dependency は `three` のみ。

これは強みである。

- build 構造が単純
- React / RSC / framework lifecycle に依存しない
- Three.js の imperative rendering model と自然に接続できる
- 医学モデル層を UI framework から切り離しやすい
- bundle と runtime の支配権を持ちやすい
- 現在の大量の検証 script / test が既存構造を前提として成立している

したがって、**「React の方が一般的だから」という理由で書き直してはいけない。**

---

## 2. 懸念していること

問題は Vanilla JS そのものではない。

製品が成長した結果、

> 本来 framework が持つ application-shell の責務を、
> Medical 3D Lab が独自実装し続ける

状態へ近づいていることが懸念である。

現時点ですでに application shell は、少なくとも以下を持つ。

- 独自 routing / route redirects
- shell navigation
- auth redirect の解釈と復帰
- access / entitlement
- landing / explorer / legal / locked / scene surface の切り替え
- patient explanation / medical education の purpose 切り替え
- model asset preload
- loading veil
- scene handover
- renderer failure fallback
- pagehide cleanup
- keyboard shortcut guard
- global event lifecycle
- telemetry / observability
- release gate
- mobile UI / touch target rules
- accessibility handling

これらは 3D renderer の責務ではない。

今後さらに account、learning history、favorites、course、dashboard、settings、
institutional UI 等が増える場合、Vanilla JS のままでは
**「独自 SPA framework を自分たちで保守する」状態**になる可能性がある。

---

## 3. 将来的に起こり得る問題

### 3.1 State ownership の分散

DOM、router、access、purpose、scene、renderer、panel がそれぞれ状態を持ち始めると、

- どこが source of truth か分からない
- 同じ状態を複数 surface が書き換える
- route と表示がずれる
- cleanup 漏れで前画面の状態が残る

といった問題が増える。

Medical 3D Lab は医学 state の single source of truth を重要原則としているため、
UI shell でも同様の discipline が必要。

### 3.2 Lifecycle の自前管理

現在でも、

- navigation
- auth redirect
- dynamic import
- scene creation
- renderer failure
- pagehide
- event listener cleanup
- async optional service

を手動で扱っている。

機能追加に伴い lifecycle が増えると、
「正常経路では動くが、戻る・再読み込み・失敗・認証復帰で壊れる」
種類の regression が増えやすい。

### 3.3 Router と UI の密結合

route 数と surface 数が増えるほど、

- URL
- navigation
- access gate
- loading state
- page title / metadata
- active navigation
- back / forward

の整合性を独自実装で維持する必要がある。

route が 3D scene だけでなく通常の application screen を多く持つようになったら、
既存 router の責務を再評価する。

### 3.4 UI 再利用と変更コスト

小さい UI では DOM factory / imperative update は軽い。

しかし、

- account
- dashboard
- learning progress
- compare
- saved models
- institutional controls
- complex forms

のような状態を持つ UI が増えると、

「表示を作るコード」と「状態同期コード」が各 component に重複しやすい。

### 3.5 AI 開発時の変更安全性

この project は AI agent による実装比率が高い。

標準的な component / router / state の規約が少ないほど、
agent が局所的に別パターンを追加しやすくなる。

結果として、

- event handler の追加
- DOM ownership の競合
- cleanup の欠落
- routing rule の重複
- style ownership の拡散

が起こりやすい。

これは「Vanilla JS は悪い」という話ではなく、
**規約を framework の外側で自分たちが保有するコスト**である。

---

## 4. 今は移行しない理由

現在の優先順位は framework migration ではない。

Medical 3D Lab の利用価値を決めるのは、

- 解剖品質
- 病態モデル品質
- 3D 操作性
- 患者説明 / 医学教育での理解改善
- clinical review
- evidence / provenance

である。

UI framework を変更しても、これらは直接改善しない。

また現状には、

- 多数の scene
- renderer
- asset loader
- test
- release gate
- accessibility handling
- observability

が既に存在し、全面移行は大きな regression surface を作る。

したがって、**現在の判断は「Vite + Vanilla JS を維持する」**。

---

## 5. 再評価すべきトリガー

以下のような変化が起きたら、UI shell の framework 導入を正式に再評価する。

### Product-side triggers

- account / profile / settings が主要 surface になる
- learning history / progress / course UI を持つ
- favorites / saved scenes / user library を持つ
- organization / institution 向け dashboard を持つ
- complex form や CRUD screen が増える
- 3D scene 外の application screen が製品の大きな割合を占める

### Engineering-side triggers

- router / navigation regression が繰り返される
- global event / cleanup bug が継続的に発生する
- state owner が複数になり synchronization bug が増える
- UI component の imperative DOM update が大きく複雑になる
- 同種 UI の実装方法が複数パターンに分岐する
- 新しい agent / contributor が architecture を理解するコストが顕著に上がる
- shell の変更時に scene unrelated regression が頻繁に起こる

単発の bug だけで移行を決めない。

**製品機能の変化と保守コストの両方が継続的に増えたとき**を判断点とする。

---

## 6. 将来の候補アーキテクチャ

再評価時の第一候補は、Next.js ではなく、
**Vite を維持しながら application UI shell のみ React 系へ移す構成**。

一例：

```text
Vite
  ↓
React + TanStack Router
  ↓
Application shell / panels / account UI
  ↓
existing scene/model interface
  ↓
Three.js renderer
  ↓
pure medical models
```

重要なのは、framework migration をしても以下は framework 非依存のまま維持すること。

- `src/models/` の純粋な医学モデル
- scene interface
- Three.js renderer / geometry
- evidence / model cards / provenance
- release gate
- clinical review
- medical correctness tests

React 等を導入する場合でも、
**Three.js renderer を React component tree に無理に埋め込む必要はない。**
既存 renderer を imperative subsystem として adapter 越しに接続できる。

TanStack Router はあくまで候補であり、この文書は採用決定ではない。

---

## 7. Next.js について

この project では、現時点で Next.js を導入する理由は弱い。

Medical 3D Lab の主要機能は client-side の interactive 3D application であり、

- RSC
- Server Actions
- server-side data dependency
- page-level SSR

を中核要件としていない。

将来 server-side rendering が必要になった場合も、
要件を明文化してから選定する。

**「Web app だから Next.js」という理由では導入しない。**

---

## 8. 当面の guardrails

framework を変えない代わりに、独自 SPA の肥大化を抑える。

1. **医学 state は 1 箇所が所有する**
   - UI convenience state と physiology state を混ぜない。

2. **Router の判断を分散させない**
   - route interpretation / redirect / publication gate を複数 module が独自判断しない。

3. **Global event handler を増やす前に ownership を明示する**
   - install と cleanup を必ず対にする。

4. **Renderer と application shell を分離する**
   - account / navigation / document surfaces が Three.js の内部状態を直接操作しない。

5. **新しい cross-cutting UI は共通 contract を先に作る**
   - scene-specific DOM patch を増やさない。

6. **main entrypoint に責務を集め続けない**
   - orchestration と feature implementation を分離する。

7. **UI shell の複雑性も regression 対象にする**
   - route / back-forward / auth recovery / failure / mobile を継続して自動確認する。

8. **framework migration を「掃除」として行わない**
   - 明確な product / engineering trigger が発生した時だけ ADR を作る。

---

## 9. Decision checkpoint

現時点の判断：

> **Stay on Vite + Vanilla JavaScript + Three.js.**
>
> ただし、Medical 3D Lab が 3D viewer から
> account / learning / dashboard を含む大きな application shell へ成長する場合は、
> Vanilla JS のまま独自 SPA framework を作り続けない。
>
> UI shell だけを React + Router 等へ段階移行できるよう、
> renderer・医学モデル・catalog と application UI の境界を今から維持する。

この判断を変更するときは、framework の好みではなく、
上記 trigger と実測された保守コストを根拠に ADR を作成する。
