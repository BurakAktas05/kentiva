# Kentiva — AI Agent Development Guide

## 1. Project identity

Kentiva is a multi-tenant smart city and municipal management SaaS platform.

The platform contains the following applications:

* `backend`: Java 21, Spring Boot, PostgreSQL, PostGIS, pgvector, Redis and RabbitMQ.
* `admin-portal`: React, TypeScript, Vite and Tailwind CSS management portal.
* `belediyehattı`: React, TypeScript, Capacitor citizen application.
* `public-site`: Public website for Kentiva and municipality pages.
* `media-guard`: Media analysis and privacy-protection service.
* `deployment`: Deployment templates and operational documentation.

Kentiva is not a demo application. Treat every change as a production-oriented SaaS change.

---

## 2. Primary product goals

Every change should support at least one of these goals:

1. Make it easier for citizens to report municipal problems.
2. Make it faster for municipality employees to review and resolve reports.
3. Make municipality operations measurable and transparent.
4. Preserve tenant isolation, security and personal-data privacy.
5. Maintain a consistent and professional Kentiva design language.
6. Reduce operational complexity rather than adding unnecessary features.

Do not add features merely because they look impressive. Prefer changes that solve a clear user problem.

---

## 3. Non-negotiable rules

### Multi-tenancy

* Municipality data must always remain isolated.
* Never trust a municipality ID received directly from the client.
* Resolve municipality context from the authenticated user or another trusted server-side source.
* Every repository query involving tenant-owned data must preserve municipality boundaries.
* Super-admin access must be explicit and auditable.
* Add authorization and tenant-isolation tests for sensitive endpoints.

### Security and privacy

* Never commit secrets, private keys, API keys, passwords or production credentials.
* Never expose JWTs, refresh tokens, OTP values or personal citizen information in logs.
* Do not weaken authentication, authorization, rate limiting or input validation.
* Validate all request DTOs at the API boundary.
* Treat uploaded files, URLs and user-generated text as untrusted input.
* Preserve KVKK-related anonymization and cleanup behavior.
* Do not introduce insecure development bypasses into production code.

### Database

* Every schema change requires a new Flyway migration.
* Never edit an existing migration that may already have been executed.
* Migrations must be backward-aware and safe for existing data.
* Add indexes only when supported by a real query or performance requirement.
* Avoid N+1 queries and unbounded database reads.
* Pagination is required for potentially large result sets.

### API contracts

* Do not change an API request or response contract without checking every consumer.
* Check `admin-portal`, `belediyehattı` and `public-site` before modifying shared endpoints.
* Use DTOs instead of exposing persistence entities.
* Return consistent error structures.
* Do not silently convert backend failures into fake successful responses.

---

## 4. Architecture rules

### Backend

* Controllers handle HTTP concerns only.
* Business logic belongs in services.
* Database access belongs in repositories.
* External integrations must be isolated behind services or clients.
* Long-running operations should not block HTTP request threads.
* External API calls require timeout, failure handling and appropriate retry behavior.
* Scheduled jobs must be safe when multiple application instances are running.
* Transactions should not contain slow external network calls.
* Use structured logging with useful context, but never log sensitive information.
* Prefer explicit domain methods over large generic utility classes.
* Avoid creating “god services” containing unrelated responsibilities.

### Frontend

* Keep API calls outside visual components when practical.
* Separate data-fetching logic from presentation logic.
* Prefer reusable hooks for repeated application behavior.
* Do not introduce global state when local or server state is sufficient.
* Avoid `any`, unsafe type assertions and duplicated API types.
* Do not hide TypeScript errors with broad suppressions.
* Use lazy loading for large routes where it provides measurable value.
* Always clean up listeners, timers, subscriptions and object URLs.

### File scope

Before creating a new file:

1. Search for an existing equivalent.
2. Determine whether the behavior belongs in an existing component, hook or service.
3. Avoid duplicate helpers and duplicate UI patterns.
4. Use clear names based on business meaning.

---

## 5. Kentiva design system

Kentiva must feel like one product across the citizen application, admin portal and public website.

### General visual principles

* Professional, trustworthy and modern.
* Clear hierarchy before decoration.
* Municipal software should feel reliable, not playful or experimental.
* Use whitespace intentionally.
* Avoid excessive gradients, glass effects, animations and shadows.
* Do not create a different visual style for every page.
* Prefer existing Kentiva colors, spacing, radius and shadow tokens.
* Do not use arbitrary color values when a design token exists.
* Do not add a new component variant without a clear need.

### Required reusable components

Prefer or create centralized versions of:

* Button
* IconButton
* Input
* Select
* Textarea
* FormField
* Card
* PageHeader
* StatusBadge
* StatCard
* DataTable
* Modal
* ConfirmDialog
* LoadingState
* EmptyState
* ErrorState
* Toast or success feedback
* Skeleton
* Pagination

Do not repeatedly write large Tailwind class strings for equivalent elements.

### Responsive behavior

Every changed screen must be checked at approximately:

* 390 × 844 mobile
* 768 × 1024 tablet
* 1440 × 900 desktop

The interface must not:

* overflow horizontally,
* hide critical actions,
* produce unreadable tables,
* clip labels,
* place touch targets too close together.

Interactive touch targets should be at least 44 × 44 CSS pixels where practical.

### Accessibility

* Use semantic HTML.
* Every input requires a visible or programmatically associated label.
* Icon-only buttons require an accessible name.
* Meaningful images require useful alternative text.
* Decorative images should use empty alternative text.
* Modals must manage focus correctly.
* Forms must be usable with a keyboard.
* Errors should be announced appropriately, such as with `role="alert"`.
* Do not communicate status using color alone.
* Respect `prefers-reduced-motion`.
* Maintain sufficient text and control contrast.

### Dark mode

When editing a dark-mode-supported application:

* Test both themes.
* Avoid pure black surfaces unless part of the existing design.
* Ensure borders, disabled states, maps, charts and placeholders remain visible.
* Do not fix only the light theme.

---

## 6. User experience requirements

Every important screen and operation must consider these states:

1. Initial loading.
2. Empty data.
3. Recoverable error.
4. Success feedback.
5. Permission denied.
6. Offline or network failure where relevant.
7. Partial data or external-service degradation.
8. Disabled or unavailable action.

Never leave the user on a blank page.

Error messages must:

* explain what failed,
* avoid technical stack traces,
* state whether the user can retry,
* preserve already entered data whenever possible.

Destructive or high-impact operations require confirmation.

Critical workflows should prevent accidental duplicate submission.

---

## 7. Product-specific UX rules

### Citizen application

Prioritize:

* creating a new report,
* understanding why location and camera permissions are requested,
* preserving report drafts,
* retrying failed uploads,
* tracking report status,
* understanding municipality responsibility,
* receiving understandable success and error feedback.

Do not make weather, announcements, surveys or rewards more prominent than the primary reporting workflow.

### Municipality admin portal

Prioritize:

* reports requiring attention,
* SLA risk,
* assignment,
* status changes,
* department workload,
* citizen communication,
* operational monitoring.

Dashboards must lead to actions. A metric should link to the records behind it when practical.

Role-based interfaces should display what that role needs rather than showing every available module.

### Super-admin portal

Prioritize:

* tenant health,
* municipality onboarding,
* platform incidents,
* integration failures,
* subscription and pilot status,
* auditability.

Do not expose tenant data without a clear platform-administration reason.

---

## 8. Testing requirements

A task is not complete only because the code compiles.

### Backend changes

Run relevant commands such as:

```bash
cd backend
./mvnw test
```

On Windows:

```powershell
cd backend
.\mvnw.cmd test
```

Add tests for:

* authorization,
* tenant isolation,
* validation,
* business rules,
* repository queries,
* API contract behavior,
* failure scenarios.

### Admin portal

```bash
cd admin-portal
npm run lint
npm run test
npm run build
```

### Citizen application

```bash
cd belediyehattı
npm run lint
npm run test
npm run build
```

### Public site

```bash
cd public-site
npm run lint
npm run test
npm run build
```

Run only the applications affected by the change, unless the change modifies a shared API contract or shared infrastructure.

Critical end-to-end flows should be covered with Playwright.

Do not delete or weaken a test merely to make the build pass.

---

## 9. Required workflow for every task

### Before implementation

1. Read this file.
2. Identify the exact user problem.
3. Inspect all relevant files.
4. Search for existing reusable patterns.
5. Determine affected applications.
6. Identify security, tenant, database and API risks.
7. Prepare a concise implementation plan.
8. Do not edit files until the scope is understood.

### During implementation

* Keep the change focused.
* Do not combine unrelated refactors.
* Preserve existing behavior unless the task explicitly changes it.
* Add loading, empty, error and success states where relevant.
* Update tests alongside implementation.
* Avoid speculative abstractions.
* Prefer small, reviewable changes.

### After implementation

1. Run relevant tests.
2. Run relevant type checks and builds.
3. Review the complete Git diff.
4. Look for accidental secrets and debug logs.
5. Check responsive and dark-mode behavior.
6. Verify API consumers.
7. Summarize changed files.
8. List commands executed.
9. State anything that could not be verified.
10. Never claim that work is complete when checks are failing.

---

## 10. Definition of done

A feature is complete only when:

* the primary user flow works,
* authorization is correct,
* tenant isolation is preserved,
* validation exists,
* loading and failure states exist,
* the interface is responsive,
* accessibility basics are satisfied,
* tests cover important behavior,
* relevant builds pass,
* no secrets or debug artifacts are introduced,
* documentation is updated when necessary,
* the final diff contains no unrelated changes.

---

## 11. Agent response format

Before coding, respond with:

### Understanding

A short description of the requested outcome.

### Affected areas

Files, applications, APIs and database areas likely to change.

### Risks

Security, tenancy, compatibility and UX risks.

### Plan

A numbered implementation plan.

After coding, respond with:

### Implemented

What changed and why.

### Verification

Tests, builds and checks that were run.

### Remaining risks

Anything unverified or requiring manual testing.

### Changed files

A concise list of important modified files.

Do not use vague claims such as “everything is perfect” or “production-ready” without supporting verification.
