# AGENTS.md — Enterprise Capacity Mapper

## Purpose

This repository contains a lightweight enterprise capability mapping application designed to run as a **GitHub Pages-compatible PWA**.

These rules are the default operating contract for any AI agent (including Inya) modifying this repository.

## 1. Architecture principles

### Runtime target

- The application must remain deployable as a static site on GitHub Pages.
- Prefer client-side React/Vite solutions.
- Do not introduce a server, database, API backend, or server-side runtime unless explicitly requested.
- Preserve PWA/service-worker compatibility.

### Persistence

Use the simplest persistence mechanism that satisfies the requirement:

1. **localStorage** for user-local mutable data.
2. A **JSON file in a configurable GitHub repository/source** for shared or published reference data.
3. Do not introduce a database or remote backend for ordinary application state.

Remote JSON loading must remain compatible with public HTTPS URLs and GitHub `blob` URLs converted to raw content.

## 2. Architecture style

Favor a **small number of meaningful files** over highly fragmented React abstractions.

Current intended structure:

```
src/
├── App.jsx
├── components/
│   └── NewMapWizard.jsx
├── data/
│   └── demoData.js
├── services/
│   └── storage.js
├── main.jsx
└── styles.css
```

### Important

Do **not** split code into many tiny components merely to reduce file size.

Avoid creating layers such as:

- `components/ui/Button.jsx`
- `components/ui/Input.jsx`
- `hooks/useSomething.js`
- `utils/foo.js`
- one-file wrappers around trivial functions

unless there is a concrete reuse, testing, ownership, or complexity reason.

A medium-sized cohesive file is preferable to many tiny files when the responsibility is clear.

### Current boundaries

- **App.jsx**: application orchestration, capability-map interactions, views, forms and domain behaviour.
- **NewMapWizard.jsx**: the complete "new map" wizard, including its templates and wizard-specific behaviour.
- **storage.js**: local persistence, import/export, model validation/normalization, and remote JSON loading helpers.
- **demoData.js**: demo/reference model data only.
- **main.jsx**: application bootstrap and PWA/service-worker registration.
- **styles.css**: global application styling, including wizard styling.

Do not reintroduce the files that were deliberately consolidated unless a future change creates a strong architectural reason.

## 3. TOGAF and capability mapping

The domain model follows enterprise-architecture concepts and should remain understandable from a **TOGAF / capability mapping** perspective.

Prefer clear terminology:

- **N0** = domain / capability area
- **N1** = capability
- **Application** = application/system supporting capabilities
- **Impact** = applications affected by selected capabilities
- **Gap** = capability without application coverage
- **Redundancy** = capability supported by multiple applications

Do not casually change the semantic meaning of these concepts.

When adding mapping functionality, preserve traceability:

`Domain → Capability (N1) → Application`

Application-to-capability relationships must remain explicit.

## 4. UI and UX rules

The application is intended to be a serious enterprise architecture tool, not a prototype.

### Forms

- Required fields must be explicit.
- Required fields must have visible feedback when invalid.
- Use accessible `aria-required` / `aria-invalid` attributes where appropriate.
- Validation messages should explain what must be corrected.
- Do not silently reject user input.

### Actions

Actions must have clear visual hierarchy:

- primary action
- secondary action
- destructive action

Avoid ambiguous icon-only actions unless they have an accessible label/title.

### Layout

Keep alignment, spacing, button sizing and typography consistent.

Do not introduce a new visual language for an isolated feature.

Before adding CSS, check whether an existing style can be reused.

## 5. Data safety

Operations that can destroy or replace user data require deliberate behaviour.

Examples:

- deleting a domain must handle its dependent capabilities and application relations consistently;
- creating a new map must not silently lose the current map;
- importing a model must validate its structure;
- remote JSON must be validated before being accepted as the active model.

Preserve migration/normalization logic when changing the model schema.

## 6. Git workflow

### Mandatory rule

**Every non-trivial change must be made in a dedicated GitHub branch and proposed through a dedicated Pull Request.**

Never modify `main` directly for feature/refactor work.

Recommended branch naming:

- `feat/<short-description>`
- `fix/<short-description>`
- `refactor/<short-description>`
- `docs/<short-description>`
- `test/<short-description>`

### Pull Requests

A PR should state:

1. what changed;
2. why it changed;
3. what was deliberately not changed;
4. how it was tested;
5. any known limitation or follow-up.

Keep PRs focused. Do not mix unrelated refactors with product changes.

## 7. Testing

For functional changes:

- run the existing build;
- run the Cypress E2E suite;
- add or update E2E coverage for important user-visible behaviour.

Tests should verify actual UI behaviour, not merely that the application technically loads.

A "page loaded" assertion is insufficient if the application could render a blank or broken screen.

Important smoke-test areas include:

- application loads at the root;
- application loads under the GitHub Pages base path;
- required-field validation works;
- domain/capability/application CRUD works;
- relationships survive relevant edits;
- new-map wizard works;
- 1-level / 2-level mapping choices behave correctly;
- import/export remains functional.

## 8. GitHub Pages / PWA constraints

Do not break:

- Vite base-path configuration;
- relative asset paths required for GitHub Pages;
- service-worker registration;
- offline/PWA behaviour;
- static deployment.

When changing routing or asset handling, explicitly test the application under its GitHub Pages sub-path.

## 9. Agent working method

Before modifying code:

1. Inspect the existing implementation.
2. Reuse existing patterns.
3. Identify the smallest coherent change.
4. Avoid speculative abstractions.
5. Preserve existing behaviour unless the task explicitly changes it.

After modifying code:

1. inspect the resulting diff;
2. run relevant tests;
3. fix regressions;
4. create/update the dedicated PR;
5. summarize the result and remaining risks.

If requirements are ambiguous, prefer the smallest reversible implementation that fits the architecture above.

## 10. What not to do

Do not:

- add a backend just because it is convenient;
- add a database for data that can live in localStorage or JSON;
- introduce Redux/Zustand/etc. without a demonstrated need;
- create dozens of tiny React components;
- create generic abstractions before there is reuse;
- rewrite the application framework;
- change the data model casually;
- bypass validation;
- commit directly to `main`;
- mix unrelated cleanup into a feature PR.

## 11. Decision rule

When choosing between two technically valid implementations, prefer the one that:

1. keeps GitHub Pages compatibility;
2. minimizes runtime dependencies;
3. minimizes architectural complexity;
4. keeps related behaviour together;
5. is easy for both a human and an AI agent to understand;
6. preserves the existing domain semantics;
7. is covered by an appropriate test.

This document is intentionally opinionated. If a future change needs to violate one of these rules, explain the reason in the PR rather than silently changing the convention.
