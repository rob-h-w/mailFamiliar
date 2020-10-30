create table "sync"
(
    id          integer primary key autoincrement not null,
    mailbox_id  integer                           not null unique,
    last_synced text                              not null,
    constraint sync_mailbox_id_FK foreign key (mailbox_id) references mailbox (id)
);
create index sync_mailbox_IDX on "sync" (mailbox_id);
