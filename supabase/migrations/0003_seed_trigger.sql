-- Nexus CRM — seed por usuário (bloco 3 de 3)
-- O gatilho "store vazio → semear" do app NÃO pode mais rodar por instalação
-- (todo device vazio criaria dados sem dono). Vira um trigger after-insert em
-- auth.users que popula um dataset demo carimbando user_id = new.id.
--
-- security definer: bypassa RLS de propósito (está criando linhas de um usuário
-- que acabou de nascer). set search_path = '' é boa prática nesse modo.
-- Os ids ficam por conta do default gen_random_uuid()::text das tabelas.

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

  -- Chat + mensagens (demonstra o fluxo de conversa/IA)
  insert into public.chats (user_id, contact_id, last_message_at)
  values (new.id, v_maria, now()) returning id into v_chat;
  insert into public.messages (user_id, chat_id, role, text, status) values
    (new.id, v_chat, 'user',      'Oi Maria! Vi que a Acme está buscando um CRM. Posso ajudar?', 'sent'),
    (new.id, v_chat, 'assistant', 'Oi! Sim, estamos avaliando opções. O que o Nexus oferece?',   'sent'),
    (new.id, v_chat, 'user',      'Posso preparar uma proposta com 50 licenças ainda hoje.',      'sent');

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_demo_data();
