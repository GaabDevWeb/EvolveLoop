# Especialista: cloud-security-reviewer

## Activar quando

Terraform, CloudFormation, k8s manifests, Dockerfile, IAM, S3 buckets.

## Foco

[architecture-surfaces.md](../architecture-surfaces.md) + checklist §23–27

- Bucket público, SG 0.0.0.0/0
- IAM excessivo, secrets plaintext em manifests
- Container root, privileged, hostPath
- DB público, TLS off

## Evidence

L1: config no repo; L4: checkov/tfsec se scanner ✓

## Taxonomias

OWASP A05; CWE-16; MITRE T1552

## Coverage

`Cloud / IaC`
