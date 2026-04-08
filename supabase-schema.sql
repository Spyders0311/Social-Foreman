create table if not exists public.customer_onboarding (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  customer_email text,
  customer_name text,
  plan_tier text,
  plan_name text,
  posts_per_week integer,
  posting_cadence_days text[],
  posting_cadence_label text,
  onboarding_status text not null default 'paid-awaiting-onboarding',
  current_weekly_plan_id uuid,
  current_week_key text,
  generation_snapshot_json text,
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
  add column if not exists plan_tier text,
  add column if not exists plan_name text,
  add column if not exists posts_per_week integer,
  add column if not exists posting_cadence_days text[],
  add column if not exists posting_cadence_label text,
  add column if not exists current_weekly_plan_id uuid,
  add column if not exists current_week_key text,
  add column if not exists generation_snapshot_json text,
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

create table if not exists public.weekly_generation_plans (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.customer_onboarding(id) on delete cascade,
  week_key text not null,
  week_start_date timestamptz not null,
  week_end_date timestamptz not null,
  plan_tier text,
  posts_per_week integer not null,
  cadence_days text[] not null,
  cadence_label text not null,
  status text not null default 'generated',
  generation_method text,
  generation_model text,
  review_summary text,
  candidate_count integer not null default 0,
  approved_count integer not null default 0,
  selected_count integer not null default 0,
  scheduled_count integer not null default 0,
  published_count integer not null default 0,
  last_generated_at timestamptz,
  last_scheduled_at timestamptz,
  last_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (onboarding_id, week_key)
);

create table if not exists public.generated_posts (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.customer_onboarding(id) on delete cascade,
  weekly_plan_id uuid references public.weekly_generation_plans(id) on delete cascade,
  source_batch_id text,
  lifecycle_state text not null default 'candidate',
  generation_method text,
  generation_model text,
  week_key text,
  cadence_day text,
  scheduled_for timestamptz,
  selected_for_week boolean not null default false,
  approved_for_publishing boolean not null default false,
  published_post_id text,
  published_at timestamptz,
  publish_attempted_at timestamptz,
  publish_error text,
  rating integer,
  headline text not null,
  body text not null,
  call_to_action text not null,
  hashtags text[],
  post_message text,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_posts_weekly_plan_id_idx on public.generated_posts (weekly_plan_id);
create index if not exists generated_posts_schedule_idx on public.generated_posts (lifecycle_state, scheduled_for);
create index if not exists weekly_generation_plans_onboarding_week_idx on public.weekly_generation_plans (onboarding_id, week_key);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.increment_weekly_plan_published_count(target_weekly_plan_id uuid, published_at_input timestamptz)
returns void
language plpgsql
as $$
begin
  update public.weekly_generation_plans
  set published_count = coalesce(published_count, 0) + 1,
      status = case
        when coalesce(published_count, 0) + 1 >= posts_per_week then 'published'
        else 'scheduled'
      end,
      last_published_at = published_at_input,
      updated_at = now()
  where id = target_weekly_plan_id;
end;
$$;

drop trigger if exists customer_onboarding_set_updated_at on public.customer_onboarding;
create trigger customer_onboarding_set_updated_at
before update on public.customer_onboarding
for each row
execute function public.set_updated_at();

drop trigger if exists weekly_generation_plans_set_updated_at on public.weekly_generation_plans;
create trigger weekly_generation_plans_set_updated_at
before update on public.weekly_generation_plans
for each row
execute function public.set_updated_at();

drop trigger if exists generated_posts_set_updated_at on public.generated_posts;
create trigger generated_posts_set_updated_at
before update on public.generated_posts
for each row
execute function public.set_updated_at();

alter table public.customer_onboarding enable row level security;
alter table public.weekly_generation_plans enable row level security;
alter table public.generated_posts enable row level security;
