CREATE TABLE IF NOT EXISTS elections (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    subtitle VARCHAR(300),
    tagline VARCHAR(200),
    status VARCHAR(30) NOT NULL DEFAULT 'en_preparacion',
    voting_starts_on DATE,
    voting_ends_on DATE,
    term_starts_on DATE,
    term_ends_on DATE,
    calendar_public BOOLEAN NOT NULL DEFAULT FALSE,
    work_plan_required BOOLEAN NOT NULL DEFAULT TRUE,
    photo_required BOOLEAN NOT NULL DEFAULT TRUE,
    accept_position_required BOOLEAN NOT NULL DEFAULT FALSE,
    list_logo_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    list_color_required BOOLEAN NOT NULL DEFAULT TRUE,
    backing_document_required BOOLEAN NOT NULL DEFAULT FALSE,
    registration_deadline DATE,
    max_file_mb INTEGER NOT NULL DEFAULT 5,
    show_work_plan BOOLEAN NOT NULL DEFAULT TRUE,
    show_all_photos BOOLEAN NOT NULL DEFAULT TRUE,
    show_process_status BOOLEAN NOT NULL DEFAULT TRUE,
    members_only BOOLEAN NOT NULL DEFAULT TRUE,
    auto_publish_on_vote_start BOOLEAN NOT NULL DEFAULT FALSE,
    publish_from DATE,
    publish_until DATE,
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    primary_color VARCHAR(9) NOT NULL DEFAULT '#0D47A1',
    secondary_color VARCHAR(9) NOT NULL DEFAULT '#1976D2',
    election_type VARCHAR(30) NOT NULL DEFAULT 'lista_completa',
    one_vote_per_member BOOLEAN NOT NULL DEFAULT TRUE,
    secret_vote BOOLEAN NOT NULL DEFAULT TRUE,
    confirm_vote BOOLEAN NOT NULL DEFAULT TRUE,
    allow_blank_vote BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elections_status ON elections (status);

CREATE TABLE IF NOT EXISTS election_positions (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    photo_required BOOLEAN NOT NULL DEFAULT TRUE,
    full_name_required BOOLEAN NOT NULL DEFAULT TRUE,
    short_profile_required BOOLEAN NOT NULL DEFAULT FALSE,
    profession_required BOOLEAN NOT NULL DEFAULT TRUE,
    visible_to_members BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_election_positions_election
    ON election_positions (election_id, sort_order);

CREATE TABLE IF NOT EXISTS election_calendar_events (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    event_key VARCHAR(40) NOT NULL,
    title VARCHAR(120) NOT NULL,
    starts_on DATE,
    ends_on DATE,
    sort_order INTEGER NOT NULL,
    UNIQUE (election_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_election_calendar_election
    ON election_calendar_events (election_id, sort_order);

CREATE TABLE IF NOT EXISTS election_lists (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    slogan VARCHAR(200),
    color VARCHAR(9),
    logo_url VARCHAR(500),
    description TEXT,
    work_plan_url VARCHAR(500),
    work_plan_summary TEXT,
    backing_document_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'borrador',
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_lists_election
    ON election_lists (election_id, sort_order);

CREATE TABLE IF NOT EXISTS election_candidates (
    id BIGSERIAL PRIMARY KEY,
    list_id BIGINT NOT NULL REFERENCES election_lists(id) ON DELETE CASCADE,
    position_id BIGINT NOT NULL REFERENCES election_positions(id),
    full_name VARCHAR(160) NOT NULL,
    profession VARCHAR(160),
    short_profile VARCHAR(280),
    photo_url VARCHAR(500),
    sort_order INTEGER NOT NULL DEFAULT 1,
    UNIQUE (list_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_election_candidates_list
    ON election_candidates (list_id, sort_order);

CREATE TABLE IF NOT EXISTS election_voters (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    voting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    notified_at TIMESTAMP WITHOUT TIME ZONE,
    UNIQUE (election_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_election_voters_user ON election_voters (user_id);
CREATE INDEX IF NOT EXISTS idx_election_voters_enabled
    ON election_voters (election_id, voting_enabled);

CREATE TABLE IF NOT EXISTS election_ballots (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    voted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    receipt_hash VARCHAR(64) NOT NULL,
    UNIQUE (election_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_election_ballots_election ON election_ballots (election_id);

CREATE TABLE IF NOT EXISTS election_votes (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    ballot_id BIGINT NOT NULL REFERENCES election_ballots(id) ON DELETE CASCADE,
    list_id BIGINT REFERENCES election_lists(id),
    position_id BIGINT REFERENCES election_positions(id),
    is_blank BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_election_votes_election ON election_votes (election_id);

CREATE TABLE IF NOT EXISTS election_message_templates (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    template_key VARCHAR(40) NOT NULL,
    title VARCHAR(120) NOT NULL,
    subject VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    channel_email BOOLEAN NOT NULL DEFAULT TRUE,
    channel_portal BOOLEAN NOT NULL DEFAULT TRUE,
    channel_internal BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_at TIMESTAMP WITHOUT TIME ZONE,
    last_sent_at TIMESTAMP WITHOUT TIME ZONE,
    UNIQUE (election_id, template_key)
);

CREATE TABLE IF NOT EXISTS election_notices (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id),
    template_key VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_notices_user
    ON election_notices (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS election_message_logs (
    id BIGSERIAL PRIMARY KEY,
    election_id BIGINT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    template_key VARCHAR(40) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    recipient VARCHAR(180) NOT NULL,
    user_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'enviado',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);
