-- select * from to_date('16 Jan 2017','dd mon yyyy')

-- entity tables
create table entities_list(
    id serial PRIMARY KEY not null,
    country_name varchar (255),
    entity_name varchar (255) ,
    list varchar (50),
    program varchar (255),
    remarks text
);
create table entities_identifications(
    id serial PRIMARY KEY not null,
    entity_id integer references entities_list(id),
    identification_type varchar (255),
    identification_id varchar (255),
    country varchar (255),
    issue_date  varchar (255),
    expire_date  varchar (255)
);
create table entities_aliases(
	id serial PRIMARY KEY not null,
	entity_id integer references entities_list(id),
	aliases_type varchar (255),
	category varchar (255),
	name varchar (255)
);
create table entities_addresses(
	id serial PRIMARY KEY not null,
	entity_id integer references entities_list(id),
	address varchar (255),
	city varchar (255),
	province varchar (255),
	postal_code varchar (100),
	country varchar (100)
);


-- individuals tables

create table individuals_list(
	id serial PRIMARY KEY not null,
	country_name varchar (255),
	last_name varchar (255),
	first_name varchar (255),
	title varchar (255),
	date_of_birth varchar (255),
	place_of_birth varchar (255),
	list varchar (255),
	program varchar (255),
	nationality varchar (255),
	citizenship varchar (255),
	remarks text
);

create table individuals_identifications(
    id serial PRIMARY KEY not null,
    individuals_id integer references individuals_list(id),
    identification_type varchar (255),
    identification_code varchar (255),
    country varchar (255),
    issue_date  varchar (255),
    expire_date  varchar (255)
);
create table individuals_aliases(
	id serial PRIMARY KEY not null,
	individuals_id integer references individuals_list(id),
	aliases_type varchar (255),
	category varchar (255),
	name varchar (255)
);
create table individuals_addresses(
	id serial PRIMARY KEY not null,
	individuals_id integer references individuals_list(id),
	address varchar (255),
	city varchar (255),
	province varchar (255),
	postal_code varchar (100),
	country varchar (100)
);

