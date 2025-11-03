# Storage Endpoint Architecture

This document describes the modular endpoint architecture used for storage-related API endpoints in the Trezor Evolu Relay project.

## Overview

The storage endpoints follow a **modular, separation-of-concerns** architecture where each endpoint is organized into its own directory with clearly defined responsibilities:

```
src/gate/storage/
├── endpoints/
│   ├── transfer/          # POST /storage/add - Transfer storage from pubkey to owner
│   │   ├── endpoint.ts    # Endpoint descriptor (metadata)
│   │   ├── handler.ts     # HTTP layer (request/response handling)
│   │   ├── operation.ts   # Business logic (pure functions)
│   │   ├── schema.ts      # Validation schemas (Fastify + Evolu)
│   │   └── serializer.ts  # Response serialization
│   │
│   ├── ask/               # GET /storage/ask - Query storage by owner/pubkey
│   │   ├── endpoint.ts
│   │   ├── handler.ts
│   │   ├── operation.ts
│   │   ├── schema.ts
│   │   └── serializer.ts
│   │
│   └── register/          # POST /storage/register - Register new storage
│       ├── endpoint.ts
│       ├── handler.ts
│       ├── operation.ts
│       ├── schema.ts
│       └── serializer.ts
│
├── registerStorageEndpoints.ts  # Central registration function
├── storage.routes.ts            # Route path constants
└── README.md                    # This file
```

## Architecture Principles

### 1. **Separation of Concerns**

Each file has a single, well-defined responsibility:

- **`endpoint.ts`**: Metadata only (method, path, schema reference)
- **`handler.ts`**: HTTP layer (validation, error mapping, response codes)
- **`operation.ts`**: Pure business logic (no HTTP concepts)
- **`schema.ts`**: Input validation (Fastify + Evolu schemas)
- **`serializer.ts`**: Output formatting (transforms operation result to HTTP response)

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

### `endpoint.ts`

**Purpose**: Endpoint descriptor containing metadata for registration.

**Contains**:

- HTTP method (`GET`, `POST`, etc.)
- URL path
- Reference to Fastify validation schema
- Factory function for creating the handler with dependencies

**Example**:

```typescript
export const transferEndpoint = {
    method: 'POST' as const,
    path: '/storage/add',
    schema: transferRequestSchema,
    createHandler: (deps: TransferHandlerDeps) => transferHandler(deps),
};
```

**Why**: Provides a single source of truth for endpoint configuration, enabling automatic route registration.

---

### `handler.ts`

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

### `operation.ts`

**Purpose**: Pure business logic - no HTTP, no side effects (except through dependencies).

**Responsibilities**:

- Core business rules
- Orchestrating calls to dependencies (database, external services)
- Error handling (business errors, not HTTP errors)
- Data transformation

**Example**:

```typescript
export const transferStorageOperation = (
    deps: TransferOperationDeps,
    input: TransferOperationInput,
): Result<TransferOperationOutput, TransferStorageError> => {
    const { size, publicKey, ownerId } = input;

    const result = deps.limitStorage.transferSpaceLimitToOwner({
        publicKey,
        ownerId,
        size,
    });

    if (!result.ok) {
        return { ok: false, error: { type: result.error.type } };
    }

    return {
        ok: true,
        value: {
            /* ... */
        },
    };
};
```

**Why**:

- Testable without HTTP infrastructure
- Reusable across different interfaces
- Easy to reason about (pure functions)

---

### `schema.ts`

**Purpose**: Input validation schemas.

**Contains**:

- **Fastify JSON Schema**: Fast validation, OpenAPI generation
- **Evolu Schema**: Runtime type creation, branded types
- TypeScript types derived from schemas

**Example**:

```typescript
// Fastify schema (for fast validation)
export const transferRequestSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                publicKey: { type: 'string' },
                ownerId: { type: 'string' },
                size: { type: 'number' },
            },
            required: ['publicKey', 'ownerId', 'size'],
        },
    },
} as const;

// Evolu schema (for branded types)
export const transferEvoluSchema = object({
    publicKey: PublicKey,
    ownerId: OwnerId,
    size: Size,
});
```

**Why**: Dual validation approach provides both performance (Fastify) and type safety (Evolu).

---

### `serializer.ts`

**Purpose**: Transform operation output into HTTP response format.

**Responsibilities**:

- Field renaming (if needed)
- Data formatting
- Adding metadata
- Response structure standardization

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

### `registerStorageEndpoints.ts`

**Purpose**: Central registration of all storage endpoints.

**Responsibilities**:

- Registers all storage endpoints with Fastify
- Injects dependencies into handlers
- Documents all available endpoints in one place

**Example**:

```typescript
export const registerStorageEndpoints = ({
    server,
    limitStorage,
}: RegisterStorageEndpointsDeps) => {
    // Register transfer endpoint
    server.post(
        transferEndpoint.path,
        transferEndpoint.schema,
        transferEndpoint.createHandler({ limitStorage }),
    );

    // Register ask endpoint
    server.get(askEndpoint.path, askEndpoint.schema, askEndpoint.createHandler({ limitStorage }));

    // ... more endpoints
};
```

**Why**: Single location to see all storage routes, easy to add/remove endpoints.

## Adding a New Endpoint

Follow these steps to add a new endpoint:

### 1. Create Endpoint Directory

```bash
mkdir -p src/gate/storage/endpoints/myendpoint
```

### 2. Create `schema.ts`

Define Fastify and Evolu validation schemas:

```typescript
import { object } from '@evolu/common';
import { MyInput } from '../../../../types.js';

export const myEndpointRequestSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                field: { type: 'string' },
            },
            required: ['field'],
        },
    },
} as const;

export const myEndpointEvoluSchema = object({
    field: MyInput,
});
```

### 3. Create `operation.ts`

Implement business logic:

```typescript
import { Result } from '../../../types.js';

export type MyOperationDeps = {
    // Define dependencies
};

export const myOperation = (deps: MyOperationDeps, input: MyInput): Result<MyOutput, MyError> => {
    // Business logic here
};
```

### 4. Create `serializer.ts`

Format the response:

```typescript
export const serializeMyResponse = (data: MyOutput): MyResponse => ({
    // Transform data
});
```

### 5. Create `handler.ts`

Handle HTTP requests:

```typescript
import { FastifyReply, FastifyRequest } from 'fastify';

export const myHandler =
    (deps: MyHandlerDeps) => (request: FastifyRequest, reply: FastifyReply) => {
        const validationResult = myEndpointEvoluSchema.from(request.body);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        const result = myOperation(deps, validationResult.value);

        if (!result.ok) {
            // Handle errors
            return reply.code(500).send({ error: 'Error' });
        }

        return reply.code(200).send(serializeMyResponse(result.value));
    };
```

### 6. Create `endpoint.ts`

Define endpoint descriptor:

```typescript
export const myEndpoint = {
    method: 'POST' as const,
    path: '/storage/my-endpoint',
    schema: myEndpointRequestSchema,
    createHandler: (deps: MyHandlerDeps) => myHandler(deps),
};
```

### 7. Register in `registerStorageEndpoints.ts`

Add to registration function:

```typescript
import { myEndpoint } from './endpoints/myendpoint/endpoint.js';

export const registerStorageEndpoints = ({ server, limitStorage }) => {
    // ... existing endpoints

    server.post(myEndpoint.path, myEndpoint.schema, myEndpoint.createHandler({ limitStorage }));
};
```

## Testing Strategy

### Unit Tests

- **Operations**: Test business logic in isolation with mocked dependencies
- **Serializers**: Test data transformation
- **Schemas**: Test validation rules

### Integration Tests

- **Handlers**: Test HTTP layer with Fastify's `.inject()` method
- **Full Endpoint**: Test end-to-end with real Fastify server

Example operation test:

```typescript
describe('transferStorageOperation', () => {
    it('transfers storage successfully', () => {
        const mockLimitStorage = {
            transferSpaceLimitToOwner: vi.fn(() => ({ ok: true, value: {} })),
        };

        const result = transferStorageOperation(
            { limitStorage: mockLimitStorage },
            { publicKey, ownerId, size },
        );

        expect(result.ok).toBe(true);
        expect(mockLimitStorage.transferSpaceLimitToOwner).toHaveBeenCalled();
    });
});
```

## Future Enhancements

Potential improvements to this architecture:

1. **Shared Error Handler**: Extract common error handling to reduce duplication
2. **Middleware**: Add authentication, rate limiting as separate middleware
3. **OpenAPI Generation**: Generate API docs from endpoint descriptors
4. **Validation Helpers**: Create utilities for common validation patterns
5. **Response Transformers**: Add middleware for common response transformations
