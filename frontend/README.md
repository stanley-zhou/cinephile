# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.




## `frontend/README.md`

```markdown
# Frontend – CINEPHILE React App

This folder contains the **React + Vite** single-page application for CINEPHILE.

## Files

- `src/App.jsx` – main React component:
  - Manages `activeView`, API calls, and state
  - Implements all major views (Discover, People, Analytics, Library)
  - Contains the “Browse All Movies” table with search + sort + pagination
  - Handles the movie detail modal logic
- `src/App.css` – global styles, including:
  - Dark cinema-themed layout
  - Cards, grids, and responsive layout
  - Styling for the Explore Movies table and pagination controls
- `index.html`, `package.json`, `package-lock.json` – Vite / React setup

## Dependencies

See `package.json` for exact versions. Main libraries:

- `react`, `react-dom`
- `vite`

## Running the Frontend Locally

```bash
cd frontend
npm install
npm run dev
