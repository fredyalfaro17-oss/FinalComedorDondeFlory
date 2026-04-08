# Design System Document

## 1. Overview & Creative North Star
The goal of this design system is to transform a high-utility POS interface into an elevated, editorial-grade experience. While a restaurant management system requires absolute efficiency, the brand personality demands a "Sabor Casero y Profesional" (Home-cooked and Professional) touch. 

**Creative North Star: "The Modern Heirloom"**
This system rejects the cold, sterile nature of traditional software. Instead, it treats the interface like a premium, dark-mode digital menu from a world-class bistro. We break the "template" look by layering warm ambers over deep charcoals, using sophisticated serif typography for a storytelling feel, and employing "Physicality through Tonal Depth" rather than rigid lines. This is a workspace that feels like a welcoming kitchen—warm, organized, and deeply intentional.

---

## 2. Colors
Our palette moves away from digital-blue defaults toward a rich, organic spectrum of charcoal, gold, and warm wood tones.

*   **Primary Background (`surface` #10141a):** A deep, near-black navy that serves as our canvas.
*   **Warm Accents (`primary` #ffd79b):** Use this rich gold sparingly for high-priority calls to action and critical pricing information.
*   **The "No-Line" Rule:** To achieve a premium look, **1px solid borders for sectioning are strictly prohibited.** Boundaries must be defined solely through background color shifts. For example, a food item card (`surface-container-low` #181c22) should sit on the main `background` without a border.
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of physical layers. 
    *   Outer wrapper: `surface`
    *   Main Content Area: `surface-container-low`
    *   Interactive Cards: `surface-container-high`
*   **Signature Textures:** For primary buttons and high-level headers, use a subtle linear gradient transitioning from `primary` (#ffd79b) to `primary-container` (#ffb300). This provides a "glow" that flat colors lack.
*   **Glassmorphism:** For floating overlays (like an order summary or a notification), use a semi-transparent `surface-variant` (#31353c) with a `backdrop-blur` of 12px to create a frosted-glass effect.

---

## 3. Typography
We use a high-contrast typographic pairing to balance the efficiency of a POS with the elegance of a high-end restaurant.

*   **The Editorial Voice (Newsreader):** Used for `display` and `headline` levels. This serif font provides the "home-cooked" character. Use it for category names and branding to ground the experience in tradition.
*   **The Precision Tool (Inter):** Used for `title`, `body`, and `label` levels. Inter provides the modern, professional clarity needed for rapid-fire ordering and price reading.
*   **Visual Soul:** Large prices (Q30) should be rendered in `headline-sm` (Newsreader) or a bolded `title-lg` (Inter) to ensure they are the most legible element on the card, reflecting the importance of high contrast in the user request.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural shadows or lines.

*   **The Layering Principle:** Stack `surface-container` tiers to create natural lift. A card using `surface-container-highest` (#31353c) placed on a `surface` background creates a clear, sophisticated hierarchy without a single line of CSS border.
*   **Ambient Shadows:** If an element must "float" (like a Modal), use a shadow with a blur of 32px and 6% opacity. The shadow color should be a tinted version of the background (`surface-container-lowest` #0a0e14), never pure black.
*   **The Ghost Border Fallback:** If accessibility requires a stroke, use a "Ghost Border": the `outline-variant` (#514532) at 15% opacity. It should be felt, not seen.
*   **Roundedness:** All interactive elements (cards, buttons, inputs) must use a consistent scale.
    *   **Buttons/Small Cards:** `xl` (0.75rem / 12px) for a soft, welcoming feel.
    *   **Selection Chips:** `full` (9999px) for a tactile, pill-shaped look.

---

## 5. Components

### Buttons
*   **Primary:** A "Gold Glow" gradient (Primary to Primary-Container). Text: `on-primary` (#432c00).
*   **Secondary:** `surface-container-high` background with a `primary` text color. No border.
*   **Tertiary:** Transparent background, `primary` text. Use for low-priority actions like "Cancel."

### Cards & Lists
*   **The Food Card:** Must not use dividers. Separate the item name from the price using `title-md` and `headline-sm`. 
*   **Spacing:** Use `spacing-4` (1rem) for internal card padding and `spacing-6` (1.5rem) to separate cards. White space is our primary divider.

### Inputs
*   **Field Style:** Use `surface-container-lowest` (#0a0e14) for the input well. This creates an "etched" look into the darker background.
*   **Active State:** Instead of a thick border, use a subtle 1px "Ghost Border" of `primary` at 40% opacity and a subtle `primary` inner glow.

### Order Sidebar (The Carrito)
*   Use a "Glassmorphism" panel: `surface-container` with 80% opacity and 16px blur. This keeps the cart feeling lightweight and integrated with the main menu background.

---

## 6. Do’s and Don’ts

**Do:**
*   **Do** use Newsreader for "Total" prices and "Grand Totals" to give the transaction a sense of occasion.
*   **Do** prioritize the `spacing-4` through `spacing-8` units to give elements room to breathe.
*   **Do** use `primary` (#ffd79b) for all "Add" or "Confirm" actions to guide the eye via color temperature.

**Don’t:**
*   **Don’t** use a 1px solid white or grey border to separate the sidebar from the main grid. Use a background shift from `surface` to `surface-container-low`.
*   **Don’t** use pure black (#000000). Always use the `surface` tokens to maintain the rich, navy/charcoal depth.
*   **Don’t** use Inter for everything. Without the serif Newsreader, the system loses its "home-cooked" soul and becomes a generic SaaS product.