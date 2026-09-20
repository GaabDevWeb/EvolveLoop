---
name: find-skills
description: >
  User-facing discovery/install of agent skills via Skills CLI (npx skills).
  Use for /descobrir, "find a skill for X", or extending capabilities from
  skills.sh. NOT the MegaBrain Execution Engine Registry fallback — that is
  orchestrator provider-discovery.ts (scan provider.yaml).
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## MegaBrain architecture (canonical)

| Role | Mechanism |
|------|-----------|
| **This skill** | Human/agent **discovery** (`npx skills find/add`) via `/descobrir` |
| **Orchestrator miss** | `orchestrator/src/discovery/provider-discovery.ts` scans local `provider.yaml` |

Do **not** treat this skill as the Scheduler runtime fallback.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Invokes `/descobrir`
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities
- Wants to search for tools, templates, or workflows
- Mentions they wish they had help with a specific domain (design, testing, deployment, etc.)

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

**Key commands:**

- `npx skills find [query]` - Search for skills interactively or by keyword
- `npx skills add <package>` - Install a skill from GitHub or other sources
- `npx skills check` - Check for skill updates
- `npx skills update` - Update all installed skills

**Browse skills at:** https://skills.sh/

## How to Help Users Find Skills

### Step 1: Understand What They Need

When a user asks for help with something, identify:

1. The domain (e.g., React, testing, design, deployment)
2. The specific task they're trying to accomplish
3. Whether this is a common enough need that a skill likely exists

### Step 2: Search for Skills

```bash
npx skills find [query]
```

### Step 3: Install (only with explicit user OK)

```bash
npx skills add <owner/repo@skill> -g -y
```

Never install silently in MegaBrain cycles without human approval.

## Non-responsibilities

- Not MegaBrain Registry / Execution Engine provider selection
- Not a substitute for `/library-dossier` or `/pesquisar`
- Not automatic capability wiring into `provider.yaml`
