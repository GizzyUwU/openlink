# Copilot Instructions for edudesk

## Project Overview
This project is a desktop application built with Tauri, SolidJS, and TypeScript, using Vite as the build tool. It features a login flow, dashboard, session management, and integration with school data APIs. The UI is styled with custom CSS and supports dynamic reactivity using SolidJS signals and stores.

## Key Conventions
- **SolidJS Signals/Stores:** Use `createSignal`, `createStore`, and `makePersisted` for reactive state and session persistence.
- **Session Storage:** Use `@solid-primitives/storage` for persisting school and user data. Prefer signals for UI state, stores for complex objects.
- **TypeScript:** Strictly type API responses and user data. Types are defined in `src/types/auth.ts` and `src/types/global.ts`.
- **Routing:** Use SolidJS Router's `navigate` for client-side navigation. Avoid direct window location changes.
- **API Integration:** School lookup and authentication logic are in `src/api/auth.ts` and `src/api/main.ts`. Always validate types and handle errors gracefully.
- **UI/UX:** Centralize form logic for login, reuse button and color change logic for both single-field and multi-field forms. Use conditional rendering for error states and loading indicators.
- **CSS:** Layout and spacing are managed via scoped CSS in `src/assets/css/`. Use flexbox for alignment and custom classes for spacing.
- **Session Expiry & Polling:** Use timeouts/intervals for session expiry and lesson status refresh in dashboard logic (`src/pages/dash.tsx`).

## File Structure
- `src/pages/login.tsx`: Login form, school selection, session storage, error handling.
- `src/pages/dash.tsx`: Dashboard, lesson/message blocks, session expiry, status polling.
- `src/api/auth.ts`: School lookup API.
- `src/api/main.ts`: EdulinkAPI class for authentication and school data.
- `src/types/auth.ts`, `src/types/global.ts`: TypeScript types.
- `src/assets/css/`: CSS files for layout and styling.

## Best Practices
- **State Management:** Prefer signals for primitive values, stores for objects/arrays. Use `makePersisted` for session data.
- **Error Handling:** Always check API responses for errors and display user-friendly messages.
- **Component Reuse:** Centralize logic for buttons, color changes, and form validation.
- **Accessibility:** Ensure forms and buttons are accessible and keyboard-navigable.
- **Testing:** Use type-safe mocks for API responses when testing logic.

## How to Contribute
- Follow TypeScript and SolidJS conventions for new components.
- Keep UI logic reactive and modular.
- Document new API endpoints and types in the appropriate files.
- Update this file with new conventions as the codebase evolves.

---
_Last updated: 2024-06_
