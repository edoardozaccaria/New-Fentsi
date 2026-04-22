# Claude Code — Setup Vibecoding / Frontend / Backend

### Le 7 migliori skill selezionate dal video "Top 33 Claude Skills"

---

## Cosa viene installato e perché

| Skill / MCP            | Tipo                 | Perché è essenziale                                                                                                           |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Frontend Design**    | Skill (.md)          | Vieta font generici (Inter, Roboto), forza una direzione di design prima di scrivere codice. UI di qualità.                   |
| **Context7 MCP**       | MCP Server           | Inietta la documentazione aggiornata di React, Next.js, Supabase, MongoDB direttamente nel contesto. Stop alle API deprecate. |
| **Taskmaster AI**      | MCP Server           | Converte il tuo PRD in task strutturati con dipendenze e priorità. 36 strumenti MCP.                                          |
| **Playwright MCP**     | MCP Server           | Controllo browser nativo: click, form, screenshot, testing automatico.                                                        |
| **Superpowers**        | Plugin (Claude Code) | TDD obbligatorio, pipeline plan→execute, 22 comandi e 12 agenti specializzati.                                                |
| **Design With Claude** | Plugin (Claude Code) | 29 agenti design: accessibilità, sistemi design, UX copy, motion, handoff per sviluppatori.                                   |
| **Playwright Pro**     | Plugin (Claude Code) | Test automation di livello senior: pattern da produzione, locatori robusti, integrazione TestRail.                            |
| **Visual Eyes**        | Plugin (Claude Code) | Cattura screenshot dell'app in esecuzione, Claude vede e corregge bug visivi in autonomia.                                    |

---

## Installazione in 3 passi

### PASSO 1 — Esegui lo script (da Terminale)

```bash
# Naviga nella cartella dove hai scaricato questi file
cd /path/a/questa/cartella

# Dai i permessi di esecuzione
chmod +x install.sh

# Esegui
./install.sh
```

Questo script:

- Installa Task Master AI globalmente (`npm install -g task-master-ai`)
- Configura Context7 via OAuth (`npx ctx7 setup --claude`)
- Copia la skill `frontend-design.md` in `~/.claude/skills/`
- Aggiunge i server MCP a `~/.claude.json`

---

### PASSO 2 — API Key Context7 (opzionale ma consigliato)

Ottieni una chiave gratuita su [context7.com/dashboard](https://context7.com/dashboard) per rate limits più alti.

Poi modifica `mcp-config.json` e sostituisci:

```
"CONTEXT7_API_KEY": "YOUR_API_KEY_HERE"
```

---

### PASSO 3 — Plugin dentro Claude Code

Apri Claude Code (terminale: `claude`) e incolla questi comandi uno alla volta:

```
/plugin marketplace add github:anthropics/claude-plugins-community

/plugin install superpowers@claude-plugins-community

/plugin install design-with-claude@claude-plugins-community

/plugin install playwright-pro@claude-plugins-community

/plugin install visual-eyes@claude-plugins-community

/plugin install figma-to-page@claude-plugins-community
```

---

## Come usare le skill

### Context7 — Usa nelle chat con Claude Code

Aggiungi semplicemente `use context7` al prompt:

```
Crea un hook React per il fetch dei dati. use context7
```

### Taskmaster — Per gestire progetti

```
# Inizializza in un progetto
task-master init

# Converti il tuo PRD in task
task-master parse-prd mio-prd.txt

# Lista task
task-master list
```

### Frontend Design — Attiva automaticamente

La skill è già in `~/.claude/skills/frontend-design.md` e viene letta da Claude Code all'avvio.

Per attivare esplicitamente:

```
Crea una landing page per la mia SaaS. Segui le regole della skill frontend-design.
```

### Superpowers — Pipeline TDD

Al primo utilizzo, Superpowers ti chiede di descrivere cosa stai costruendo prima di scrivere codice. Ti porta attraverso: plan → test → implement.

### Visual Eyes — Debugging visivo

Con Visual Eyes attivo, puoi dire a Claude:

```
Guarda come appare la home page e dimmi cosa non va nel layout mobile.
```

---

## Struttura file

```
claude-skills-vibecoding/
├── ISTRUZIONI.md          ← questo file
├── install.sh             ← script setup automatico
├── mcp-config.json        ← configurazione MCP servers
└── frontend-design.md     ← skill design (auto-installata dallo script)
```

---

## Troubleshooting

**`/plugin` non riconosciuto in Claude Code**
→ Aggiorna Claude Code: `npm update -g @anthropic-ai/claude-code`

**Context7 non si connette**
→ Controlla che npx sia nel PATH: `which npx`
→ Prova: `npx @upstash/context7-mcp@latest` manualmente

**Taskmaster dà errore di API key**
→ Modifica `~/.claude.json` e inserisci la tua `ANTHROPIC_API_KEY`

**I plugin non appaiono in Claude Code**
→ Riavvia Claude Code dopo l'installazione dei plugin

---

## Risorse

- [Context7 Dashboard](https://context7.com/dashboard)
- [Superpowers GitHub](https://github.com/obra/superpowers)
- [Task Master GitHub](https://github.com/eyaltoledano/claude-task-master)
- [Community Plugins](https://github.com/anthropics/claude-plugins-community)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
