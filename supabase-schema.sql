create table if not exists public.customer_onboarding (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  customer_email text,
  customer_name text,
  onboarding_status text not null default 'paid-awaiting-onboarding',
  business_name text,
  business_type text,
  service_area text,
  primary_services text[],
  contact_phone text,
  website_url text,
  facebook_page_url text,
  offer_summary text,
  differentiators text,
  brand_tone text,
  audience_notes text,
  business_profile_completed_at timestamptz,
  first_post_draft_headline text,
  first_post_draft_body text,
  first_post_draft_call_to_action text,
  first_post_draft_hashtags text[],
  first_post_draft_generated_at timestamptz,
  draft_batch_json text,
  draft_batch_generated_at timestamptz,
  draft_generation_method text,
  weekly_review_summary text,
  weekly_candidate_count integer,
  facebook_user_id text,
  facebook_user_name text,
  facebook_page_count integer,
  facebook_selected_page_id text,
  facebook_selected_page_name text,
  facebook_page_access_token text,
  facebook_page_selected_at timestamptz,
  facebook_connected_at timestamptz,
  facebook_long_lived_user_access_token text,
  facebook_long_lived_user_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_onboarding
  add column if not exists business_name text,
  add column if not exists business_type text,
  add column if not exists service_area text,
  add column if not exists primary_services text[],
  add column if not exists contact_phone text,
  add column if not exists website_url text,
  add column if not exists facebook_page_url text,
  add column if not exists offer_summary text,
  add column if not exists differentiators text,
  add column if not exists brand_tone text,
  add column if not exists audience_notes text,
  add column if not exists business_profile_completed_at timestamptz,
  add column if not exists first_post_draft_headline text,
  add column if not exists first_post_draft_body text,
  add column if not exists first_post_draft_call_to_action text,
  add column if not exists first_post_draft_hashtags text[],
  add column if not exists first_post_draft_generated_at timestamptz,
  add column if not exists draft_batch_json text,
  add column if not exists draft_batch_generated_at timestamptz,
  add column if not exists draft_generation_method text,
  add column if not exists weekly_review_summary text,
  add column if not exists weekly_candidate_count integer,
  add column if not exists facebook_selected_page_id text,
  add column if not exists facebook_selected_page_name text,
  add column if not exists facebook_page_access_token text,
  add column if not exists facebook_page_selected_at timestamptz,
  add column if not exists facebook_long_lived_user_access_token text,
  add column if not exists facebook_long_lived_user_token_expires_at timestamptz;

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
