# Design System Strategy: The Intelligent Curator

This design system is engineered to transform a standard news aggregator into a high-end, editorial intelligence platform. We are moving away from the "cluttered portal" aesthetic toward a "Digital Curator" experience—one that feels authoritative, cinematic, and calm. By leveraging deep tonal depth and intentional white space, we ensure that AI-driven insights feel like premium revelations rather than automated noise.

---

### 1. Creative North Star: The Digital Curator
The "Digital Curator" philosophy treats information as a luxury. We eschew the rigid, boxed-in grids of traditional news sites in favor of an **Asymmetric Editorial Layout**. 

*   **Intentional Asymmetry:** Balance heavy data visualizations with airy, wide-margin text columns.
*   **Tonal Depth:** Instead of white backgrounds, we use a "Dark Room" approach, where content is illuminated by subtle glowing accents and layered translucent surfaces.
*   **Overlapping Elements:** Breaking the container—letting a "trending" chip or an AI-sparkle icon slightly bleed over the edge of a card—to create a sense of organic movement and sophistication.

---

### 2. Colors & Surface Architecture
The palette is rooted in the depth of `background: #060e20`. We define space not with lines, but with light.

*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Use `surface-container-low` on top of `background` to define areas. Boundaries must be felt, not seen.
*   **Surface Hierarchy & Nesting:**
    *   **Level 0 (Base):** `surface-dim (#060e20)` for the main canvas.
    *   **Level 1 (Sectioning):** `surface-container-low (#091328)` for sidebar or background grouping.
    *   **Level 2 (Active Cards):** `surface-container-highest (#192540)` for primary news cards.
    *   **Level 3 (Interactive):** `surface-bright (#1f2b49)` for hovered states or active tabs.
*   **The "Glass & Gradient" Rule:** AI-powered insights should use Glassmorphism. Apply `secondary_container` at 40% opacity with a `24px` backdrop blur. 
*   **Signature Textures:** For primary CTA buttons or "Breaking News" highlights, use a linear gradient from `primary (#85adff)` to `primary_container (#6e9fff)` at a 135-degree angle. This adds a "lithographic" soul to the UI.

---

### 3. Typography: Editorial Authority
We utilize a pairing of **Manrope** for impact and **Inter** for utility.

*   **The Display Scale:** Use `display-lg` (Manrope) for hero headlines. The tight letter-spacing and high-contrast scale create a "New York Times of the Future" feel.
*   **The Title Scale:** Use `title-lg` (Inter) for news card headers. It provides a technical, clean readability that balances the expressive headlines.
*   **Multilingual Sophistication:** For multilingual tabs, use `label-md` in All-Caps with 0.05em letter spacing. This differentiates "Utility" navigation from "Content" reading.

---

### 4. Elevation & Depth: Tonal Layering
We do not use drop shadows to create "pop." We use them to create "atmosphere."

*   **The Layering Principle:** A `surface-container-lowest (#000000)` card placed on a `surface-container-high` section creates a natural "well" effect, perfect for secondary data visualizations.
*   **Ambient Shadows:** When a card must float (e.g., a hovered news item), use a shadow: `0px 24px 48px rgba(0, 0, 0, 0.4)`. The shadow color must never be neutral grey; it must be a deep blue-tinted shadow to maintain the "Dark Room" immersion.
*   **The "Ghost Border" Fallback:** If a container needs more definition (like a search input), use `outline-variant (#40485d)` at **15% opacity**. It should be a suggestion of a line, not a boundary.

---

### 5. Component Logic

#### **AI-Insight Cards (The Signature Component)**
*   **Base:** `surface-container-highest` with a 2px top-edge glow using `tertiary_fixed_dim`.
*   **Rounding:** `xl (0.75rem)` to feel modern but structured.
*   **AI Sparkle:** Use `tertiary (#ac8aff)` for iconography related to machine learning summaries.

#### **Buttons**
*   **Primary:** Gradient fill (`primary` to `primary_container`). No border. `md` roundedness.
*   **Secondary (Multilingual Tabs):** Ghost style. No background, `on_surface_variant` text. Active state uses `surface_bright` background with a `primary` under-glow (2px height).

#### **Data Visualizations**
*   **Palette:** Use `secondary` (vibrant blue) for primary data and `tertiary` (purple) for AI-predicted trends.
*   **Gridlines:** Use `outline_variant` at 10% opacity.

#### **Lists & Feed**
*   **Spacing:** Use a 32px vertical gap between news items. 
*   **Dividers:** Strictly forbidden. Use a 4px wide vertical "accent bar" of `surface_variant` to the left of a hovered list item to indicate focus.

---

### 6. Do’s and Don’ts

**Do:**
*   **Do** use `surface-container-highest` for "Read" news and `surface-container-low` for "Unread" to create an intuitive hierarchy of consumption.
*   **Do** use `display-sm` for AI summary pull-quotes to break the monotony of body text.
*   **Do** embrace negative space. If a dashboard feels "full," it is failing the Curator ethos.

**Don’t:**
*   **Don’t** use pure white (#FFFFFF) for text. Use `on_surface (#dee5ff)` to reduce eye strain in the dark environment.
*   **Don’t** use 100% opaque borders. They "trap" the data and make the dashboard feel like a legacy spreadsheet.
*   **Don’t** use standard "Blue" for links. Use `primary_dim` and an animated underline on hover for a high-end feel.