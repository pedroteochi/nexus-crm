-- Nexus CRM — correções do review (migração 4 de 4)
-- Rode no SQL Editor DEPOIS das 0001–0003 (em projetos já criados, rode só esta).
--
-- 1. CASCATAS: o app cascateia deleções no cache (deletar empresa remove
--    contatos → chats → mensagens → oportunidades; deletar contato remove suas
--    oportunidades) e confia que o banco espelha isso via FK. O 0001 porém criou
--    contacts.company_id e opportunities.contact_id como ON DELETE SET NULL —
--    o registro "deletado" sobrevivia no Postgres e ressuscitava na próxima
--    hidratação. Alinha as FKs à semântica real do app.
--
-- 2. Purga de órfãos: linhas com FK nula só existem por causa do SET NULL antigo
--    (o app e o seed sempre preenchem empresa/contato), então são estado inválido
--    deixado por deleções anteriores — remove antes de trocar as constraints.

delete from public.opportunities where contact_id is null;
delete from public.contacts where company_id is null;

alter table public.contacts
  drop constraint contacts_company_id_fkey,
  add constraint contacts_company_id_fkey
    foreign key (company_id) references public.companies (id) on delete cascade;

alter table public.opportunities
  drop constraint opportunities_contact_id_fkey,
  add constraint opportunities_contact_id_fkey
    foreign key (contact_id) references public.contacts (id) on delete cascade;

-- 3. Seed: as mensagens demo recebiam o MESMO created_at (now() é fixo por
--    transação), deixando a ordem da conversa indeterminada na hidratação.
--    Recria a função com timestamps escalonados. Vale para cadastros futuros.

create or replace function public.seed_demo_data()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acme    text;
  v_globex  text;
  v_initech text;
  v_maria   text;
  v_joao    text;
  v_carla   text;
  v_chat    text;
begin
  -- Empresas
  insert into public.companies (user_id, name, industry, employees) values
    (new.id, 'Acme Ltda',   'Tecnologia', 42)  returning id into v_acme;
  insert into public.companies (user_id, name, industry, employees) values
    (new.id, 'Globex S.A.', 'Varejo',     180) returning id into v_globex;
  insert into public.companies (user_id, name, industry, employees) values
    (new.id, 'Initech',     'Financeiro', 75)  returning id into v_initech;

  -- Contatos
  insert into public.contacts (user_id, name, email, company_id, role) values
    (new.id, 'Maria Silva',   'maria@acme.com',    v_acme,    'Gerente de Compras') returning id into v_maria;
  insert into public.contacts (user_id, name, email, company_id, role) values
    (new.id, 'João Pereira',  'joao@globex.com',   v_globex,  'Diretor Comercial')  returning id into v_joao;
  insert into public.contacts (user_id, name, email, company_id, role) values
    (new.id, 'Carla Souza',   'carla@initech.com', v_initech, 'CTO')                returning id into v_carla;
  insert into public.contacts (user_id, name, email, company_id, role) values
    (new.id, 'Pedro Almeida', 'pedro@acme.com',    v_acme,    'Analista');

  -- Chat + mensagens (timestamps escalonados: a ordem da conversa é estável)
  insert into public.chats (user_id, contact_id, last_message_at)
  values (new.id, v_maria, now()) returning id into v_chat;
  insert into public.messages (user_id, chat_id, role, text, status, created_at) values
    (new.id, v_chat, 'user',      'Oi Maria! Vi que a Acme está buscando um CRM. Posso ajudar?', 'sent', now() - interval '10 minutes'),
    (new.id, v_chat, 'assistant', 'Oi! Sim, estamos avaliando opções. O que o Nexus oferece?',   'sent', now() - interval '7 minutes'),
    (new.id, v_chat, 'user',      'Posso preparar uma proposta com 50 licenças ainda hoje.',      'sent', now() - interval '3 minutes');

  insert into public.chats (user_id, contact_id, last_message_at)
  values (new.id, v_joao, now() - interval '2 days');

  -- Oportunidades espalhadas pelo funil (inclui uma ganha e uma perdida)
  insert into public.opportunities
    (user_id, title, contact_id, stage_id, owner, value, status, stage_entered_at) values
    (new.id, 'Acme — 50 licenças',       v_maria, 'proposta',     'Você', 48000,  'open', now() - interval '3 days'),
    (new.id, 'Globex — piloto regional', v_joao,  'qualificacao', 'Você', 120000, 'open', now() - interval '8 days'),
    (new.id, 'Initech — integração API', v_carla, 'negociacao',   'Você', 90000,  'open', now() - interval '1 day'),
    (new.id, 'Acme — expansão',          v_maria, 'fechamento',   'Você', 30000,  'won',  now() - interval '5 days'),
    (new.id, 'Globex — sazonal',         v_joao,  'novo',         'Você', 15000,  'lost', now() - interval '12 days');

  return new;
end;
$$;
