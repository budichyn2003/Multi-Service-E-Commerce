# UI standards

Use this guide as the default visual direction for projects cloned from Maincore. Keep the interface clear and responsive; adapt it to product needs without adding a UI framework solely for styling.

## Visual foundation

- **Palette:** near-black page and surfaces, high-contrast off-white text, muted gray-green supporting text, and restrained green accents for primary actions and active states.
- **Typography:** use the project's bundled sans-serif font for UI text and a monospace font for code, paths, and technical labels.
- **Layout:** use a centered, bounded content width, generous section spacing, clear headings, and cards only when they improve grouping.
- **Surface effects:** prefer subtle borders and contrast. Avoid excessive blur, glow, gradients, and decorative motion.

## Interaction and accessibility

- Build mobile layouts first; verify navigation, cards, code blocks, and actions at narrow widths.
- Use semantic landmarks and headings, descriptive link/button text, visible keyboard focus, and live status announcements for asynchronous results.
- Maintain readable contrast and do not rely on color alone to convey status.
- Respect `prefers-reduced-motion`; keep transitions short and non-essential.
- Show disabled/loading states for actions that are in progress and provide useful feedback on success or failure.

## Reuse

Keep tokens and shared patterns in the existing global stylesheet or components. Avoid adding a design system package, animation library, or extra component framework unless a derived project has a concrete requirement.

The current reference implementation is the public page in `frontend/app/page.tsx` and its styles in `frontend/app/globals.css`.
