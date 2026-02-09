-- Habilitar extensión para gen_random_uuid() si se necesita
create extension if not exists pgcrypto;


-- Tabla de availabilities
create table if not exists availabilities (
id uuid default gen_random_uuid() primary key,
user_id uuid not null,
date date not null,
constraint user_date_unique unique (user_id, date)
);


-- Índice por fecha para consultas rápidas
create index if not exists idx_availabilities_date on availabilities(date);