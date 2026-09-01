/**
 * Terms, privacy, commercial disclosure and support — as data.
 *
 * Written the way every other piece of copy in this project is written: as
 * data, so the rendering code carries no prose and so a test can hold the text
 * to what the code actually does. That last part matters more here than
 * anywhere else in the product. A privacy policy is a factual claim about
 * software; if it drifts from the software it stops being a policy and becomes
 * a misstatement.
 *
 * Two claims in `privacy` are therefore checked by `tests/legal.test.js`
 * against the implementation rather than trusted:
 *
 *   - that nothing is transmitted before consent is granted, and
 *   - that no identifier survives a page load.
 *
 * The commercial disclosure is assembled from `operator.js`, whose fields are
 * `null` until a real seller fills them in. Missing entries are shown as
 * missing; nothing about a business is invented here.
 *
 * Bilingual, Japanese first, like the rest of the product.
 */
import { OPERATOR, operatorGaps } from './operator.js';
import { LEGAL_SLUGS } from './legalRoutes.js';

export const LEGAL_UPDATED = '2026-09-01';

/** @typedef {{ headingJa: string, headingEn: string, bodyJa: string[], bodyEn: string[] }} LegalSection */

const TERMS = {
  id: 'terms',
  slug: 'terms',
  titleJa: '利用規約',
  titleEn: 'Terms of use',
  leadJa: '本サービスの利用条件です。ご利用前にお読みください。',
  leadEn: 'The conditions under which this service may be used. Please read before using it.',
  sections: [
    {
      headingJa: '1. 本サービスの性質',
      headingEn: '1. What this service is',
      bodyJa: [
        'Medical 3D Lab（以下「本サービス」）は、病態生理を理解するための教育目的の 3D 可視化ツールです。',
        '本サービスが提示するモデル・数値・グラフ・教材は、いずれも教育用の概念モデルから導かれたものであり、個別の患者に対する診断・治療方針の決定・予後予測を行うものではありません。臨床判断には使用しないでください。',
        '各モデルの成熟度と臨床レビューの状態は、製品内の「医学的信頼性」ページで確認できます。レビュー済みであることは、そのモデルが完全であることを意味しません。',
      ],
      bodyEn: [
        'Medical 3D Lab is an educational 3D visualisation tool for understanding physiology and disease.',
        'Every model, number, plot and lesson it shows derives from an educational conceptual model. It does not diagnose, select treatment for, or predict outcomes for an individual patient, and must not be used for clinical decisions.',
        'The maturity and clinical-review state of each model is published on the in-product Trust page. "Reviewed" does not mean complete.',
      ],
    },
    {
      headingJa: '2. アカウントと有料機能',
      headingEn: '2. Accounts and paid capabilities',
      bodyJa: [
        '一部のモデルと機能は無料で、患者説明モードおよび教育ガイドは有料プランの対象です。無料で公開されているモデルは、アカウントなしで利用できます。',
        'アカウントの認証情報を第三者と共有しないでください。共有された利用が確認された場合、当該アカウントの利用を停止することがあります。',
        'アカウントはいつでも削除できます。削除するとサブスクリプションは解約され、保存された学習進捗も削除されます。',
      ],
      bodyEn: [
        'Some models and capabilities are free; the Patient presenter and the Education guide are part of a paid plan. Anything published as free is usable without an account.',
        'Do not share account credentials. Shared use may result in the account being suspended.',
        'An account can be deleted at any time. Deleting it cancels the subscription and removes stored learning progress.',
      ],
    },
    {
      headingJa: '3. 禁止事項',
      headingEn: '3. What you may not do',
      bodyJa: [
        '本サービスの出力を、臨床上の意思決定の根拠として提示すること。',
        '本サービスの表示を改変し、あるいは文脈を除いて引用して、実際より高い精度・臨床的裏付けがあるかのように示すこと。',
        '本サービスへの自動化されたアクセスにより、他の利用者の利用を妨げること。',
      ],
      bodyEn: [
        'Presenting output from this service as the basis for a clinical decision.',
        'Altering what it displays, or quoting it without its context, so as to suggest more precision or more clinical backing than it claims.',
        'Automated access that degrades the service for other users.',
      ],
    },
    {
      headingJa: '4. 免責',
      headingEn: '4. Limitation of liability',
      bodyJa: [
        '本サービスは現状有姿で提供されます。教育目的の範囲を超える利用によって生じた結果について、運営者は責任を負いません。',
        '本サービスの内容は予告なく変更されることがあります。医学的な記述の変更は、モデルカードと証拠パッケージに記録されます。',
      ],
      bodyEn: [
        'The service is provided as it is. The operator is not liable for consequences of use beyond its educational scope.',
        'Content may change without notice. Changes to medical claims are recorded in the model cards and evidence dossiers.',
      ],
    },
    {
      headingJa: '5. 準拠法',
      headingEn: '5. Governing law',
      bodyJa: ['本規約は日本法に準拠します。'],
      bodyEn: ['These terms are governed by the law of Japan.'],
    },
  ],
};

const PRIVACY = {
  id: 'privacy',
  slug: 'privacy',
  titleJa: 'プライバシーポリシー',
  titleEn: 'Privacy',
  leadJa: '何を取得し、何を取得しないかを、実装に一致する形で記載します。',
  leadEn: 'What is collected and what is not, stated to match the implementation.',
  sections: [
    {
      headingJa: '1. 利用状況の記録は同意が前提です',
      headingEn: '1. Usage data requires consent first',
      bodyJa: [
        '利用状況の記録は、同意していただくまで一切送信されません。同意前の記録はブラウザのメモリ上にのみ存在し、「許可しない」を選んだ時点で破棄されます。破棄されたものが後から送信されることはありません。',
        '送信されるのは、どのモデルが開かれたか、読み込みが成功したか、フレームレートの品質段階が下がったか、エラーが起きたか、といった項目です。',
        '同意はいつでも取り消せます。取り消すと、ブラウザに保存されている同意の記録と訪問日数の記録も削除されます。',
      ],
      bodyEn: [
        'Nothing about how the product is used is transmitted until you allow it. What is gathered before you answer exists only in browser memory, and choosing "No thanks" destroys it; a later change of mind cannot resurrect it.',
        'What is sent: which models were opened, whether loading succeeded, whether the frame budget forced a quality change, and whether an error occurred.',
        'Consent can be withdrawn at any time. Withdrawing it also deletes the stored consent answer and the local visit count.',
      ],
    },
    {
      headingJa: '2. 個人を追跡する識別子を持ちません',
      headingEn: '2. No identifier that follows you',
      bodyJa: [
        '利用状況の記録に、ページ読み込みを越えて残る識別子は含まれません。1 回の読み込みをまとめるための一時的な参照値は毎回作り直され、保存されません。',
        '再訪の把握は、ブラウザ自身が自分の利用日数を数え、「初回 / 再訪 / 常用」のいずれか 1 語だけを送る方法で行います。サイトデータを消せば「初回」に戻ります。',
        '広告目的の利用、プロフィールの作成、セッション録画、ヒートマップ、第三者の解析タグは、いずれも使用していません。',
      ],
      bodyEn: [
        'Usage data contains no identifier that outlives a page load. The reference that groups one load is regenerated every time and never stored.',
        'Return visits are counted by the browser itself, locally, and reported as one of three words — first, returning, regular. Clearing site data resets it to "first".',
        'There is no advertising use, no profile, no session recording, no heatmap and no third-party analytics tag.',
      ],
    },
    {
      headingJa: '3. エラー報告',
      headingEn: '3. Error reports',
      bodyJa: [
        'エラー報告は、送信前に自動的に伏せ字化されます。認証トークン、メールアドレス、識別子、長い数字列、IP アドレス、開発者のファイルパスは、いずれも除去されます。',
        '本サービスの認証・パスワード再設定のトークンは URL のフラグメントに現れるため、URL は経路部分のみを残し、それ以外は送信しません。',
      ],
      bodyEn: [
        'Error reports are redacted before they are sent: authentication tokens, email addresses, identifiers, long digit runs, IP addresses and developer file paths are all removed.',
        'This app receives its authentication and password-recovery tokens in the URL fragment, so only the route part of a URL is kept and nothing else is transmitted.',
      ],
    },
    {
      headingJa: '4. アカウントと決済',
      headingEn: '4. Account and payment',
      bodyJa: [
        'アカウントを作成した場合、メールアドレスと認証状態が認証基盤（Supabase）に保存されます。パスワードは当方では保持しません。',
        '決済は Stripe が処理します。カード番号が本サービスのサーバーを通過することはありません。当方が保持するのは、サブスクリプションの状態と、それに対応する利用権のみです。',
        'アカウントを削除すると、サブスクリプションを解約したうえでアカウント情報を削除します。',
      ],
      bodyEn: [
        'If you create an account, your email address and authentication state are held by the authentication provider (Supabase). Passwords are not held by this service.',
        'Payment is processed by Stripe. Card details never pass through this service. What is retained is the subscription state and the entitlement it grants.',
        'Deleting an account cancels the subscription and then removes the account record.',
      ],
    },
    {
      headingJa: '5. ブラウザに保存されるもの',
      headingEn: '5. What is stored in your browser',
      bodyJa: [
        '表示言語、最近開いたモデル、教育ガイドの進捗、利用状況記録への同意、訪問日数。いずれも端末内に留まり、当方へ送信されません（同意した場合の「初回 / 再訪 / 常用」の 1 語を除く）。',
        'プライベートブラウジング等で保存が拒否された場合も、本サービスは動作します。',
      ],
      bodyEn: [
        'Display language, recently opened models, education-guide progress, the telemetry consent answer, and the visit count. All of it stays on the device and none of it is transmitted — with the single exception of the one-word visit bucket, and only with consent.',
        'The service works when a browser refuses storage, as private browsing modes do.',
      ],
    },
    {
      headingJa: '6. 患者の情報を入力しないでください',
      headingEn: '6. Do not enter patient information',
      bodyJa: [
        '本サービスは患者個別のデータを扱う設計ではありません。フィードバックフォームを含め、患者を特定できる情報を入力しないでください。',
      ],
      bodyEn: [
        'This service is not designed to hold data about an individual patient. Please do not enter patient-identifying information anywhere, including the feedback form.',
      ],
    },
  ],
};

const SUPPORT = {
  id: 'support',
  slug: 'support',
  titleJa: 'サポート・お問い合わせ',
  titleEn: 'Support',
  leadJa: '不具合、医学的な誤り、請求に関するお問い合わせの窓口です。',
  leadEn: 'Where to report a defect, a medical error, or a billing question.',
  sections: [
    {
      headingJa: '医学的な誤りの報告',
      headingEn: 'Reporting a medical error',
      bodyJa: [
        '最も重要な報告です。製品内の「ご意見」から「医学的に誤っている」を選んで送信してください。どのモデルの、どの段階で、何が誤っているかを書いていただけると、モデル層まで遡って確認できます。',
        '報告内容は証拠パッケージ（evidence dossier）の更新として記録され、必要に応じてモデルカードの改訂につながります。',
      ],
      bodyEn: [
        'This is the most valuable report we receive. Use the in-product Feedback button and choose "Something is medically wrong". Naming the model, the stage and what is wrong lets us trace it back to the model layer.',
        'Such reports are recorded as evidence-dossier updates and, where needed, lead to a model-card revision.',
      ],
    },
    {
      headingJa: '不具合の報告',
      headingEn: 'Reporting a defect',
      bodyJa: [
        '3D が表示されない場合は、表示されている代替画面からそのまま「ご意見」を送信できます。ブラウザ名とバージョン、端末の種類を添えてください。',
      ],
      bodyEn: [
        'If the 3D view does not start, the fallback screen it shows carries the same Feedback button. Please include your browser, its version and the kind of device.',
      ],
    },
    {
      headingJa: '請求に関するお問い合わせ',
      headingEn: 'Billing questions',
      bodyJa: [
        '解約・支払方法の変更・領収書は、アカウント画面の決済ポータルから行えます。',
        '解約は次回更新日から有効になり、それまでは有料機能を利用できます。即時解約を希望される場合はお問い合わせください。',
      ],
      bodyEn: [
        'Cancellation, payment-method changes and receipts are handled in the billing portal, reachable from the Account panel.',
        'A cancellation takes effect at the next renewal date, and paid capabilities remain available until then. Contact us if you need an immediate cancellation.',
      ],
    },
  ],
};

/**
 * The rows of the 特定商取引法 disclosure.
 *
 * Every row that depends on a fact about the seller is marked `missing` until
 * `operator.js` carries it. The page shows the gap rather than filling it.
 *
 * @param {typeof OPERATOR} [operator]
 */
export function commerceRows(operator = OPERATOR) {
  // A row is complete when it says something — either a value, or a note that
  // is itself the answer ("disclosed on request", "shown on the purchase
  // screen"). Only a row with neither is a gap in the disclosure.
  const row = (labelJa, labelEn, value, note = null) => {
    const stated = typeof value === 'string' && value.trim() !== '';
    return { labelJa, labelEn, value: stated ? value : null, missing: !stated && !note, note };
  };

  return [
    row('販売業者', 'Seller', operator.legalName),
    row('運営統括責任者', 'Responsible person', operator.representative),
    row('所在地', 'Address', operator.address),
    row('連絡先', 'Contact', operator.contactEmail),
    row(
      '電話番号',
      'Telephone',
      operator.contactPhone,
      operator.contactPhone
        ? null
        : {
            ja: '請求があった場合、遅滞なく開示します。',
            en: 'Disclosed without delay on request.',
          }
    ),
    row('販売価格', 'Price', null, {
      ja: '各プランの価格は購入画面に税込で表示されます。表示価格が支払額です。',
      en: 'Each plan price is shown, tax included, on the purchase screen. The displayed price is what is charged.',
    }),
    row('商品代金以外の必要料金', 'Additional charges', 'なし（通信料はお客様負担）', {
      ja: 'インターネット接続料金はお客様のご負担となります。',
      en: 'Your own internet connection charges are not included.',
    }),
    row('支払方法', 'Payment method', 'クレジットカード（Stripe）', null),
    row('支払時期', 'When payment is taken', '購入時、以後は各更新日に自動課金', null),
    row('役務の提供時期', 'When the service is provided', '決済完了後ただちに利用可能', null),
    row('解約・返品', 'Cancellation and refunds', null, {
      ja: 'デジタルサービスの性質上、提供開始後の返金は原則としてお受けできません。解約はいつでも可能で、次回更新日から有効になります。それまでは有料機能をご利用いただけます。',
      en: 'Because the service is delivered immediately, refunds after provision are not generally available. Cancellation is possible at any time and takes effect at the next renewal date; paid capabilities remain available until then.',
    }),
    row('動作環境', 'Requirements', 'WebGL に対応した最新のブラウザ', {
      ja: '3D 表示ができない環境でも、モデルの説明・出典・適用範囲は閲覧できます。',
      en: 'Where 3D cannot start, the description, sources and scope of each model remain readable.',
    }),
  ];
}

const COMMERCE = {
  id: 'commerce',
  slug: 'commerce',
  titleJa: '特定商取引法に基づく表記',
  titleEn: 'Commercial disclosure',
  leadJa: '特定商取引法第 11 条に基づく表示です。',
  leadEn: 'Disclosure required of a seller under Japan’s Act on Specified Commercial Transactions.',
  sections: [],
  /** Rendered as a table rather than prose. */
  rows: commerceRows,
};

export const LEGAL_DOCUMENTS = [TERMS, PRIVACY, COMMERCE, SUPPORT];

export { LEGAL_SLUGS };

/** @param {string} slug */
export const legalDocument = (slug) => LEGAL_DOCUMENTS.find((doc) => doc.slug === slug) ?? null;

/**
 * Everything structurally wrong with the legal surface, as readable lines.
 *
 * Returned rather than thrown, in the same shape as `validateCatalog`, so the
 * test suite and a release check can use the same function.
 *
 * @param {typeof OPERATOR} [operator]
 */
export function validateLegal(operator = OPERATOR) {
  const problems = [];
  const seen = new Set();

  // The routed slugs and the authored documents are declared in two files for
  // bundle reasons; a document that exists without a route, or a route with no
  // document behind it, is a defect in that split.
  for (const slug of LEGAL_SLUGS) {
    if (!LEGAL_DOCUMENTS.some((doc) => doc.slug === slug)) {
      problems.push(`routed slug "${slug}" has no document`);
    }
  }
  for (const doc of LEGAL_DOCUMENTS) {
    const where = `legal document "${doc.id}"`;
    if (!LEGAL_SLUGS.includes(doc.slug)) problems.push(`${where}: slug is not routed`);
    if (seen.has(doc.slug)) problems.push(`${where}: duplicate slug`);
    seen.add(doc.slug);
    if (!doc.titleJa || !doc.titleEn) problems.push(`${where}: needs a title in both languages`);
    if (!doc.leadJa || !doc.leadEn) problems.push(`${where}: needs a lead in both languages`);
    if (!doc.rows && doc.sections.length === 0) problems.push(`${where}: has no content`);
    for (const section of doc.sections) {
      if (!section.headingJa || !section.headingEn) problems.push(`${where}: a section is missing a heading`);
      if (section.bodyJa.length === 0 || section.bodyEn.length === 0) {
        problems.push(`${where}: section "${section.headingEn}" is empty in one language`);
      }
    }
  }

  for (const gap of operatorGaps(operator)) {
    problems.push(`commercial disclosure: "${gap}" is not published`);
  }

  return problems;
}
