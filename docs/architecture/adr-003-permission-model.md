# ADR-003: Centralized permission resolver

Status: Accepted.

Permissions are resolved in `@voxora/permissions`. UI visibility is convenience only; the control API always performs authoritative checks. The initial roles are Owner, Admin, Moderator, Member and Guest. The model is intentionally structured so numeric permission power can be added later.
