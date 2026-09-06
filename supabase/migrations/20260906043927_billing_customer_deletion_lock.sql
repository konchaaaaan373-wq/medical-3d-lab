-- Prevent a Stripe Customer created concurrently with account deletion from
-- becoming associated with personal data after deletion has started.
--
-- `billingCustomerFor` creates an anonymous Customer first, then writes the
-- durable ownership row, and only then adds the email and app metadata. This
-- trigger makes that ownership write mutually exclusive with the deletion
-- marker. At worst a losing Checkout leaves an inert anonymous provider object;
-- it cannot leave a charge, subscription, email address or app identity behind.

drop trigger if exists billing_customers_block_account_deletion
  on public.billing_customers;

create trigger billing_customers_block_account_deletion
before insert or update on public.billing_customers
for each row execute function public.block_checkout_during_account_deletion();
