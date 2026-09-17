# 🛒 MarketVerse — AI-Powered Multi-Vendor E-Commerce Platform

MarketVerse is a next-generation, high-performance multi-vendor e-commerce platform built for the Bangladeshi and international marketplace. It features an intelligent AI suite (Seller Copilot, Smart Search, Fashion Stylist, and AI Support Assistant), multi-vendor stores, instant notifications, automated order workflows, and real-time payment gateway integration.

---

## 🏗️ Architecture & Technology Stack

```mermaid
graph TD
    Client["Client Frontend<br/>React 19 + Vite + Tailwind CSS + Lucide"]
    
    subgraph Backend_App["Server Runtime (Node.js / ESM)"]
        Hono["Hono Web Framework & HTTP Gateway"]
        TRPC["tRPC API Router (Type-Safe Procedures)"]
        WS["WebSocket Real-Time Sync Server"]
        AICopilot["AI Multi-Agent Engines & OpenAI GPT-4o-mini"]
    end
    
    subgraph Data_Layer["100% MySQL Database Layer"]
        MySQLPool["MySQL2 Connection Pool & Auto-Reconnect"]
        DrizzleSchema["Typed Schema (Users, Sellers, Products, Orders, Reviews)"]
    end
    
    subgraph External_Services["External Cloud & Services"]
        SSLCommerz["SSLCommerz Payment Gateway (bKash/Nagad/Cards)"]
        OpenAI["OpenAI API (GPT-4o-mini / Embeddings)"]
        SMTP["Gmail SMTP / Nodemailer (Transactional Emails)"]
    end

    Client -->|tRPC / HTTP| Hono
    Client -->|WebSocket| WS
    Hono --> TRPC
    TRPC --> AICopilot
    TRPC --> MySQLPool
    MySQLPool --> DrizzleSchema
    TRPC --> SSLCommerz
    TRPC --> SMTP
    AICopilot --> OpenAI
```

### Core Technologies
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide Icons, Sonner.
- **Backend**: Hono, tRPC v11, SuperJSON, WebSocket (`ws`), Node.js (ESM).
- **Database**: **100% MySQL 8.0+** using `mysql2/promise` with auto-reconnecting connection pool.
- **AI & Intelligence**: OpenAI `gpt-4o-mini`, Vector Search, Multi-Engine Seller Copilot V2, Deterministic SEO & Pricing Engines.
- **Payments**: SSLCommerz (bKash, Nagad, Rocket, Cards) & Cash on Delivery (COD).

---

## 📁 Repository Directory Structure

```
├── api/                     # Backend API & tRPC Routers
│   ├── boot.ts              # Production server bootstrap & static file server
│   ├── router.ts            # Root tRPC application router
│   ├── adminRouter.ts       # Platform administration, analytics, & seller approvals
│   ├── sellerRouter.ts      # Seller Hub, catalog management, AI auto-suggest, payouts
│   ├── orderRouter.ts       # Order lifecycle, delivery status, SSLCommerz integration
│   ├── productRouter.ts     # Public catalog, filters, multi-vendor search
│   ├── reviewRouter.ts      # Dynamic order reviews & verified buyer submissions
│   ├── brainRouter.ts       # Enterprise AI Copilot conversation manager
│   ├── auth-router.ts       # Authentication, session tokens, profile & addresses
│   └── lib/                 # Payment, mailer, and environment helpers
├── db/                      # Database Schema & Migrations
│   ├── mysql.ts             # MySQL connection pool, table builders, and query executor
│   ├── schema.ts            # E-commerce schema (Users, Products, Orders, Reviews, etc.)
│   ├── aiSchema.ts          # AI memory, vector embeddings, and session state tables
│   ├── seed.ts              # Automated database seeding utility
│   └── clear.ts             # Safe database cleanup utility
├── server/                  # AI Multi-Agent & Copilot Engines
│   └── ai/                  # Seller Copilot, SEO engine, pricing, and prompt managers
├── src/                     # React Frontend Application
│   ├── components/          # Reusable UI widgets (Layout, Modals, ReviewModal, etc.)
│   ├── pages/               # Application views (Home, Products, Checkout, Dashboard, etc.)
│   ├── hooks/               # Custom React hooks (useAuth, etc.)
│   ├── providers/           # tRPC and React Query providers
│   └── lib/                 # Utility functions (currency, formatting, inventory)
├── scripts/                 # Maintenance, migration, and automation scripts
├── Dockerfile               # Production multi-stage Docker build
└── docker-compose.yml       # Complete stack with MySQL 8.0 container
```

---

## ⚡ Quick Start & Local Development

### 1. Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **Docker Desktop** with Compose, or **MySQL 8.0+** running locally

### 2. Environment Setup
The recommended setup is one command:

```bash
npm run setup
```

This creates `.env`, installs dependencies, starts MySQL when Docker is available, seeds the database, and starts the development server. To configure it manually, copy `.env.example` to `.env` and fill in the values:

`npm run dev` alone only starts Vite. It does not install Node.js, MySQL, Docker, Ollama, or AI model weights. Install Ollama separately; `npm run setup` pulls `qwen2.5:3b-instruct` and `nomic-embed-text` when Ollama is available.
```env
# Database Connection (MySQL)
DATABASE_URL=mysql://root:password@localhost:3306/ecommerce_db

# Security & App
APP_SECRET=your_super_secret_key_32_characters_long
PORT=3000

# OpenAI API Key (Powers Copilot V2 & Auto-Suggest)
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# SSLCommerz Payment Gateway
SSLCOMMERZ_STORE_ID=your_merchant_store_id
SSLCOMMERZ_STORE_PASSWORD=your_merchant_password
SSLCOMMERZ_IS_LIVE=false
```

### 3. Install & Run Manually
```bash
# Install dependencies
npm install

# Start local development server (with hot module reload)
npm run dev
```
Visit **`http://localhost:5173`** (Vite Dev) or **`http://localhost:3000`** (Full Server).

---

## 🗄️ Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:seed` | Populates default categories, demo accounts, and test stores |
| `npm run db:clear` | Safely wipes dummy product/order data for a clean slate |
| `npm run check` | Runs TypeScript compilation checks across the whole codebase |

---

## 👥 Demo & Testing Credentials

| Role | Login Phone | Password | Capabilities |
|------|-------------|----------|--------------|
| **Customer** | Any valid phone | Chosen at signup | Browse, Cart, Checkout with SSLCommerz, Review Delivered Items |
| **Seller** | `01700000001` | `seller123` | Seller Hub, Product Management, AI Auto-Suggest, Copilot V2 |
| **Admin** | `01700000006` | `admin123` | Order Status Updates, Seller Approvals, Site-wide Analytics |

---

## 🚀 Production Deployment

### Option A: Docker Compose (One-Click)
```bash
docker compose up -d --build
```
This automatically boots:
- MySQL 8.0 with persistent data storage
- Production-bundled Node.js backend & frontend on port 3000

### Option B: Cloud Platforms (Railway / Render / VPS)
1. Set `DATABASE_URL` pointing to your hosted MySQL instance.
2. Build and start:
```bash
npm run build
npm run start
```

---

## 🔒 Security & Best Practices
- **Parameterized SQL**: All database queries are parameter-escaped to prevent SQL injection.
- **Role-Based Middleware**: Access control on all sensitive endpoints (Admin, Seller, Customer).
- **Zero Dummy Data**: Clean schema design with dynamic database-backed reviews and verified purchases.

---

## 📄 License
MIT License. Built with ❤️ for next-generation multi-vendor commerce.
