-- Enable Realtime for key tables to support instant UI updates
begin;
  alter publication supabase_realtime add table documents;
  alter publication supabase_realtime add table notifications;
  alter publication supabase_realtime add table ai_insights;
commit;
