# Spot Exchange

A TypeScript/Bun implementation of a centralized spot exchange, built from the matching engine upward.

> **Status:** Engineering prototype — not production-ready for real-money trading.

## What this project demonstrates

- User authentication and account setup
- Order validation with Zod
- Spot asset and balance management
- Bid/ask order books
- Price-level data structures
- Limit-order matching
- FIFO order queues within price levels
- Asynchronous backend ↔ engine communication using Redis
- Correlation-based response handling
- Deterministic in-memory engine state

## Architecture

```text
Client
  │
  │ HTTP
  ▼
Backend API
  │
  │ Command + correlationId
  ▼
Redis
  │
  ▼
Matching Engine
  │
  ├── Order Book
  │    ├── Bid Tree
  │    └── Ask Tree
  │
  ├── Orders
  ├── User Balances
  └── Matching Logic
  │
  │ Engine Response
  ▼
Redis Response Queue
  │
  ▼
Backend Response Worker
  │
  │ correlationId
  ▼
HTTP Response
```

The matching engine is kept separate from the HTTP layer. The API publishes a command and waits asynchronously for the corresponding engine response instead of embedding matching logic inside request handlers.

## Matching Engine

The core of the project is the limit-order matching engine.

Orders are organized by **side → price level → FIFO queue**:

```text
                 Order Book

       Bids                         Asks
        │                            │
     Bid Tree                     Ask Tree
        │                            │
   Price Levels                 Price Levels
        │                            │
   FIFO Orders                  FIFO Orders
```

The engine maintains references to active orders so that order-book operations can efficiently locate and update orders.

### Matching principle

For a limit order, the engine evaluates the opposite side of the book and executes eligible orders according to price priority, while preserving FIFO ordering at the same price level.

This project was deliberately built around the data structures required by a matching engine rather than treating the order book as a simple array.

## Request lifecycle

```text
POST /order
     │
     ▼
Validate payload
     │
     ▼
Generate correlation ID
     │
     ▼
Publish command
     │
     ▼
Redis
     │
     ▼
Matching Engine
     │
     ├── Validate engine state
     ├── Find executable orders
     ├── Match / partially fill
     └── Update balances + book
     │
     ▼
Response Queue
     │
     ▼
Response Worker
     │
     ▼
Resolve pending request
     │
     ▼
HTTP response
```

## Engineering focus

The purpose of this project was to understand the foundations of exchange infrastructure:

- How an order book is represented in memory
- Why price-time priority matters
- How FIFO queues interact with price levels
- How matching mutates balances and orders
- How an API can communicate with an isolated engine
- How correlation IDs connect asynchronous processing back to requests

## Tech Stack

- **TypeScript**
- **Bun**
- **Redis**
- **Express**
- **Zod**
- **Prisma**
- **PostgreSQL**

## Evolution

This project is the earlier **spot-exchange implementation** that led into my later perpetual-futures exchange work, [PerpX](https://github.com/MANI-116/Centralized-Exchange-Perpetual-futures-perps-).

PerpX extends the exchange architecture into leveraged perpetual futures with positions, margin, liquidation, event-driven projections, WebSockets, snapshots, and crash recovery.

## Running locally

```bash
bun install
bun run index.ts
```

## Disclaimer

This is an educational engineering project. It is not suitable for custody, real-money trading, or production financial use.
