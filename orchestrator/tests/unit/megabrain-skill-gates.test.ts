import { describe, it, expect } from "vitest";
import {
  evaluateGrillMeRequired,
  evaluateGrillMeTransition,
  evaluateImageToCodeGate,
  skillGatesToRequireFlags,
} from "../../src/policy/megabrain-skill-gates.js";

describe("megabrain-skill-gates — grill-me", () => {
  it("task simples / trivial → gate não requerido", () => {
    const d = evaluateGrillMeTransition({
      risk_tier: "hotfix",
      phase05_active: false,
      docs_approved: false,
      trivial_non_design: true,
    });
    expect(d.required).toBe(false);
    expect(d.allow_transition).toBe(true);
  });

  it("PRD / Fase 0.5 docs aprovados → gate requerido", () => {
    expect(
      evaluateGrillMeRequired({
        risk_tier: "standard",
        phase05_active: true,
        docs_approved: true,
      }),
    ).toBe(true);
  });

  it("arquitectura / scope change → gate requerido", () => {
    expect(
      evaluateGrillMeRequired({
        risk_tier: "sensitive",
        phase05_active: false,
        docs_approved: false,
        significant_scope_change: true,
      }),
    ).toBe(true);
  });

  it("planner sem grill-me quando required → BLOCKED", () => {
    const d = evaluateGrillMeTransition({
      risk_tier: "standard",
      phase05_active: true,
      docs_approved: true,
      evidence_status: "absent",
    });
    expect(d.required).toBe(true);
    expect(d.allow_transition).toBe(false);
    expect(d.status).toBe("blocked");
    expect(d.fail_closed).toBe(true);
  });

  it("grill-me inexistente/absent → BLOCKED", () => {
    const d = evaluateGrillMeTransition({
      risk_tier: "standard",
      phase05_active: true,
      docs_approved: true,
      evidence_status: "absent",
    });
    expect(d.allow_transition).toBe(false);
    expect(d.reason).toContain("absent");
  });

  it("grill-me falha → BLOCKED", () => {
    const d = evaluateGrillMeTransition({
      risk_tier: "standard",
      phase05_active: true,
      docs_approved: true,
      evidence_status: "failed",
    });
    expect(d.allow_transition).toBe(false);
    expect(d.status).toBe("failed");
  });

  it("grill-me válido → planner permitido", () => {
    const d = evaluateGrillMeTransition({
      risk_tier: "standard",
      phase05_active: true,
      docs_approved: true,
      evidence_status: "satisfied",
    });
    expect(d.allow_transition).toBe(true);
    expect(d.status).toBe("satisfied");
  });

  it("exemption explícita válida → EXEMPT + transição", () => {
    const d = evaluateGrillMeTransition({
      risk_tier: "standard",
      phase05_active: true,
      docs_approved: true,
      explicit_exempt: true,
      exempt_reason: "user_skip_grill_me",
    });
    expect(d.required).toBe(false);
    expect(d.allow_transition).toBe(true);
    expect(d.status).toBe("exempt");
  });
});

describe("megabrain-skill-gates — image-to-code", () => {
  it("imagem anexada → required", () => {
    const d = evaluateImageToCodeGate({ image_attachment: true });
    expect(d.required).toBe(true);
    expect(d.allow_transition).toBe(false);
  });

  it("imagem anexada + satisfied → allow", () => {
    const d = evaluateImageToCodeGate({
      image_attachment: true,
      evidence_status: "satisfied",
    });
    expect(d.allow_transition).toBe(true);
  });

  it("sem imagem → não obrigatório", () => {
    const d = evaluateImageToCodeGate({ image_attachment: false });
    expect(d.required).toBe(false);
    expect(d.allow_transition).toBe(true);
  });

  it("require flags aggregam gates activos", () => {
    const flags = skillGatesToRequireFlags([
      evaluateImageToCodeGate({ image_attachment: true }),
      evaluateGrillMeTransition({
        risk_tier: "standard",
        phase05_active: true,
        docs_approved: true,
        evidence_status: "absent",
      }),
    ]);
    expect(flags).toContain("image-to-code");
    expect(flags).toContain("grill-me");
  });
});
