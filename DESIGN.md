# Clay Clay Design System

## Brand Identity

**Premium, playful, expressive, warm, tactile, contemporary, editorial, mobile-first**

Clay Clay is a Singapore pottery painting studio offering authentic, hands-on creative experiences. The design should feel like clay itself — warm, tactile, inviting, and contemporary.

## Color Palette

### Primary Colors
```css
--clay-white: #FAF9F7        /* Warm paper white */
--clay-ink: #1A1A1A          /* Soft black for text */
--clay-terracotta: #C76D46   /* Warm terracotta accent */
--clay-sage: #8B9A7D         /* Muted sage green */
--clay-sand: #E8E4DC         /* Warm sand background */
--clay-warm-gray: #D4CFC7    /* Light warm gray */
```

### Secondary Colors
```css
--clay-rust: #A85C3F         /* Deep rust */
--clay-olive: #6B705C        /* Olive green */
--clay-cream: #F5F3EF        /* Cream highlights */
--clay-charcoal: #2D2D2D     /* Soft charcoal */
```

### Functional Colors
```css
--clay-success: #5A7D5A      /* Muted green for success states */
--clay-error: #C94C4C        /* Muted red for errors */
--clay-warning: #D4A056      /* Muted amber for warnings */
```

## Typography

### Font Families
- **Headlines:** Georgia, serif (editorial, premium feel)
- **Body:** Inter, -apple-system, BlinkMacSystemFont, sans-serif (clean, readable)
- **Accent:** Courier Prime, monospace (for prices, technical details)

### Type Scale
```css
/* Display */
--text-display: clamp(3.5rem, 8vw, 6rem)      /* Hero headlines */
--text-h1: clamp(2.5rem, 6vw, 4rem)           /* Page titles */
--text-h2: clamp(2rem, 5vw, 3rem)             /* Section headers */
--text-h3: clamp(1.5rem, 4vw, 2rem)           /* Subsections */

/* Body */
--text-lg: clamp(1.125rem, 2vw, 1.25rem)      /* Large body */
--text-base: 1rem                             /* Base body */
--text-sm: 0.875rem                           /* Small text */
--text-xs: 0.75rem                            /* Captions */

/* Line Heights */
--leading-tight: 1.1                          /* Display */
--leading-normal: 1.5                         /* Body */
--leading-relaxed: 1.7                        /* Editorial text */
```

### Typography Rules
- Use `text-wrap: balance` for headlines under 12 words
- Letter-spacing: -0.02em for display, -0.01em for H1-H3, normal for body
- Max line length: 65-75 characters for body text
- Use `font-variant-numeric: oldstyle-nums` for prices

## Spacing System

```css
--space-1: 0.25rem    /* 4px */
--space-2: 0.5rem     /* 8px */
--space-3: 0.75rem    /* 12px */
--space-4: 1rem       /* 16px */
--space-5: 1.25rem    /* 20px */
--space-6: 1.5rem     /* 24px */
--space-8: 2rem       /* 32px */
--space-10: 2.5rem    /* 40px */
--space-12: 3rem      /* 48px */
--space-16: 4rem      /* 64px */
--space-20: 5rem      /* 80px */
--space-24: 6rem      /* 96px */
--space-32: 8rem      /* 128px */

/* Responsive spacing */
--gutter: clamp(1.25rem, 4vw, 5rem)    /* Horizontal page padding */
--section: clamp(3rem, 8vw, 6rem)      /* Section vertical padding */
```

## Grid System

```css
/* Container */
--container-max: 1440px
--container-narrow: 1024px
--container-small: 768px

/* Columns */
--grid-columns: 12
--grid-gap: clamp(1rem, 3vw, 2rem)

/* Mobile-first breakpoints */
--bp-sm: 640px    /* Large phones */
--bp-md: 768px    /* Tablets */
--bp-lg: 1024px   /* Laptops */
--bp-xl: 1280px   /* Desktops */
--bp-2xl: 1440px  /* Large desktops */
```

## Component Standards

### Buttons
- Minimum touch target: 44x44px
- Padding: `py-3 px-6` for primary, `py-2 px-4` for secondary
- Border-radius: `rounded-sm` (2px) for editorial feel
- Transition: `transition-all duration-200 ease-out`

### Cards
- Border: `border border-clay-warm-gray/50`
- Border-radius: `rounded-sm`
- Shadow: `shadow-sm` hover: `shadow-md`
- Padding: `p-6`

### Inputs
- Border: `border border-clay-ink/20`
- Focus: `outline outline-2 outline-clay-terracotta outline-offset-2`
- Padding: `py-3 px-4`
- Font-size: 16px minimum (prevent iOS zoom)

### Images
- Aspect ratios: `4/3` (workshops), `16/9` (hero), `1/1` (gallery)
- Border-radius: `rounded-sm`
- Object-fit: `cover`

## Layout Patterns

### Editorial Grid
```css
.editorial-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-8);
}

@media (min-width: 768px) {
  .editorial-grid {
    grid-template-columns: 1.3fr 1fr;
  }
}
```

### Asymmetric Layout
- Offset images by 20-30% on desktop
- Use `mt-12` or `mt-16` to create vertical rhythm
- Alternate left/right alignment for visual interest

### Full-Bleed Sections
- Use `--gutter` for horizontal padding
- Background colors extend full viewport width
- Content constrained to `--container-max`

## Interaction States

### Hover
- Scale: `scale-102` or `scale-105`
- Shadow: increase elevation
- Color: darken by 10% or shift to accent

### Focus
- Outline: `outline outline-2 outline-clay-terracotta outline-offset-2`
- Never remove outline for keyboard navigation

### Active
- Scale: `scale-98`
- Shadow: reduce elevation
- Color: darken by 15%

### Disabled
- Opacity: `opacity-50`
- Pointer events: `pointer-events-none`
- Cursor: `cursor-not-allowed`

## Accessibility

- Color contrast: WCAG AA minimum (4.5:1 for text)
- Focus visible: always maintain visible focus states
- Touch targets: minimum 44x44px
- Reduced motion: respect `prefers-reduced-motion`
- Alt text: all images require descriptive alt text
- ARIA: use semantic HTML first, ARIA only when needed

## Mobile-First Rules

1. Design for 390px first, enhance for larger screens
2. Use `dvh` units for full-height sections
3. Safe-area padding for notched devices
4. Bottom navigation for key actions on mobile
5. Swipeable galleries and carousels
6. Collapsible sections for long content
7. Sticky CTAs on scroll for booking

## Image Guidelines

- Use authentic Clay Clay photography (no stock photos)
- Show hands working with clay, painted pieces, studio atmosphere
- Warm, natural lighting
- Include diverse participants
- Show process and finished pieces
- Workshop images should show the experience, not just products
