# Project Aura

A scalable E-Commerce platform built with a Microservices architecture, using Node.js, TypeScript, and Docker.

## Architecture

```
Client (React/Mobile)
        |
  API Gateway (Express - Port 3000)
        |
  ┌─────┼──────────┬──────────┐
  |     |          |          |
Identity  Catalog    Cart     Order
:3001    :3002     :3003    :3004
  |       |          |        |
Postgres  MongoDB   Redis   Postgres
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| API Gateway | Express + http-proxy-middleware |
| Identity Service | Express + PostgreSQL (`pg`) + JWT + bcrypt |
| Catalog Service | Express + MongoDB (`mongoose`) |
| Cart Service | Express + Redis (`ioredis`) |
| Order Service | Express + PostgreSQL (`pg`) + Axios |
| API Docs | Swagger UI (swagger-jsdoc) |
| Testing | Jest + ts-jest + Supertest |
| Infrastructure | Docker Compose |

## Getting Started

### Prerequisites

- Node.js v20+
- Docker & Docker Compose
- Git

### Installation

```bash
git clone https://github.com/Jimrealf/project-aura.git
cd project-aura
npm install
```

### Start Infrastructure

```bash
docker compose up -d
```

This spins up PostgreSQL, MongoDB, and Redis containers.

### Run Services

> **Note:** The Catalog Service uses Cloudinary for image uploads. Make sure your `.env` file in `services/catalog-service` has `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` configured.

```bash
npm run dev:gateway    # API Gateway      → http://localhost:3000
npm run dev:identity   # Identity Service → http://localhost:3001
npm run dev:catalog    # Catalog Service  → http://localhost:3002
npm run dev:cart       # Cart Service     → http://localhost:3003
npm run dev:order      # Order Service    → http://localhost:3004
```

### API Documentation

With the gateway running, visit: **http://localhost:3000/api-docs**

### Run Tests

```bash
npm test
```

### Stop Infrastructure

```bash
docker compose down
```

## Project Structure

```
project-aura/
├── api-gateway/             # Express reverse proxy & Swagger UI
├── packages/
│   └── auth-middleware/     # Shared JWT verification (@aura/auth-middleware)
├── services/
│   ├── identity-service/    # Auth & Users (PostgreSQL)
│   ├── catalog-service/     # Products & Inventory (MongoDB)
│   ├── cart-service/        # Shopping Cart (Redis)
│   └── order-service/       # Checkout & Orders (PostgreSQL)
├── docker-compose.yml       # Local infrastructure
├── tsconfig.json            # Shared TypeScript config
└── jest.config.ts           # Test configuration
```

Each microservice follows a layered architecture: `controllers/ → services/ → repositories/`

## API Endpoints

### Identity Service (Port 3001)

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/auth/register` | Public | Customer registration |
| POST | `/api/auth/register/vendor` | Public | Vendor registration |
| POST | `/api/auth/login` | Public | Login (returns JWT) |
| POST | `/api/auth/internal-user` | Admin only | Create support/admin users |
| POST | `/api/auth/forgot-password` | Public | Request password reset token |
| POST | `/api/auth/reset-password` | Public | Reset password with token |

### Catalog Service (Port 3002)

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/products` | Public | List products (pagination, filters, search by `?q=...`) |
| GET | `/api/products/:slug` | Public | View single product |
| POST | `/api/products` | Admin/Vendor | Create product (supports `multipart/form-data` image upload) |
| PUT | `/api/products/:id` | Admin/Vendor | Update product details or images |
| DELETE | `/api/products/:id` | Admin/Vendor | Soft-delete a product |

## Seed Data

Populate the databases with test users and sample products:

```bash
docker compose up -d postgres mongodb
npm run seed:identity
npm run seed:catalog
```

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@aura.com` | `Admin1234` |
| Customer | `john.doe@aura.com` | `Customer123` |
| Vendor | `techstore@aura.com` | `Vendor1234` |
| Support | `support.alex@aura.com` | `Support1234` |

All customer emails use password `Customer123`. All vendor emails use `Vendor1234`.
Full list of seed users is in `services/identity-service/src/utils/seed.ts`.

## License

ISC
