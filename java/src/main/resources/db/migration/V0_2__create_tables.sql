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
    host                   text    not null,
    move_threshold         real    not null,
    name                   text    not null,
    password               integer not null unique,
    port                   integer not null,
    refresh_period_minutes integer not null,
    sync_period_days       integer not null,
    tls                    integer not null,
    user_id                integer not null,
    constraint imap_PK primary key (host, name, user_id),
    constraint imap_password_FK foreign key (password) references encrypted (id),
    constraint imap_user_FK foreign key (user_id) references "user" (id)
);
create index imap_user_id_IDX on "imap" (user_id);
create index imap_host_name_IDX on "imap" (host, name);
