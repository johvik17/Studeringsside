ALTER TABLE study_sessions
    ADD COLUMN course_id uuid;

ALTER TABLE study_sessions
    ADD CONSTRAINT fk_study_sessions_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE SET NULL;

CREATE INDEX ix_study_sessions_user_course_start
    ON study_sessions (user_id, course_id, start_time);