create table predictor
(
    id   integer primary key autoincrement not null,
    name varchar unique                    not null
);

create table predictor_string
(
    predictor_id integer not null,
    string       varchar not null,
    count        integer not null,
    primary key (predictor_id, string),
    foreign key (predictor_id) references predictor (id)
);
