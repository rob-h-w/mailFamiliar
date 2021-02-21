create table ngram_value
(
    id    integer primary key autoincrement not null,
    value varchar unique                    not null
);

create table ngram
(
    id   integer primary key autoincrement not null,
    name varchar unique                    not null,
    n    integer                           not null
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
