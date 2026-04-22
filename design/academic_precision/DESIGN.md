---
name: Academic Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464651'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777682'
  outline-variant: '#c7c5d3'
  surface-tint: '#5156a7'
  primary: '#15196c'
  on-primary: '#ffffff'
  primary-container: '#2d3282'
  on-primary-container: '#999ff5'
  inverse-primary: '#bfc2ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#002d1c'
  on-tertiary: '#ffffff'
  tertiary-container: '#00452e'
  on-tertiary-container: '#43ba8a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bfc2ff'
  on-primary-fixed: '#070963'
  on-primary-fixed-variant: '#393e8e'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  h2:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Lexend
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Public Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  data-table:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin: 24px
---

## Brand & Style
This design system is anchored in the principles of **Administrative Calm** and **Functional Trust**. Designed specifically for the high-density information environments of education management, the aesthetic prioritizes cognitive ease over decorative flair. 

The style is **Corporate / Modern**, leaning heavily into a refined minimalist execution. It avoids visual noise to ensure that educators and administrators can focus on student outcomes and data accuracy. The visual language conveys stability and institutional authority while remaining accessible and contemporary. Every element is designed to feel intentional, structured, and reliable.

## Colors
The palette utilizes a "Safety First" color strategy. The primary **Deep Indigo** provides a sense of tradition and academic authority. This is balanced by a spectrum of **Cool Greys** and **Soft Slate Blues** used for structural elements, borders, and backgrounds to reduce eye strain during long sessions of data entry.

**Emerald Green** is reserved strictly for positive reinforcement and success states—such as grade improvements or completed registrations. High-contrast neutrals (Slate 900) are used for typography to ensure AA accessibility ratings across all interfaces.

## Typography
Legibility is the primary metric for this design system. We use **Lexend** for headings and key interface anchors; its unique spacing and letterforms are specifically engineered to improve reading proficiency, making it ideal for an educational context. 

For data-heavy views and body text, we utilize **Public Sans**. It offers an institutional, clean, and neutral character that excels in dense tables and multi-field forms. Information hierarchy is established through weight and color rather than excessive size shifts, keeping the interface compact and professional.

## Layout & Spacing
The design system employs a **Fixed Grid** model for standard dashboard views to ensure consistency across different user roles. A 12-column grid is used for layout orchestration, but internal components—specifically data tables—may switch to a fluid behavior to maximize the utility of wide-screen monitors.

A strict 4px/8px baseline rhythm is enforced to create a mathematical harmony between text and containers. Dense views (like gradebooks) should utilize the 'sm' (8px) spacing token for cell padding to maximize data density without sacrificing readability.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**. Rather than aggressive drop shadows, this design system uses subtle shifts in background color (e.g., moving from a Slate 50 background to a White surface) to indicate hierarchy.

When shadows are necessary—such as for modals or floating action menus—they are implemented as "Ambient Shadows": extremely diffused, low-opacity (8-10%) blurs that feel like soft natural light rather than digital effects. Elements at the highest elevation utilize a 1px border in a slightly darker shade than the surface to maintain crispness.

## Shapes
We utilize a **Soft** shape language. A corner radius of 4px (0.25rem) is the standard for inputs, buttons, and data cells. This subtle rounding softens the "institutional" feel of the application without appearing overly playful or juvenile. 

Large containers like student profile cards may use a slightly more pronounced 8px radius to distinguish them from the more rigid data grid. Interactive elements should maintain sharp, clean lines to emphasize precision.

## Components
### Data Tables
Tables are the core of the application. They feature sticky headers, zebra-striping using a very faint Slate 50 tint, and high-contrast text. Sort icons and filters should be unobtrusive, appearing on hover to reduce visual clutter.

### Buttons
- **Primary:** Deep Indigo background with white text. Solid, authoritative.
- **Secondary:** Transparent background with a Slate 200 border and Indigo text.
- **Tertiary/Ghost:** No border, Indigo text; used for low-priority actions in tables.

### Input Fields
Fields use a 1px Slate 200 border. On focus, the border shifts to Deep Indigo with a subtle 2px soft glow of the same color. Error states use a high-visibility crimson, but only for the border and a small supporting icon.

### Progress Indicators
Student progress bars use the Emerald Green highlight color to signify completion. For multi-step forms (like enrollment), use a horizontal stepper with Lexend labels to guide the user clearly through the process.

### Student Profile Cards
These cards act as the primary information hub. They utilize "Body-md" for metadata and "H3" for names, using the 'lg' spacing token to provide breathing room between data clusters.