# Contributing to Fentsi

## Git Branch Strategy

Seguiamo un workflow basato su **Git Flow** semplificato, con tre livelli di ambienti.

```
main ─────────────────────────────────────────► [PRODUZIONE]
  │
  └── develop ──────────────────────────────► [STAGING / QA]
        │
        ├── feature/auth-login
        ├── feature/dashboard-ui
        └── fix/payment-validation
```

### Branch principali

| Branch    | Ambiente   | Descrizione                                                |
| --------- | ---------- | ---------------------------------------------------------- |
| `main`    | Produzione | Sempre stabile. Merge solo da `develop` via Pull Request.  |
| `develop` | Staging/QA | Branch di integrazione. Riceve merge dalle feature branch. |

### Branch di lavoro

| Pattern          | Uso                                                             |
| ---------------- | --------------------------------------------------------------- |
| `feature/<nome>` | Nuove funzionalità (es. `feature/user-profile`)                 |
| `fix/<nome>`     | Bug fix (es. `fix/stripe-webhook-error`)                        |
| `chore/<nome>`   | Manutenzione, dipendenze, config                                |
| `docs/<nome>`    | Solo documentazione                                             |
| `hotfix/<nome>`  | Fix urgenti in produzione — merge diretto su `main` + `develop` |

---

## Workflow standard (feature)

```bash
# 1. Aggiorna develop
git checkout develop && git pull origin develop

# 2. Crea il tuo branch
git checkout -b feature/nome-feature

# 3. Lavora, committa con messaggi chiari
git commit -m "feat: descrizione concisa della modifica"

# 4. Apri una Pull Request verso develop
# La PR deve passare CI (lint + test) prima del merge
```

## Commit Message Convention (Conventional Commits)

```
<type>(<scope>): <descrizione>

Tipi: feat | fix | chore | docs | style | refactor | test | ci
```

Esempi:

- `feat(auth): add Google OAuth login`
- `fix(api): handle null response from payment provider`
- `chore(deps): upgrade next to 15.x`

---

## Pull Request Rules

- Ogni PR deve avere almeno **1 reviewer**.
- I test devono passare (`npm test`).
- Il lint deve essere pulito (`npm run lint`).
- Squash merge su `develop`. Merge commit su `main`.

## Hotfix in produzione

```bash
git checkout main && git pull origin main
git checkout -b hotfix/nome-fix
# Applica il fix...
git checkout main && git merge hotfix/nome-fix
git checkout develop && git merge hotfix/nome-fix
git branch -d hotfix/nome-fix
```
