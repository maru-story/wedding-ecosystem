# Security Policy - Wedding Ecosystem

We take the security and privacy of wedding hosts and their guests very seriously. This document outlines our security posture, encryption policies, and vulnerability disclosure process.

## Security Posture & Safeguards

1. **Tenant Isolation**: Every database query is strictly scoped by `tenant_id` at the repository/middleware layer. Cross-tenant data access is strictly forbidden.
2. **PII Encryption at Rest**: Sensitive guest data, including phone numbers and email addresses, is encrypted at rest using AES-256-CBC. Plaintext values are never logged or stored.
3. **Encrypted QR Codes**: Guest QR check-in codes contain secure encrypted payloads containing `guest_id`, `event_id`, timestamps, and nonces. They are verified against server timestamps to prevent duplicate scan replay attacks.
4. **Rate Limiting**: API routes are protected by a Redis-backed rate limiting middleware to prevent brute force and denial of service attacks.
5. **Secret Detection**: Pre-commit hooks (`scripts/detect-secrets.sh`) and CI pipelines prevent secrets, keys, and tokens from being committed to source control.

## Supported Versions

Only the latest main branch version is actively supported with security updates.

| Version | Supported            |
| ------- | -------------------- |
| 1.0.x   | Yes (Current Active) |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it immediately:

1. Email security reports to **security@maru-wedding.co.id** (or open an issue with appropriate security tags if working on private repositories).
2. Do not disclose the vulnerability publicly until it has been patched and resolved.
3. We aim to acknowledge reports within 48 hours and release a patch within 7 days.
