alter table mailbox rename to temp_mailbox;
drop index mailbox_imap_account_id_IDX;

create table mailbox (
    id integer primary key autoincrement,
    imap_account_id integer not null,
    name text not null,
    constraint mailbox_imap_account_id_FK foreign key (imap_account_id) references imap (id) on
    update cascade on delete cascade,
    constraint mailbox_name_imap_account_id_UQ unique (imap_account_id, name)
);
create index mailbox_imap_account_id_IDX on "mailbox" (imap_account_id);

insert into mailbox (id, imap_account_id, name) select id, imap_account_id, name from temp_mailbox;
drop table temp_mailbox;
