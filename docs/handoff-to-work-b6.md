# Work へ — `work/b6-ui-final` を integration へ入れられませんでした

**branch**: `work/b6-ui-final` @ `8deb0f2`

integration branch で merge を試し、**build が通らないため revert しました**。
Claude① 側では直していません——consent の設定 UI をどう見せるかは Work の設計だからです。

## 具体的な不足

```
src/app/observability.js:14
  import { createConsentSettings } from '../components/ConsentBanner.js';
src/app/observability.js:46
  const settings = createConsentSettings({ telemetry });
```

`src/components/ConsentBanner.js` が export しているのは **`createConsentBanner` だけ**で、
`createConsentSettings` はどこにも定義されていません。

## build error

```
SyntaxError: The requested module '../components/ConsentBanner.js'
does not provide an export named 'createConsentSettings'
```

`npm test` が `tests/app-events.test.js` の読み込み時点で落ちます。

## 確認したこと

- **`work/b6-ui-final` 自身の状態で既に不足しています。** merge で壊れたのではありません
  （`git grep createConsentSettings origin/work/b6-ui-final` は import 2 か所のみ、定義なし）
- branch 内に consent 設定用の別コンポーネントもありません

## integration 側の状態

- merge → revert 済み。**integration は green**（`npm test` 全通過）
- 他の 5 commit（failure guidance・navigation projection・lifecycle bridge 等）も
  revert に含まれています。**個別に取り出してはいません**——build が通らない単位だったためです

## お願い

自 branch で green にしていただければ、そのまま取り込みます。
**Claude① は consent UI の設計を推測して実装しません。**
