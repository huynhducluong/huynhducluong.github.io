-- Portfolio phase 3: structured content owned by Projects and Automation tools (docs/ui-guidelines.md §8.4).
-- key_facts:      up to 3 { id, value: {en, vi}, label: {en, vi} } printed as the Portfolio project facts.
-- workflow_steps: up to 3 { id, label: {en, vi}, text: {en, vi} } printed before the Outcome on the Workflow layout.
-- Both default to an empty array, so existing rows keep printing exactly what they printed before.

alter table public.projects
  add column if not exists key_facts jsonb not null default '[]'::jsonb;

alter table public.automation_tools
  add column if not exists workflow_steps jsonb not null default '[]'::jsonb;

alter table public.projects
  drop constraint if exists projects_key_facts_shape;
alter table public.projects
  add constraint projects_key_facts_shape check (
    jsonb_typeof(key_facts) = 'array' and jsonb_array_length(key_facts) <= 3
  );

alter table public.automation_tools
  drop constraint if exists automation_tools_workflow_steps_shape;
alter table public.automation_tools
  add constraint automation_tools_workflow_steps_shape check (
    jsonb_typeof(workflow_steps) = 'array' and jsonb_array_length(workflow_steps) <= 3
  );

comment on column public.projects.key_facts is 'Up to 3 Portfolio key facts: [{ id, value: {en, vi}, label: {en, vi} }].';
comment on column public.automation_tools.workflow_steps is 'Up to 3 Workflow steps before the Outcome: [{ id, label: {en, vi}, text: {en, vi} }].';
