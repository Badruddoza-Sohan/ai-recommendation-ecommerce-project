# AI Project Overview

This document reflects the current state of the project as of 2026-07-19. It summarizes the architecture, main features, runtime flow, and local development workflow for this AI-powered multi-vendor e-commerce application.

## Project Summary

This is a full-stack e-commerce platform built with:
- React + TypeScript + Vite for the frontend
- Hono for the backend API layer
- tRPC for typed API routes
- MySQL via mysql2 for relational database persistence
- Schema definitions: `db/schema.ts`
- Seed data: `db/seed.ts`

## Main Features

### Commerce
- Product catalog with categories and detail pages
- Seller and storefront browsing
- Shopping cart and checkout flow
- Orders, wishlist, notifications, and profile management
- Inventory-aware product data

### AI Features
- AI seller assistant for content generation and insights
- AI fashion stylist for outfit, color, seasonal, and occasion recommendations
- AI support chat for customer support questions and order help

### Roles and Access
- Customer experience
- Seller dashboard and AI tools
- Admin dashboard for management tasks

## Runtime Flow

1. Vite serves the frontend and Hono API locally on port 5173.
2. The Hono server handles API requests and serves the app in production.
3. tRPC routes are exposed under `/api/trpc`.
4. MySQL 8 is initialized and seeded locally using Docker Compose or an existing MySQL server.

## Scripts

Use these commands from the project root:

- `npm run setup` – create environment, install dependencies, prepare MySQL, seed data, and start development
- `npm install` – install dependencies manually
- `npm run dev` – start the Vite/Hono development app
- `npm run dev:all` – seed the database and start the app
- `npm run build` – build the frontend and backend bundle
- `npm run test` – run Vitest test suite
- `npm run db:seed` – populate the database with sample data

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

Key variables:
- `DATABASE_URL` – MySQL connection URL, commonly `mysql://root:password@127.0.0.1:3306/ecommerce_db`
- `APP_ID` and `APP_SECRET` – backend auth-related values
- `KIMI_AUTH_URL` and `KIMI_OPEN_URL` – Kimi integration endpoints
- `OWNER_UNION_ID` – admin role assignment on first login
- `VITE_*` values – frontend variables exposed to the browser

## Local Setup (Windows)

1. Install Node.js 18+
2. Run `npm run setup`

## Notes

- The project uses MySQL for local development. Docker Compose is the reproducible default.
- The schema is created automatically from the table definitions in `db/schema.ts`.
- The seed script generates demo users, categories, sellers, products, orders, reviews, notifications, and support knowledge entries.


