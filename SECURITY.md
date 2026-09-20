# Security Policy

## Supported versions

Security fixes are accepted against the current `main` branch of EvolveLoop. Personal profile branches (e.g. GaabType) are not a separate support surface for the public project.

## Reporting a vulnerability

Please report security issues privately to the repository maintainers (GitHub Security Advisories when the public repo exists, or the contact listed in the publishing org). Do **not** open a public issue with exploit details or secrets.

Include:

- Affected component (orchestrator, skill, hook, installer)
- Reproduction without secrets
- Impact assessment

## Secret handling

- Never commit `.env`, `mcp/mcp.env`, API keys, tokens, or private URLs.
- Use `mcp/mcp.env.example` as a template only.
- AGENT.md onboarding must not print secret values in reports.

## Local execution notes

EvolveLoop runs agents with filesystem and shell capabilities. Treat an installed skill pack as **trusted code for your machine**. Review hooks before enabling wiki-mem or third-party MCPs.

## MCP caution

MCP servers can access networks, Docker, browsers, and credentials. Enable only what you need; prefer least privilege.

## Filesystem caution

Installers must backup before modifying `~/.cursor` or project `.cursor`. Never delete a user’s Wiki vault during setup.

## Hard-gate semantics

Public hard gates (`knowledge-grounding`, `grill-me` conditional fail-closed, `image-to-code`) are safety/process controls. Removing them weakens the intended control plane and is considered a security/process regression for contributions.
