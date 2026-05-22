# T.E.K Nurse — Claude Project Instructions

## ⚠️ MANDATORY — READ FIRST, EVERY SESSION

Before doing anything else in this project, you MUST:

1. Read the project vault index at:
   `C:\Users\Theo Cedric Chan\Documents\Obsidian Vault\T.E.K Nurse\00 - START HERE.md`

2. From that index, read any specific docs relevant to the task at hand
   (Architecture, Design, Workflows, Decisions Log, Roadmap).

3. Do NOT skip this step "to save time." The vault contains decisions,
   scope, and context that you cannot infer from the code alone.

This rule is non-negotiable.

## ⚠️ CRITICAL — VAULT IS NOT THE SOURCE OF TRUTH

The vault is documentation. **Documentation drifts. Code does not lie.**

- Treat the vault as authoritative for INTENT (what was decided, why, design direction).
- Treat the **source code in this directory** as authoritative for REALITY
  (what actually exists, what actually works).
- Before recommending a change or claiming something exists, verify against
  the actual source code. Read the relevant files. Run the type checker.
  Run the tests.
- If the vault and the code disagree, the **code wins**. Flag the discrepancy
  and ask the user how to reconcile.
- If you discover the vault is out of date, update it **after** making the
  corresponding code change — but never the other way around.

## 🎨 DESIGN CHANGES — RE-READ THE SKILL

If your task touches frontend design, UI, or visual decisions (colors,
typography, components, screens, layouts, animations), you MUST re-read
the Frontend Design skill BEFORE making any design choices:

`C:\Users\Theo Cedric Chan\Documents\Obsidian Vault\Claude Skills\Frontend Design.md`

The skill commits us to a bold, distinctive aesthetic. Do not default to
generic AI-app patterns (Inter font, purple gradients, emerald-on-white,
rounded shadowed cards). The committed direction for T.E.K Nurse is
**"Card Catalog"** — see `Design/Design Direction.md` in the vault.

## Project at a glance

- **What**: T.E.K Nurse — Equipment + consumables inventory PWA for a
  school nursing lab. QR-based borrow/return, hybrid request + walk-in,
  FIFO consumables, audit log, role-based access.
- **Stack**: Next.js (App Router, TypeScript) + Tailwind + Supabase
  (Postgres + Auth + Realtime + Storage) + Resend (email) + Vercel.
- **Design**: Card Catalog — library archive aesthetic. Navy + cream +
  amber. Fraunces (serif) + Be Vietnam Pro (body) + JetBrains Mono (IDs).
- **Roles**: Staff (one combined role) + Student.
- **PWA**: Installable, mobile-first responsive, online-only.

## Where things live

- **Source code**: this directory and its subdirectories.
- **Documentation / second brain**: `C:\Users\Theo Cedric Chan\Documents\Obsidian Vault\T.E.K Nurse\`
- **Frontend Design skill**: `C:\Users\Theo Cedric Chan\Documents\Obsidian Vault\Claude Skills\Frontend Design.md`

## Coding standards

- TypeScript strict mode.
- No `any` without a comment justifying it.
- Components in `components/`, business logic in `lib/`, route pages in `app/`.
- All database writes that change state must produce an audit log entry
  via DB trigger, not client-side.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Tailwind classes only — no inline styles, no CSS modules unless necessary.
- Follow the Card Catalog tokens in `Design/Tokens.md`.

## Git authorship and pushing

- **Never push to any remote.** The remote is the user's GitHub repo
  (`https://github.com/theo2815/T.E.K-Nurse.git`). The user pushes manually.
- **Never add `Co-Authored-By: Claude` (or any Claude/Anthropic) trailer to
  commit messages.** The user is the sole author. Commit messages should
  contain only the subject and body — no co-author trailers, no
  "Generated with Claude Code" footers.
- **Never run `git config`** — including `user.name` / `user.email`. The
  user's local git config controls commit attribution; do not touch it.
- Never amend an already-pushed commit without explicit permission.

## Don't do these without asking

- Push to a git remote (see above — never push, period)
- Force-push
- Delete files or branches
- Modify CI/CD
- Install global tools
- Change the schema in production
- Run destructive SQL
- Commit secrets or `.env` files

## When in doubt

Ask the user. The user prefers planning-first collaboration:
clarify before acting on ambiguity. One question at a time.
