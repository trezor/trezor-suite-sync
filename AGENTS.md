## Skills

Read the relevant skills before making changes.

- [Dependency Injection](skills/dependency-injection/SKILL.md) - Mandatory when adding or changing services, factories, dependency shapes, or composition roots.

## Repo Notes

- Read [README.md](README.md) before setup or runtime changes.
- Read [Quota Manager README](src/quotaManager/README.md) before changing quota-manager endpoints.

## Important decisions

- The relationship `ownerId <-> publicKey` must never be known, stored, handler nor logged.
  This is extremely important. We do not want to know that. This is absolutely crucial privacy
  aspect of this setup.
