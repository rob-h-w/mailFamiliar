create table "user" (
	id integer  primary key autoincrement,
	name text not null,
	remote_id text not null unique
);
create unique index user_remote_id_IDX on "user" (remote_id);

create table imap (
	host text not null,
	move_threshold real not null,
	name text not null,
	password text not null,
	port integer not null,
	refresh_period_minutes integer not null,
	sync_period_days integer not null,
	tls integer not null,
	user_id integer not null,
    constraint imap_UN unique (user_id),
	constraint imap_PK primary key (host,name,user_id),
    constraint imap_FK foreign key (user_id) references "user"(id) on delete cascade on update cascade
);
create index imap_user_id_IDX on "imap" (user_id);
create index imap_host_name_IDX on "imap" (host, name);