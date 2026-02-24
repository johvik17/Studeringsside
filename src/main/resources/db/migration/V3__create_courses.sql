CREATE TABLE courses (
    id uuid PRIMARY KEY,
    user_id bigint NOT NULL,
    name varchar(120) NOT NULL,
    code varchar(40),
    color varchar(32),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fk_courses_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_courses_user_name ON courses (user_id, lower(name));
CREATE INDEX ix_courses_user ON courses (user_id);