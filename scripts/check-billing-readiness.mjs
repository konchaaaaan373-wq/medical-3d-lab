const suppliedUrl = process.argv[2] || process.env.DEPLOY_PRIME_URL || process.env.URL;

if (!suppliedUrl) {
  console.error('Usage: npm run billing:check -- https://your-deployment.example');
  process.exitCode = 2;
} else {
  const origin = new URL(suppliedUrl).origin;
  const checks = [
    ['Commerce gate', '/.netlify/functions/billing-status', (body) => body.billingConfigured === true],
    [
      'Stripe prices',
      '/.netlify/functions/plan-catalog',
      (body) => body.billingConfigured === true && body.commerceReady === true,
    ],
    [
      'Billing repair',
      '/api/billing-health',
      (body) => body.status === 'ok',
    ],
  ];

  const results = await Promise.all(
    checks.map(async ([name, path, validate]) => {
      try {
        const response = await fetch(`${origin}${path}`, {
          signal: AbortSignal.timeout(10_000),
          headers: { Accept: 'application/json' },
        });
        const body = await response.json();
        return {
          name,
          ok: response.ok && validate(body),
          status: response.status,
          state: body.status ?? null,
        };
      } catch {
        return { name, ok: false, status: 'unreachable', state: null };
      }
    })
  );

  console.table(results);
  if (results.some((result) => !result.ok)) {
    console.error('Billing is not production-ready. Follow docs/billing-operations-runbook.md.');
    process.exitCode = 1;
  } else {
    console.log('Billing configuration, live plan catalogue, and automated repair are healthy.');
  }
}
