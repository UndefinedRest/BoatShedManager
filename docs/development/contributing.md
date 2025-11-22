# Contributing to LMRC

**Last Updated**: 2025-11-22
**Status**: TODO - Needs content

---

## Engineering Principles

### 1. Test-First Development

**All changes require test coverage before production deployment.**

- Write tests before implementation
- Maintain >80% coverage
- Run full test suite before committing

### 2. Documentation

- Update documentation with code changes
- Use inline comments sparingly (prefer self-documenting code)
- Update architecture docs for structural changes

### 3. Simplicity Over Complexity

- Avoid over-engineering
- Make only necessary changes
- Don't add features beyond requirements
- Three similar lines is better than premature abstraction

### 4. No Backwards-Compatibility Hacks

- Delete unused code completely
- No `_vars` for unused parameters
- No `// removed` comments
- No unnecessary re-exports

## Development Workflow

TODO: Document standard workflow

### 1. Before Starting

- Read [.claude/CONTEXT.md](../../.claude/CONTEXT.md)
- Check [todo.md](../planning/todo.md) for current priorities
- Review [roadmap](../planning/roadmap.md)

### 2. Making Changes

TODO: Document change process

### 3. Testing

See [Testing Guide](testing-guide.md)

### 4. Committing

TODO: Document commit message conventions

### 5. Deploying

See [Deployment Guide](../deployment/production-setup.md)

## Code Standards

TODO: Document coding standards
- TypeScript patterns
- File naming conventions
- Module structure

## Security

TODO: Document security guidelines
- No command injection
- No XSS vulnerabilities
- No SQL injection
- Input validation at boundaries only

---

**See Also**:
- [Getting Started](getting-started.md)
- [Testing Guide](testing-guide.md)
- [Architecture Overview](../architecture/overview.md)
