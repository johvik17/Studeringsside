create table study_sessions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  type varchar(50) not null,
  start_time timestamptz not null,
  end_time timestamptz null,
  duration_minutes int null,
  notes text null
);

create index idx_study_sessions_user_id on study_sessions(user_id);
create index idx_study_sessions_user_start_time on study_sessions(user_id, start_time);