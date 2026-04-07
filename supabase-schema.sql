create table if not exists public.customer_onboarding (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  customer_email text,
  customer_name text,
  onboarding_status text not null default 'paid-awaiting-onboarding',
  facebook_user_id text,
  facebook_user_name text,
  facebook_page_count integer,
  facebook_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

 drop trigger if exists customer_onboarding_set_updated_at on public.customer_onboarding;
create trigger customer_onboarding_set_updated_at
before update on public.customer_onboarding
for each row
execute function public.set_updated_at();

alter table public.customer_onboarding enable row level security;
