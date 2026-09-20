# Outer Loop EvolveLoop — ciclo fechado com reentrada

**Âmbito:** `/evolve` (skill `orquestrar`). Complementa a Matriz `continuar | corrigir | replanejar` e a Fase 3 (auto-correção).

## Ideia

```text
entender → planear → executar → testar/gates
                ↑____________________|
         (erro: reentrar no ponto certo — NÃO reboot cego)
```

Loop **sim**. Reiniciar sempre na Fase 0 **não**.

---

## Campos SSOT (obrigatórios em `[ESTADO ATUAL]`)

| Campo | Tipo | Significado |
|-------|------|-------------|
| `cycle_id` | string | ID do ciclo outer actual (ex.: `C1`, `C2`) |
| `attempt` | int | Tentativa dentro do ciclo (correção local / reentrada) |
| `outer_cycle` | int | Quantos outer cycles já decorreram nesta missão (1-based) |
| `max_outer_cycles` | int | Teto (default **5**) |
| `last_gate` | string | Último gate corrido (`testing`, `security`, `po-acceptance`, …) |
| `last_decision` | `continuar` \| `corrigir` \| `replanejar` \| `bloqueado` | Última decisão da Matriz |
| `reentry_phase` | `2` \| `3` \| `1` \| `0` \| `n/a` | Para onde reentra se não for `continuar` |
| `reentry_mode` | `partial` \| `plan_reset` \| `full_ground` \| `n/a` | Amplitude do reboot |

Persistir cada mudança material destes campos em `.agent_history.md`.

---

## Mapa de reentrada (erro → onde voltar)

| Falha | Decisão | `reentry_phase` | `reentry_mode` | Notas |
|-------|---------|-----------------|----------------|-------|
| Teste/build/lint no âmbito | `corrigir` | `3` (via Fase 2 mínima) | `partial` | Invalidar só nós afectados; máx. **3** tentativas locais (Fase 3) |
| Após 3 locais sem verde | `corrigir` + PDA diagnóstico | `3` | `partial` | Depois revalidar; se ainda falhar → considerar `replanejar` |
| PO `Ajustes necessários` | `corrigir` ou `replanejar` | `2` ou `1` | `partial` / `plan_reset` | Conforme se o DoD mudou |
| Security crítico/alto | `corrigir` | `2` | `partial` | Reentrar execução; re-correr `/seguranca` |
| Hipótese esgotada / arquitectura errada / RF mudou | `replanejar` | `1` | `plan_reset` | Novo `[PLANO]`; **não** apagar código útil sem motivo; retomar Fase 2 |
| Grounding Wiki inválido / contratos contradizem entrega | `replanejar` ou `corrigir` | `0` ou `2` | `full_ground` / `partial` | Só `full_ground` se Fontes/Contratos falharam ou mudaram |
| Infra catastrófica | `bloqueado` | `n/a` | `n/a` | Parar; documentar; sem simular sucesso |

### Proibido

- Após falha de teste: voltar à Fase 0 e re-planejar **sempre**
- Incrementar `outer_cycle` sem registar motivo + `last_gate` + evidência
- Emitir `continuar` com gate vermelho
- Loop sem teto

---

## Outer cycle — quando incrementa

Incrementar `outer_cycle` quando:

1. Se passa de `corrigir` → `replanejar` (novo plano para o mesmo objectivo), **ou**
2. PO/security forçam reentrada ampla após um “quase fecho”, **ou**
3. O raiz declara explicitamente novo ciclo outer no SSOT

**Não** incrementar a cada micro-fix da Fase 3 (aí só sobe `attempt`).

### Teto

- Default: `max_outer_cycles = 5`
- Se `outer_cycle > max_outer_cycles` sem `concluído`:  
  **Status** → `bloqueado`  
  **DECISÃO** → documentar handoff humano (o que falhou, evidência, opções)  
  **Proibido** continuar a oscilar em silêncio

O utilizador pode subir o teto com ordem explícita (`max_outer_cycles=N`).

---

## Algoritmo (raiz, após cada gate / validação)

```text
1. Correr gate / verificação → evidence
2. Se PASS → last_decision=continuar; attempt=0; avançar fase/tarefa
3. Se FAIL →
   a. Classificar pela tabela de reentrada
   b. last_decision = corrigir | replanejar | bloqueado
   c. Se corrigir: attempt += 1; se attempt≤3 → Fase 3; senão PDA → revalidar
   d. Se ainda FAIL após PDA → replanejar (outer_cycle += 1) ou bloqueado
   e. Se replanejar: outer_cycle += 1; reentry_phase=1; plan_reset; depois Fase 2
4. Se outer_cycle > max_outer_cycles → bloqueado + handoff
5. Registar SSOT + .agent_history.md
6. Executar [PRÓXIMO PASSO] sem pedir micro-aprovação
```

---

## Evidência mínima por reentrada

```text
outer_loop:
  cycle_id: C2
  outer_cycle: 2/5
  attempt: 1
  last_gate: testing
  last_decision: corrigir
  reentry_phase: 3
  reentry_mode: partial
  reason: "test X failed: …"
```

---

## Relação com mem episódica / wiki

- Ao `replanejar` / novo outer cycle: consultar `.ai/sessions/LATEST.md` / `wiki-mem` para não repetir hipóteses falhadas.
- Contratos: HARD-GATE Wiki; `full_ground` só quando necessário.
- Em spawns PDA: propagar outer-loop fields dentro do **GATE_BUNDLE** ([gate-bundle.md](gate-bundle.md)).
