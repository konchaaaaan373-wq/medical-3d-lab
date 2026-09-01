# Model evidence — 循環、保たれてる？

- Implementation: [`src/models/circulation.js`](../../src/models/circulation.js)
- 医学的な境界: [`docs/medical-notes.md`](../medical-notes.md#循環保たれてる最小循環モデル)
- Tests: [`tests/circulation-model.test.js`](../../tests/circulation-model.test.js)
最終確認日: **2026-09-01**

> **Status: prototype.** この文書は、現時点のプロトタイプで参照した文献と、
> 文献から採用した部分／リポジトリ側で置いた部分を記録するものです。
> 文献の患者群や投与量を再現する臨床シミュレーターではなく、この文書を追加しても
> シーンの status は `prototype` のままです。

## 文献をどう確認したか

- Collins et al. と Simmons & Ventetuolo は PMC の全文を確認しました。
- Schneekloth et al. は PubMed/PMC の書誌情報、抄録、および計算式を確認しました。
- Leier et al. と Baker et al. は PubMed 抄録までを確認し、本文の表・図から
  数値を抽出していません。
- 下記の文献は**関係の定義または変化の方向**にだけ使っています。ベースライン値、
  ボタン1段階あたりの変化量、飽和関数の係数を文献から較正したものではありません。

## Claim → Source → Implementation → Assumption → Validation

### 1. 心拍出量は心拍数と1回拍出量の積

| | |
| --- | --- |
| **Claim** | `CO = HR × SV / 1000`。HR [/min] と SV [mL/beat] から CO [L/min] を得ます。 |
| **Source** | Simmons & Ventetuolo (2017) は CO が HR と SV の積であることを整理しています。これは標準的な血行動態の定義です。 |
| **Implementation** | `cardiacOutput()`。 |
| **Assumption** | 拍動ごとの変動、呼吸性変動、不整脈を持たない全身平均の lumped model です。 |
| **Validation** | `circulation definitions preserve their clinical units`。 |

### 2. MAP は CO だけでは決まらない

| | |
| --- | --- |
| **Claim** | 本モデルでは `MAP = CVP + CO × SVR / 80` とし、同じ MAP でも CO と SVR の組み合わせは異なり得ます。 |
| **Source** | Simmons & Ventetuolo (2017) は CO と SVR が血圧を規定すること、単一の血圧値だけで各臓器の灌流を保証できないことを整理しています。式は定常流に対する圧較差＝流量×抵抗の lumped relation で、80 は Wood unit と dyn·s·cm⁻⁵ の換算です。 |
| **Implementation** | ベースライン CO と CVP から、MAP が 70 mmHg になる SVR を逆算しています。 |
| **Assumption** | CVP は 6 mmHg に固定し、動脈コンプライアンス、脈圧、局所灌流、自動調節、微小循環を実装していません。ベースラインの MAP 70 と高 SVR は**この症例を成立させるための calibration**です。 |
| **Validation** | `the constructed case has MAP 70 despite low flow`。 |

### 3. CaO₂ と DO₂ の計算

| | |
| --- | --- |
| **Claim** | `CaO₂ = 1.34 × Hb × SaO₂ + 0.003 × PaO₂` [mL O₂/dL]、`DO₂ = CO × 10 × CaO₂` [mL O₂/min]。 |
| **Source** | Collins et al. (2015) は酸素含量が主に Hb 結合酸素で決まり、組織への酸素供給が動脈血酸素含量と CO の積であることを解説しています。Schneekloth et al. (2024) は臨床研究で `DO₂ = CO × arterial oxygen content` として計算しています。 |
| **Implementation** | `arterialOxygenContent()` と `oxygenDelivery()`。10 は L と dL の換算です。 |
| **Assumption** | Hb 10.5 g/dL、SaO₂ 97%、PaO₂ 85 mmHg を固定しています。係数 1.34 は採用した慣用値であり、異常 Hb、COHb/MetHb、温度・pH、酸素解離曲線の移動は扱いません。表示する DO₂ は全身の**計算上の global delivery**で、実測した組織酸素化ではありません。 |
| **Validation** | `circulation definitions preserve their clinical units`、`fluid raises flow and DO2 in the explicitly responsive case`。 |

### 4. MAP 70 でも DO₂ が十分とは限らない、という教材上の問い

| | |
| --- | --- |
| **Claim** | MAP が保たれて見えても、CO と CaO₂ を別に見なければ global DO₂ は分かりません。 |
| **Source** | Simmons & Ventetuolo (2017) の圧・流量・抵抗の整理と、Collins et al. (2015)／Schneekloth et al. (2024) の DO₂ の定義を組み合わせた推論です。単一論文の患者データを再現した主張ではありません。 |
| **Implementation** | CO 3.648 L/min、MAP 70 mmHg、固定 CaO₂ から DO₂ 約 507 mL O₂/min となる単一症例を構成しています。 |
| **Assumption** | このベースラインは**illustrative calibration**です。「DO₂ 507 が全患者で不足」という閾値主張はしていません。VO₂、酸素抽出率、SvO₂、乳酸、臓器別血流、微小循環がないため、実際に組織が低酸素かどうかは判定できません。 |
| **Validation** | `the constructed case has MAP 70 despite low flow`。 |

### 5. DOB ボタンの変化方向

| | |
| --- | --- |
| **Claim** | この症例では DOB により SV と CO が増え、SVR が下がる方向を示します。 |
| **Source** | Leier et al. (1978)。重症心不全13例の crossover study で、dobutamine 2.5–10 μg/kg/min により SV/CO が増加し、SVR・PVR・PCWP が低下したと PubMed 抄録に記載されています。 |
| **Implementation** | `dobutamineResponse` に応じて SV と HR を増やし、SVR を下げます。効果は3段階で飽和します。 |
| **Assumption** | ボタンの段階は投与量ではなく、増減幅はすべて**illustrative**です。Leier et al. では同用量域で HR は変化しなかったため、本モデルの小さな HR 上昇は同論文に基づきません。患者背景、併用薬、右心機能、不整脈、心筋酸素需要、有害事象も扱いません。 |
| **Validation** | `dobutamine improves flow while resistance falls in this case`。 |

### 6. 輸液ボタンは「輸液反応性あり」の症例だけ

| | |
| --- | --- |
| **Claim** | 前負荷反応性がある患者では、輸液後に SV/CO が増えることがあります。しかし全患者が反応するわけではありません。 |
| **Source** | Baker et al. (2013)。人工呼吸・noradrenaline 使用中の重症患者25例で、500 mL colloid 後に SV が15%を超えて増えたものを responder と定義し、該当は12例（48%）でした。これは PubMed 抄録からの情報です。 |
| **Implementation** | シーンは responder 側だけを選び、`fluidResponse` に応じて SV を増やします。 |
| **Assumption** | ボタン1回は 500 mL を意味しません。SV の増加量、逓減、同時に置いた SVR 低下はすべて**illustrative**で、この文献から較正していません。CVP、充満圧、肺水腫、静脈うっ血、fluid tolerance は変化させていないため、輸液適応や安全性の判断には使えません。 |
| **Validation** | `fluid raises flow and DO2 in the explicitly responsive case`。 |

### 7. 3D 表現

| | |
| --- | --- |
| **Claim** | 心拍、粒子速度、圧リング、末梢組織の発光は、CO・MAP・DO₂ の変化を触って読み取るための表現です。 |
| **Source** | **No external source.** 視認性のためにこのリポジトリで選んだ演出です。 |
| **Implementation** | `CirculationScene.js` が同一 state の値を表示用レンジへ写像します。 |
| **Assumption** | 粒子は赤血球数や実流速、リングは血管壁応力、発光は組織 PO₂ を表しません。すべて**illustrative**です。 |
| **Validation** | `the scene exposes exactly two actions and three read-outs`。 |

## 参考文献

1. Simmons J, Ventetuolo CE. [Cardiopulmonary Monitoring of Shock](https://pmc.ncbi.nlm.nih.gov/articles/PMC5678958/). *Curr Opin Crit Care*. 2017;23(3):223–231. doi:[10.1097/MCC.0000000000000407](https://doi.org/10.1097/MCC.0000000000000407). PMID: 28398907.
2. Collins JA, Rudenski A, Gibson J, Howard L, O'Driscoll R. [Relating oxygen partial pressure, saturation and content: the haemoglobin–oxygen dissociation curve](https://pmc.ncbi.nlm.nih.gov/articles/PMC4666443/). *Breathe (Sheff)*. 2015;11(3):194–201. doi:[10.1183/20734735.001415](https://doi.org/10.1183/20734735.001415). PMID: 26632351.
3. Schneekloth S, Beske RP, Møller JE, et al. [Oxygen Delivery and Consumption in Patients Who Are Comatose After Out-of-Hospital Cardiac Arrest Are Affected by Blood Pressure Target](https://pubmed.ncbi.nlm.nih.gov/39435704/). *J Am Heart Assoc*. 2024;13(21):e037354. doi:[10.1161/JAHA.124.037354](https://doi.org/10.1161/JAHA.124.037354). PMID: 39435704.
4. Leier CV, Heban PT, Huss P, Bush CA, Lewis RP. [Comparative systemic and regional hemodynamic effects of dopamine and dobutamine in patients with cardiomyopathic heart failure](https://pubmed.ncbi.nlm.nih.gov/679437/). *Circulation*. 1978;58(3 Pt 1):466–475. doi:[10.1161/01.CIR.58.3.466](https://doi.org/10.1161/01.CIR.58.3.466). PMID: 679437.
5. Baker AK, Partridge RJO, Litton E, Ho KM. [Assessment of the plethysmographic variability index as a predictor of fluid responsiveness in critically ill patients: a pilot study](https://pubmed.ncbi.nlm.nih.gov/24180714/). *Anaesth Intensive Care*. 2013;41(6):736–741. doi:[10.1177/0310057X1304100608](https://doi.org/10.1177/0310057X1304100608). PMID: 24180714.

## この文献記録が支持しないこと

- MAP、CO、DO₂ のいずれか単独による「循環が保たれている」という診断
- DOB や輸液の投与量、反応量、適応、優劣、安全性、転帰の予測
- DO₂ の表示値からの臓器灌流、細胞利用、VO₂、予後の推定
- この単一概念症例から、敗血症・心原性・出血性などの shock phenotype 全般への一般化
