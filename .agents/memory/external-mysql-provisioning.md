---
name: External MySQL provisioning
description: Environment constraint for MatchZone's database setup.
---

MatchZone cannot use the workspace-managed `DATABASE_URL` because that value is PostgreSQL and is runtime-managed. No local MySQL service or MySQL integration is available in this workspace, so the API requires a separately provisioned reachable MySQL 8+ connection before startup verification can succeed.

**Why:** The API validates the connection URL protocol and intentionally refuses PostgreSQL to prevent running against the wrong database.

**How to apply:** When resuming database setup, obtain the external MySQL URL through the secure environment flow and keep the JWT signing secret in Replit Secrets; never overwrite the managed PostgreSQL URL or expose either credential.