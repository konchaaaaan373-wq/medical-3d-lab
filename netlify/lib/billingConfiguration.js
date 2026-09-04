const PRICE_VARIABLES = Object.freeze([
  'STRIPE_PRICE_PATIENT',
  'STRIPE_PRICE_EDUCATION',
  'STRIPE_PRICE_COMPLETE',
]);

const hasAny = (environment, ...names) =>
  names.some((name) => typeof environment[name] === 'string' && environment[name].trim());

const BROWSER_KEY_VARIABLES = Object.freeze(['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY']);
const SERVER_KEY_VARIABLES = Object.freeze(['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);

export function stripeMode(key) {
  if (/^(?:rk|sk)_test_/.test(key ?? '')) return 'test';
  if (/^(?:rk|sk)_live_/.test(key ?? '')) return 'live';
  return 'unknown';
}

/** The mode every database lookup must be scoped to. */
export function billingStripeMode(environment = process.env) {
  const mode = stripeMode(environment.STRIPE_SECRET_KEY);
  if (mode === 'unknown') throw new Error('Missing server configuration: valid STRIPE_SECRET_KEY');
  return mode;
}

/** Signed events must still belong to the key namespace serving this deploy. */
export function stripeEventMatchesDeployment(event, environment = process.env) {
  const mode = billingStripeMode(environment);
  return Boolean(event?.livemode) === (mode === 'live');
}

/** Fixed grace from the first failed payment; retries never extend it. */
export function billingPastDueGraceDays(environment = process.env) {
  const parsed = Number.parseInt(environment.BILLING_PAST_DUE_GRACE_DAYS ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 7;
  return Math.min(parsed, 30);
}

export function stripeDeploymentSafety(
  environment = process.env,
  deployContext = environment.CONTEXT ?? ''
) {
  const mode = stripeMode(environment.STRIPE_SECRET_KEY);
  const issues = [];
  if (!environment.STRIPE_SECRET_KEY) issues.push('missing_stripe_key');
  else if (mode === 'unknown') issues.push('invalid_stripe_key');
  if (deployContext === 'production' && mode === 'test') issues.push('test_key_in_production');
  if (deployContext && deployContext !== 'production' && mode === 'live') {
    issues.push('live_key_outside_production');
  }
  return Object.freeze({ mode, safe: issues.length === 0, issues: Object.freeze(issues) });
}

function validSupabaseUrl(value, context) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return !context && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Validates billing configuration without returning secret values.
 *
 * Presence alone is not sufficient for a paid deployment: this also prevents
 * test keys in Production, live keys in preview builds, malformed identifiers,
 * and accidentally reusing one Price for more than one entitlement.
 */
function operationConfiguration(
  environment = process.env,
  deployContext = environment.CONTEXT ?? '',
  {
    requireBrowserKey = false,
    requireServerKey = false,
    requireWebhook = false,
    requirePrices = false,
  } = {}
) {
  const requiredVariables = [
    'SUPABASE_URL',
    'STRIPE_SECRET_KEY',
    ...(requireWebhook ? ['STRIPE_WEBHOOK_SECRET'] : []),
    ...(requirePrices ? PRICE_VARIABLES : []),
  ];
  const missing = requiredVariables.filter(
    (name) => typeof environment[name] !== 'string' || !environment[name].trim()
  );
  if (requireBrowserKey && !hasAny(environment, ...BROWSER_KEY_VARIABLES)) {
    missing.push('SUPABASE_PUBLISHABLE_KEY_OR_ANON_KEY');
  }
  if (requireServerKey && !hasAny(environment, ...SERVER_KEY_VARIABLES)) {
    missing.push('SUPABASE_SECRET_KEY_OR_SERVICE_ROLE_KEY');
  }

  const issues = [];
  const stripe = stripeDeploymentSafety(environment, deployContext);

  if (
    !missing.includes('SUPABASE_URL') &&
    !validSupabaseUrl(environment.SUPABASE_URL, deployContext)
  ) {
    issues.push('invalid_supabase_url');
  }
  issues.push(...stripe.issues);

  if (
    requireWebhook &&
    !missing.includes('STRIPE_WEBHOOK_SECRET') &&
    !/^whsec_[A-Za-z0-9_]+$/.test(environment.STRIPE_WEBHOOK_SECRET)
  ) {
    issues.push('invalid_webhook_secret');
  }

  if (requirePrices) {
    const priceIds = PRICE_VARIABLES.map((name) => environment[name]).filter(Boolean);
    if (priceIds.some((priceId) => !/^price_[A-Za-z0-9]+$/.test(priceId))) {
      issues.push('invalid_price_id');
    }
    if (priceIds.length === PRICE_VARIABLES.length && new Set(priceIds).size !== priceIds.length) {
      issues.push('duplicate_price_id');
    }
  }

  const publishableKey = environment.SUPABASE_PUBLISHABLE_KEY || environment.SUPABASE_ANON_KEY;
  const serverKey = environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY;
  if (publishableKey && serverKey && publishableKey === serverKey) {
    issues.push('supabase_server_key_is_publishable');
  }

  return Object.freeze({
    configured: missing.length === 0 && issues.length === 0,
    mode: stripe.mode,
    missing: Object.freeze([...missing]),
    issues: Object.freeze(issues),
  });
}

/** Complete commerce configuration used by readiness/Checkout health gates. */
export function billingConfiguration(
  environment = process.env,
  deployContext = environment.CONTEXT ?? ''
) {
  return operationConfiguration(environment, deployContext, {
    requireBrowserKey: true,
    requireServerKey: true,
    requireWebhook: true,
    requirePrices: true,
  });
}

/** Minimum safe dependencies for self-service cancellation/payment recovery. */
export function billingPortalConfiguration(
  environment = process.env,
  deployContext = environment.CONTEXT ?? ''
) {
  return operationConfiguration(environment, deployContext, {
    requireBrowserKey: true,
    requireServerKey: true,
  });
}

/** Repair must remain available while the normal webhook path is broken. */
export function billingReconciliationConfiguration(
  environment = process.env,
  deployContext = environment.CONTEXT ?? ''
) {
  return operationConfiguration(environment, deployContext, {
    requireServerKey: true,
    requirePrices: true,
  });
}

/** Webhook processing has no browser-key dependency. */
export function billingWebhookConfiguration(
  environment = process.env,
  deployContext = environment.CONTEXT ?? ''
) {
  return operationConfiguration(environment, deployContext, {
    requireServerKey: true,
    requireWebhook: true,
    requirePrices: true,
  });
}
