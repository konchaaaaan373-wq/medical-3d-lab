# Deploy Preview billing test

This checklist exists to keep Stripe test/sandbox values out of the production deployment while the billing flow is being validated.

## Netlify context

For PR billing tests, Stripe secrets and Price IDs must be scoped to **Deploy Previews**. Production can later use the same environment-variable names with live values.

The Supabase project may be shared during initial validation. `VITE_SUPABASE_*` values are build-time variables, so changing them requires a new Deploy Preview build; changing only the Netlify environment-variable record does not rewrite an already-built Vite bundle.

## Test sequence

1. Rebuild the PR Deploy Preview after environment-variable changes.
2. Confirm the accurate free 3D model still opens without an account.
3. Create/sign in to a Supabase account.
4. Open a locked Patient or Education feature.
5. Complete Stripe test Checkout.
6. Confirm the webhook writes current subscription state to Supabase and the entitlement unlocks.
7. Use Customer Portal to test plan change and cancellation.
8. Confirm terminal/non-paying subscription states no longer grant paid access according to `src/access/policy.js`.

Never commit Stripe secrets, Supabase server secrets, or webhook signing secrets to this repository.
