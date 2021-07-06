create table encrypted
(
    id         integer primary key autoincrement,
    ciphertext blob not null,
    nonce      blob not null,
    salt       blob not null
);

create table "user"
(
    id        integer primary key autoincrement,
    name      text    not null,
    remote_id text    not null unique,
    secret    integer not null unique,
    constraint user_secret_FK foreign key (secret) references encrypted (id)
);
create unique index user_remote_id_IDX on "user" (remote_id);

create table imap
(
    id                     integer primary key autoincrement,
    host                   text    not null,
    move_threshold         real    not null,
    name                   text    not null,
    password               integer not null unique,
    port                   integer not null,
    refresh_period_minutes integer not null,
    sync_period_days       integer not null,
    tls                    integer not null,
    user_id                integer not null,
    constraint imap_UK unique (host, name, user_id),
    constraint imap_password_FK foreign key (password) references encrypted (id),
    constraint imap_user_FK foreign key (user_id) references "user" (id)
);
create index imap_user_id_IDX on "imap" (user_id);

create table mailbox
(
    id              integer primary key autoincrement,
    imap_account_id integer not null,
    name            text    not null,
    constraint mailbox_imap_account_id_FK foreign key (imap_account_id) references imap (id),
    constraint mailbox_name_imap_account_id_UQ unique (imap_account_id, name)
);
create index mailbox_imap_account_id_IDX on "mailbox" (imap_account_id);

create table "sync"
(
    id          integer primary key autoincrement not null,
    mailbox_id  integer                           not null unique,
    last_synced text                              not null,
    constraint sync_mailbox_id_FK foreign key (mailbox_id) references mailbox (id)
);
create index sync_mailbox_IDX on "sync" (mailbox_id);

create table "message"
(
    id            integer primary key autoincrement not null,
    mailbox_id    integer                           not null,
    from_hash     integer                           not null,
    received_date text                              not null,
    sent_date     text                              not null,
    constraint message_mailbox_id_FK foreign key (mailbox_id) references mailbox (id)
);
create index message_from_hash_received_sent_IDX on "message" (from_hash, received_date, sent_date);

create table "header_name"
(
    id   integer primary key autoincrement not null,
    name text                              not null unique
);
create index header_name_name_IDX on header_name (name);

create table "header"
(
    id             integer primary key autoincrement not null,
    message_id     integer                           not null,
    header_name_id integer                           not null,
    value          text                              not null,
    constraint header_message_id_FK foreign key (message_id) references message (id),
    constraint header_header_name_id_FK foreign key (header_name_id) references header_name (id)
);
create index header_message_id_IDX on "header" (message_id);

create table move_state
(
    id         integer primary key autoincrement not null,
    state      integer                           not null,
    message_id integer                           not null,
    from_id    integer                           not null,
    to_id      integer                           not null,
    constraint move_state_message_id_FK foreign key (message_id) references message (id),
    constraint move_state_from_FK foreign key (from_id) references mailbox (id),
    constraint move_state_to_FK foreign key (to_id) references mailbox (id)
);
create index move_state_state_IDX on "move_state" (state);

create table ngram_value
(
    id    integer primary key autoincrement not null,
    value varchar unique                    not null
);

create table ngram
(
    id   integer primary key autoincrement not null,
    name varchar unique                    not null
);

create table ngram_count
(
    ngram_id integer not null,
    value_id integer not null,
    count    integer not null,
    constraint n_gram_id_FK foreign key (ngram_id) references ngram (id),
    constraint value_FK foreign key (value_id) references ngram_value (id),
    primary key (ngram_id, value_id)
)

