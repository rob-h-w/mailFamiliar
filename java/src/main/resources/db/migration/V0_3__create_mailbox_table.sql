alter table imap rename to temp_imap;
drop index imap_user_id_IDX;
drop index imap_host_name_IDX;

create table imap (
    id integer primary key autoincrement,
	host text not null,
	move_threshold real not null,
	name text not null,
	password integer not null unique,
	port integer not null,
	refresh_period_minutes integer not null,
	sync_period_days integer not null,
	tls integer not null,
	user_id integer not null,
	constraint imap_UK unique (host,name,user_id),
	constraint imap_password_FK foreign key (password) references encrypted (id) on update cascade,
    constraint imap_user_FK foreign key (user_id) references "user"(id) on update cascade on
    delete cascade
);
create index imap_user_id_IDX on "imap" (user_id);

insert into imap (
    host,
    move_threshold,
    name,
    password,
    port,
    refresh_period_minutes,
    sync_period_days,
    tls,
    user_id) select host,
    move_threshold,
    name,
    password,
    port,
    refresh_period_minutes,
    sync_period_days,
    tls,
    user_id from temp_imap;

drop table temp_imap;

create table mailbox (
    id integer primary key autoincrement,
    imap_account_id integer not null,
    name text not null,
    constraint mailbox_imap_account_id_FK foreign key (imap_account_id) references imap (id) on
    update cascade on delete cascade
);
create index mailbox_imap_account_id_IDX on "mailbox" (imap_account_id);
