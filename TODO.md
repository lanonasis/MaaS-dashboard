# Dashboard UX Improvement TODO

- [x] Update `src/pages/Dashboard.tsx`
  - [x] Add `collapsed` state initialized from `localStorage` key `maas-sidebar-collapsed`
  - [x] Wire `collapsed` + `onCollapsedChange` into `<DashboardSidebar />`
  - [x] Persist collapsed changes back to `localStorage`
  - [x] Add mobile Escape key handler to close sidebar
  - [x] Add mobile body scroll lock while sidebar is open
  - [x] Add accessibility attributes to mobile sidebar toggle:
    - [x] `aria-label`
    - [x] `aria-expanded`
    - [x] `aria-controls`
  - [x] Add dynamic page metadata map and render title/subtitle in top bar left side
  - [x] Ensure sidebar has stable id target (`dashboard-sidebar`) for `aria-controls`

- [x] Update `src/components/layout/DashboardSidebar.tsx`
  - [x] Add `aria-expanded` to section header toggle buttons
  - [x] Add `aria-current="page"` to active nav item buttons
  - [x] Add `aria-label` to favorite toggle button (add/remove favorite)

- [ ] Verify behavior
  - [ ] `bun run lint`
  - [ ] `bun run dev` manual checks (mobile + desktop)
  - [ ] `bun test` (if available and reasonable runtime)
