# Model evidence — 循環、保たれてる？

| | |
| --- | --- |
| **Implementation** | [`src/models/circulation.js`](../../src/models/circulation.js) |
| **Registry** | [`src/models/evidence.js`](../../src/models/evidence.js) (`CIRCULATION_EVIDENCE`) |
| **Model card** | [`docs/model-cards/circulation.md`](../model-cards/circulation.md) |
| **External tests** | [`tests/circulation-physiology.test.js`](../../tests/circulation-physiology.test.js) |
| **Integrity tests** | [`tests/circulation-model.test.js`](../../tests/circulation-model.test.js) |
| **Calibration tests** | [`tests/calibration.test.js`](../../tests/calibration.test.js) |
| **Last checked** | **2026-09-02** |

> **Status: alpha conceptual model.** 文献が支持するのは定義と一部の変化方向です。
> 画面上の絶対値・変化量は患者データへのfitではなく、教育上の比較を作るための
> calibration / illustrative valueです。用量、併用、適応、反応確率、転帰を扱いません。

## 確認方法とアクセス限界

- Simmons & Ventetuolo、Collins et al.、Ince は PMC の全文を確認しました。
- ESICM 2025 shock guideline は PubMed の書誌情報・抄録を確認しました。
- Leier et al. と Baker et al. は PubMed 抄録までです。いずれも小規模かつ、現在の
  シーンと同じ集団・目的ではないため **thin** と明示します。
- Schneekloth et al. は global DO₂ の計算例として書誌情報と抄録を確認しましたが、
  本モデルの出力値の較正には使っていません。
- ガイドラインの図表・アルゴリズム、論文の図表・文章は転載していません。

## Claim registry

### 1. 定義と単位

#### `cardiac-output-definition` — established

`CO = HR × SV / 1000`。HR [/min] と SV [mL] から CO [L/min] を得ます。
これは標準的な定義です。Simmons & Ventetuolo を参照しました。

#### `pressure-flow-resistance` — established

`MAP = CVP + CO × SVR / 80`。定常・集中定数の関係として、圧は血流と抵抗の
双方に依存します。これは拍動、動脈コンプライアンス、波反射を解くモデルではありません。
この式から「MAPだけではCOもSVRも一意に定まらない」という命題だけを採用します。

#### `global-do2-definition` — established

```text
CaO₂ = 1.34 × Hb × SaO₂ + 0.003 × PaO₂
DO₂  = CO × 10 × CaO₂
```

Collins et al. の酸素含量の整理と、標準的なglobal DO₂の定義を用います。
Schneekloth et al. は同じ構成の計算例です。表示名は必ず
**「計算上の全身DO₂」** とし、組織酸素分圧・酸素抽出・VO₂とは呼びません。

### 2. 介入方向

#### `fluid-responsive-direction` — supported, **thin**

Baker et al. は、人工呼吸・noradrenaline使用中の重症患者25例に500 mL colloidを
投与し、SVが15%を超えて増えたものをfluid responderと定義しました。12/25例だけが
responderでした。本シーンは**最初からresponderを選択した仮想状態**で、SVとCOが増える
方向だけを採用します。輸液の適応、液種、量、速度、反応確率、安全性は支持しません。

#### `dobutamine-direction` — supported, **thin**

Leier et al. の重症心不全13例のcrossover studyでは、dobutamine 2.5–10 μg/kg/minで
SV/COが増え、SVR/PVR/PCWPが低下し、同用量域でHRは変化しなかったと抄録にあります。
本シーンはSV↑・CO↑・SVR↓・HR固定という**方向だけ**を採用します。古い小規模な
心不全集団から、敗血症その他のshock phenotypeや現在の治療効果へ一般化しません。

ESICM 2025は、shockの評価を動脈圧単独で完結させず、組織灌流・血流・治療反応を
繰り返し評価する枠組みを扱っています。本シーンのボタンを治療推奨に変える根拠ではありません。

### 3. このリポジトリが置いた値

#### `low-flow-map-anchor` — calibration

基準は HR 96/min、SV 38 mL、CO 3.648 L/min、CVP 6 mmHg と置き、SVRを逆算して
MAP 70 mmHgに合わせました。「MAP 70だが非補正COが相対的に低い」という比較を作る
ための**calibration**で、患者計測値でも普遍的閾値でもありません。

#### `illustrative-response-sizes` — illustrative

| 排他的状態 | SV倍率 | SVR倍率 | モデル出力の概数 |
| --- | ---: | ---: | --- |
| 基準 | ×1.00 | ×1.00 | CO 3.6、MAP 70、DO₂ 510 |
| 輸液反応 | ×1.22 | ×1.00 | CO 4.5、MAP 84、DO₂ 620 |
| DOB反応 | ×1.40 | ×0.72 | CO 5.1、MAP 71、DO₂ 710 |

倍率は視認できる対比のために選んだ**illustrative**値です。用量ではなく、併用できず、
期待効果でもありません。以前の版は輸液でSVRも黙って下げていましたが、現在は
隠れた因果を除き、輸液反応状態ではSVRを固定しています。

#### `fixed-oxygen-content` — illustrative

Hb 10.5 g/dL、SaO₂ 97%、PaO₂ 85 mmHgを全状態で固定し、CaO₂を13.9029 mL/dLに
固定しています。そのためDO₂はCOに比例します。これは因果を1本に絞るための
**illustrative isolation**であり、輸液後の希釈や呼吸・ガス交換変化を否定しません。

### 4. 既知の弱点

#### `global-not-tissue` — uncertain

モデルには微小循環、血流分配、酸素抽出、VO₂、拡散、細胞利用がありません。
Inceのhaemodynamic coherenceの整理どおり、macrohemodynamicsの改善と組織灌流は
一致しない場合があります。global DO₂が増えた表示から「末梢循環が改善した」とは
結論できません。3Dの組織を中立色のままにしたのは、この境界を守るためです。

#### `unindexed-output` — uncertain

体表面積、体格、代謝需要がないためCOもDO₂も非補正です。画面の「低い」はこの
構築例の基準比較に限られ、cardiac indexやDO₂ indexの臨床閾値を表しません。

#### `no-treatment-harms` — uncertain

充満圧、静脈うっ血、肺水腫、不整脈、心筋酸素需要、希釈、虚血、有害事象、
介入間相互作用がありません。利益方向だけを選んだ3状態なので、治療選択・用量・
併用・安全性評価には使えません。

## 3D表現の根拠と境界

3Dの表現は外部文献から得た定量写像ではありません。

| 表現 | 読んでよいもの | 読んではいけないもの |
| --- | --- | --- |
| pink particles | 同一モデル内でのCOの相対変化 | 赤血球数、血管内の実流速、CFD |
| cyan distributed bands / distal calibre | SVRが分布した変数であること、その相対変化 | 1か所の狭窄、実測血管径、Poiseuille計算 |
| yellow cargo particles | 固定CaO₂下の計算上のglobal DO₂の相対変化 | 組織PO₂、酸素抽出、VO₂、臓器別灌流 |
| neutral tissue | このモデルは組織酸素化を計算しないこと | 組織が正常であるという所見 |

## 参考文献

1. Monnet X, et al. [ESICM guidelines on circulatory shock and hemodynamic monitoring 2025](https://pubmed.ncbi.nlm.nih.gov/41236566/). *Intensive Care Med*. 2025;51(11):1971–2012. doi:[10.1007/s00134-025-08137-z](https://doi.org/10.1007/s00134-025-08137-z). PMID: 41236566.
2. Simmons J, Ventetuolo CE. [Cardiopulmonary Monitoring of Shock](https://pmc.ncbi.nlm.nih.gov/articles/PMC5678958/). *Curr Opin Crit Care*. 2017;23(3):223–231. doi:[10.1097/MCC.0000000000000407](https://doi.org/10.1097/MCC.0000000000000407). PMID: 28398907.
3. Collins JA, Rudenski A, Gibson J, Howard L, O'Driscoll R. [Relating oxygen partial pressure, saturation and content: the haemoglobin–oxygen dissociation curve](https://pmc.ncbi.nlm.nih.gov/articles/PMC4666443/). *Breathe (Sheff)*. 2015;11(3):194–201. doi:[10.1183/20734735.001415](https://doi.org/10.1183/20734735.001415). PMID: 26632351.
4. Ince C. [Hemodynamic coherence and the rationale for monitoring the microcirculation](https://pmc.ncbi.nlm.nih.gov/articles/PMC4699073/). *Crit Care*. 2015;19(Suppl 3):S8. doi:[10.1186/cc14726](https://doi.org/10.1186/cc14726). PMID: 26729241.
5. Schneekloth S, Beske RP, Møller JE, et al. [Oxygen Delivery and Consumption in Patients Who Are Comatose After Out-of-Hospital Cardiac Arrest Are Affected by Blood Pressure Target](https://pubmed.ncbi.nlm.nih.gov/39435704/). *J Am Heart Assoc*. 2024;13(21):e037354. doi:[10.1161/JAHA.124.037354](https://doi.org/10.1161/JAHA.124.037354). PMID: 39435704.
6. Leier CV, Heban PT, Huss P, Bush CA, Lewis RP. [Comparative systemic and regional hemodynamic effects of dopamine and dobutamine in patients with cardiomyopathic heart failure](https://pubmed.ncbi.nlm.nih.gov/679437/). *Circulation*. 1978;58(3 Pt 1):466–475. doi:[10.1161/01.CIR.58.3.466](https://doi.org/10.1161/01.CIR.58.3.466). PMID: 679437. **thin: n=13、PubMed抄録のみ確認。**
7. Baker AK, Partridge RJO, Litton E, Ho KM. [Assessment of the plethysmographic variability index as a predictor of fluid responsiveness in critically ill patients: a pilot study](https://pubmed.ncbi.nlm.nih.gov/24180714/). *Anaesth Intensive Care*. 2013;41(6):736–741. doi:[10.1177/0310057X1304100608](https://doi.org/10.1177/0310057X1304100608). PMID: 24180714. **thin: n=25、PubMed抄録のみ確認。**

## この文献記録が支持しないこと

- MAP、CO、global DO₂のいずれか単独による「循環が保たれている」という診断
- 輸液・dobutamineの適応、用量、併用、反応量、反応確率、安全性、転帰
- 表示DO₂からの組織酸素化、臓器灌流、VO₂、乳酸、予後の推定
- 1つの構築例からshock phenotype全般、年齢・体格・併存症の異なる患者への一般化
