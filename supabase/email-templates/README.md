# E-mail transacional (confirmação/reset) via Resend

O remetente embutido do Supabase é rate-limited e só serve para teste. Para o
"Confirme seu e-mail" chegar de verdade, ligamos um **SMTP próprio (Resend)**.

## 1. Resend

1. Crie conta em [resend.com](https://resend.com) (free).
2. **API Keys → Create API Key** → copie o valor (`re_...`).
3. **Remetente** — escolha um:
   - **Teste rápido:** use `onboarding@resend.dev`. Limitação: só entrega no e-mail
     da própria conta Resend (bom para demo com o seu e-mail).
   - **Enviar para qualquer um:** **Domains → Add Domain** (ex.: `mail.seudominio.com`),
     adicione os registros DNS (SPF/DKIM) que o Resend mostrar e aguarde verificar.
     Depois envie de `no-reply@seudominio.com`.

## 2. Supabase → Authentication → Emails → SMTP Settings

Ative **Enable Custom SMTP** e preencha:

| Campo | Valor |
| --- | --- |
| Sender email | `onboarding@resend.dev` (teste) ou `no-reply@seudominio.com` |
| Sender name | `Nexus CRM` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a API key do Resend (`re_...`) |

## 3. Templates (Authentication → Emails → Templates)

- **Confirm signup** → cole o conteúdo de [`confirm-signup.html`](./confirm-signup.html)
  (assunto: "Confirme seu cadastro no Nexus CRM").
- **Reset password** → cole [`reset-password.html`](./reset-password.html).

Variável usada nos dois: `{{ .ConfirmationURL }}` (o Supabase injeta o link).

## 4. Fluxo e teste

1. No app, **Criar conta** com um e-mail real.
2. Chega o e-mail → clique em **Confirmar meu e-mail** (abre no navegador,
   confirma no servidor).
3. Volte ao app e clique **Entrar** — agora loga (e-mail confirmado).

> O link de confirmação confirma o e-mail no servidor do Supabase; não é preciso
> deep-link de volta ao app. O usuário só retorna ao app e faz login normal.
