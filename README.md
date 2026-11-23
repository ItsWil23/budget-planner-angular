# Budget Planner

Budget Planner is an Angular application for personal budgeting. It is designed to compare a monthly planned budget
with actual transactions, with a responsive interface available in French and English.

> **Project status:** this project is currently a frontend prototype. Screens use in-memory mock data, with no
> backend or persistence; changes are not retained after reloading the page. Authentication, external services, and
> deployment are not configured.

## Features

The application currently includes these screens:

- **Dashboard**: an overview of the current month.
- **Monthly budget**: planned-versus-actual budget tracking.
- **Transactions**: view and manage transactions.
- **Categories**: organize budget categories.
- **Settings**: application preferences, including theme and language.
- **Sign in and sign up**: frontend screens without real authentication.

The full product scope is described in the [PRD](./PRD.md). It includes features that may not yet be implemented in
this prototype.

## Tech stack

- Angular 22 with standalone components and signals
- TypeScript in strict mode
- SCSS, with no CSS framework
- Transloco for runtime internationalization (French and English)
- Vitest for unit tests
- npm for dependency and script management

## Prerequisites

- Node.js compatible with Angular 22
- npm (the package manager version used by this project is specified in `package.json`)

## Installation and development

From the project root, install the dependencies and start the development server:

```bash
npm install
npm start
```

Then open [http://localhost:4200](http://localhost:4200). The server reloads the application when source files
change.

## Available scripts

| Command | Description |
|---|---|
| `npm start` | Starts the Angular development server. |
| `npm run build` | Builds the application. Build artifacts are generated in `dist/`. |
| `npm test` | Runs unit tests with Vitest. |
| `npm run watch` | Continuously rebuilds using the development configuration. |

No end-to-end test or lint script is currently configured.

## Main routes

| URL | Screen |
|---|---|
| `/` | Home |
| `/auth/login` | Sign in |
| `/auth/register` | Sign up |
| `/dashboard` | Dashboard |
| `/budget-mensuel` | Monthly budget |
| `/transactions` | Transactions |
| `/categories` | Categories |
| `/settings` | Settings |

## Code structure

Application code is located in `src/app/`:

- `pages/`: route-level screens
- `components/`: reusable components, including layout and UI components
- `services/`: data access and application logic
- `models/`: TypeScript types and models
- `mocks/`: temporary data used during the frontend phase

Components access data through services rather than directly through mocks. This separation prepares the application
for replacing local data with an API in the future.

For product decisions, architecture conventions, and visual design rules, see the [PRD](./PRD.md),
[ARCHITECTURE](./ARCHITECTURE.md), and [DESIGN_SYSTEM](./DESIGN_SYSTEM.md), respectively.
