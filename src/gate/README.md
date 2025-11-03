# Storage Endpoint Architecture

This document describes the modular endpoint architecture used for
storage-related API endpoints in the Trezor Evolu Relay project.

## Overview

The storage endpoints follow a **modular, separation-of-concerns**
architecture where each endpoint is organized into its own directory
with clearly defined responsibilities:

## Architecture Principles

### 1. **Separation of Concerns**

Each file has a single, well-defined responsibility:

- **`xyzEndpoint.ts`**: Configuration object of the endpoint
- **`xyzHandler.ts`**: HTTP layer (validation, error mapping, response codes)
- **`xyzOperation.ts`**: Pure business logic (no HTTP concepts)
- **`xyzSchema.ts`**: Input validation schemas
- **`xyzSerializer.ts`**: Output formatting (transforms operation result to HTTP response)

> **Note**: If endpoint is very simple, one or multiple of the files can be omitted.
> Most simple endpoints will just have `xyzEndpoint.ts` and `xyzHandler.tsx`.

### 2. **Dependency Injection**

All external dependencies are explicitly passed as function parameters:

```typescript
export const transferHandler =
    (deps: TransferHandlerDeps) => (request: FastifyRequest, reply: FastifyReply) => {
        /* ... */
    };
```

Because:

- Easy testing (mock dependencies)
- Clear dependency requirements
- Type-safe dependency management

### 3. **Result Type Pattern**

Operations return `Result<T, E>` types for explicit error handling:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

This forces exhaustive error handling and eliminates exceptions as control flow.

### 4. **Branded Types**

Uses Evolu's branded types for domain validation:

```typescript
type PublicKey = string & Brand<'PublicKey'>;
type OwnerId = string & Brand<'OwnerId'>;
```

This prevents mixing incompatible string types at compile time.

## File Responsibilities

### `xyzEndpoint.ts`

**Purpose**: Endpoint descriptor containing metadata for registration.

**Contains**:

- Reference to Fastify validation schema
- Factory function for creating the handler with dependencies

**Example**:

```typescript
export const transferEndpoint = {
    schema: transferRequestSchema,
    createHandler: (deps: TransferHandlerDeps) => transferHandler(deps),
};
```

**Why**: Provides a single source of truth for endpoint configuration, enabling automatic route registration.

---

### `xyzHandler.ts`

**Purpose**: HTTP layer - bridges web requests to business logic.

**Responsibilities**:

- Request validation (using Evolu schemas)
- Calling operation functions
- Mapping operation errors to HTTP status codes
- Calling serializers for response formatting
- HTTP-specific concerns (status codes, headers)

**Example**:

```typescript
export const transferHandler =
    (deps: TransferHandlerDeps) => (request: FastifyRequest, reply: FastifyReply) => {
        // 1. Validate input
        const validationResult = transferEvoluSchema.from(request.body);
        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        // 2. Execute business logic
        const result = transferStorageOperation(deps, validationResult.value);

        // 3. Handle errors
        if (!result.ok) {
            return handleError(reply, result.error);
        }

        // 4. Serialize and send response
        return reply.code(200).send(serializeTransferResponse(result.value));
    };
```

**Why**: Isolates HTTP concerns from business logic. Operations can be tested without HTTP mocking.

---

### `xyzOperation.ts`

**Purpose**: Pure business logic - no HTTP, no side effects (except through dependencies).

**Responsibilities**:

- Core business rules
- Orchestrating calls to dependencies (database, external services)
- Error handling (business errors, not HTTP errors)

**Example**:

```typescript
export const nefariousOperation = (
    deps: NefariousOperationDeps,
    input: NefariousOperationInput,
): Result<NefariousOperationOutput, NefariousStorageError> => {
    const { curses, potions, spells, charms } = input;

    const result = [];

    const a = deps.a.doSomeMagic(curses, charms);
    const b = deps.b.doMoreMagic(spells);

    if (potions !== null) {
        result.push(brewPotions());
    }

    const c = combineMagicsInNefariousWay(a, b);

    if (!c.isNefariousEnough()) {
        return err({ type: 'NotEvilEnough' });
    }

    result.push(c);

    return ok(result);
};
```

**Why**:

- Testable without HTTP infrastructure
- Reusable across different interfaces
- Easy to reason about (pure functions)

---

### `xyzSchema.ts`

**Purpose**: Input validation schemas.

**Contains**:

- Schema to be used in Fastify/Handler (depends on implementation)
  to validate (and transform) HTTP body/query into Typed inputs.

---

### `xyzSerializer.ts`

**Purpose**: Transform operation output into HTTP response format.

**Responsibilities**:

- Converts the business operation result to HTTP data
- Compatibility, versions, ...

**Example**:

```typescript
export const serializeTransferResponse = (data: {
    proof: Proof;
    size: Size;
    timestamp: Timestamp;
    publicKey: PublicKey;
}): TransferResponse => ({
    proof: data.proof,
    size: data.size,
    timestamp: data.timestamp,
    publicKey: data.publicKey,
});
```

**Why**:

- Decouples internal representation from API contract
- Easy to modify response format without touching business logic
- Enables API versioning (v1, v2 serializers)

---

### `registerXyzEndpoints.ts`

**Purpose**: Central registration of all endpoints (from Xyz domain).

**Responsibilities**:

- Registers all storage endpoints with Fastify
- Injects dependencies into handlers
- Documents all available endpoints in one place

**Example**:

```typescript
export const registerStorageEndpoints = ({
    server,
    otherDependency,
}: RegisterStorageEndpointsDeps) => {
    // Register transfer endpoint
    server.post(
        '/register',
        transferEndpoint.schema,
        transferEndpoint.createHandler({ otherDependency }),
    );

    // Register ask endpoint
    server.get('/ask', askEndpoint.schema, askEndpoint.createHandler({ otherDependency }));

    // ... more endpoints
};
```

**Why**: Single location to see all storage routes, easy to add/remove endpoints.

## Testing Strategy

### Unit Tests

- **Operations**: Test business logic in isolation with mocked dependencies
- **Serializers**: Test data transformation
- **Schemas**: Test validation rules

### Integration Tests

- **Handlers**: Test HTTP layer with Fastify's `.inject()` method
- **Full Endpoint**: Test end-to-end with real Fastify server
