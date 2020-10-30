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