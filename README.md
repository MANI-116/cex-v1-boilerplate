# Spot Exchange Engine

A TypeScript/Bun implementation of a centralized spot-exchange prototype, built to explore the core mechanics of an exchange rather than hide them behind a framework.

> **Status:** Engineering prototype. Not production-ready and not suitable for real-money trading.

## Architecture

```text
HTTP Client
    │
    ▼
Express API
    │  command + correlationId
    ▼
Redis
    │
    ▼
Matching Engine
    ├── Order Book per asset
    ├── Bid / Ask price structures
    ├── FIFO orders per price level
    ├── In-memory balances
    └── Matching + fill processing
    │
    ▼
PostgreSQL
    └── Users / Orders / Fills
    │
    ▼
Redis response queue
    │
    ▼
Backend response worker
    └── resolves the waiting request
```

The important design boundary is the **matching engine vs. API**. HTTP handlers publish commands; the engine owns order-book state and matching decisions.

## Matching Engine

The order book is represented as:

```text
Asset
 ├── Bids → price levels → FIFO orders
 └── Asks → price levels → FIFO orders
```

Orders use `BigInt` quantities and prices to avoid floating-point arithmetic in financial state. Each price level maintains an intrusive doubly-linked FIFO list, while separate price structures track executable levels. Orders are also indexed by ID so the engine can retain direct references to active order nodes.

The engine supports the core limit-order flow: validate an order, lock the required balance/asset quantity, look for executable liquidity, execute fills, update order state, and place remaining quantity on the book.

## Backend

The Express service currently provides the initial exchange API surface:

- `POST /signup`
- `POST /signin`
- `POST /order`
- planned order lookup/cancellation, depth, fills, and balance endpoints

Authentication uses bcrypt password hashing and JWT-based authentication cookies. Request payloads are validated with Zod before being sent toward the engine.

## Persistence

PostgreSQL is modeled through Prisma with entities for:

- Users
- Assets
- Orders
- Fills

The database records durable order/fill state while the matching engine keeps its active book and balance state in memory.

## Why this project exists

This project was built to understand the engineering problems underneath a CEX:

- price-time priority
- FIFO matching
- price-level data structures
- partial fills
- balance locking
- asynchronous engine communication
- correlation of asynchronous responses with HTTP requests
- separating hot in-memory state from durable persistence

It is intentionally lower-level than a typical CRUD trading application.

## Known limitations

This is an exploratory implementation, so several production concerns remain intentionally unresolved or incomplete: durable engine recovery, atomic database/state transitions, robust concurrency control, complete order cancellation/query APIs, market-order semantics, distributed failure handling, observability, and comprehensive integration/load testing.

These limitations are part of the project's learning trajectory and should not be interpreted as production guarantees.

## Tech Stack

- TypeScript
- Bun
- Express
- Redis
- PostgreSQL
- Prisma
- Zod
- bcrypt / JWT

## Repository Structure

```text
apps/
├── backend/      # HTTP API and response handling
└── engine/       # Matching engine and order-book structures

packages/
└── db/           # Prisma schema/client
```

## Running locally

The repository uses Bun workspaces.

```bash
bun install
```

Configure the required PostgreSQL/Redis environment variables, then start the backend and engine according to their package scripts.

## Disclaimer

Educational software only. Do not use this implementation for custody, real-money trading, or production financial systems.
