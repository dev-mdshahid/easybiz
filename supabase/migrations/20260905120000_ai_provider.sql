alter table public.business_settings
  add column if not exists ai_provider text not null default 'openai';

update public.business_settings
set ai_provider = case
  when coalesce(ai_base_url, '') ilike '%openrouter.ai%' then 'openrouter'
  when coalesce(ai_base_url, '') ilike '%googleapis.com%' then 'gemini'
  else 'openai'
end
where ai_provider is distinct from 'openai'
   or ai_base_url is not null;

alter table public.business_settings
  drop constraint if exists business_settings_ai_provider_chk;

alter table public.business_settings
  add constraint business_settings_ai_provider_chk
  check (ai_provider in ('openai', 'gemini', 'openrouter'));
