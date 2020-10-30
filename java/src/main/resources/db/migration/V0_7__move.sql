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
