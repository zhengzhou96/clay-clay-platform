# Clay Clay Motion Design System

## Motion Identity

**Warm • Tactile • Playful • Polished**

Motion should feel like working with clay — organic, responsive, and satisfying. Animations should be smooth but not overly slick, with subtle imperfections that feel handcrafted.

### Motion Adjectives
- **Tactile** — Motion should feel physical, like touching clay
- **Warm** — Easing should be gentle, not mechanical
- **Playful** — Occasional bounce and overshoot for delight
- **Polished** — Timing and choreography must be precise

## Motion Tokens

### Durations
```css
--duration-fast: 150ms      /* Micro-interactions, hover states */
--duration-normal: 300ms    /* Standard transitions, fades */
--duration-slow: 500ms      /* Complex animations, reveals */
--duration-slower: 800ms    /* Hero sequences, page transitions */
--duration-slowest: 1200ms  /* Cinematic moments */
```

### Easing Curves
```css
--ease-out: cubic-bezier(0.215, 0.61, 0.355, 1)        /* Standard exit */
--ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1)    /* Standard enter */
--ease-back-out: cubic-bezier(0.34, 1.56, 0.64, 1)     /* Playful bounce */
--ease-elastic: cubic-bezier(0.68, -0.55, 0.265, 1.55) /* Elastic overshoot */
```

### GSAP Easing
- `power2.out` — Standard fade/slide
- `power3.out` — Hero entrances
- `back.out(1.7)` — Playful pop-ins
- `elastic.out(1, 0.3)` — Elastic bounce
- `expo.out` — Smooth, premium reveals

### Stagger Logic
```javascript
stagger: {
  each: 0.08,           // 80ms between elements
  from: 'start',        // or 'center', 'end', 'random'
  grid: 'auto',         // for 2D grids
  axis: 'x',            // or 'y' for horizontal
  repeat: 0,            // no repeat
  yoyo: false           // no yoyo
}
```

## Motion Inventory

### Page Load
- **Hero:** Fade up with `power3.out`, 1.2s, delay 0.2s
- **Navigation:** Stagger fade-in, 0.4s, stagger 0.1s
- **Content sections:** Scroll-triggered reveals

### Scroll Animations
- **Section headers:** Fade up, y: 30→0, 0.6s, `power2.out`
- **Cards:** Stagger fade-up, 0.5s, stagger 0.1s
- **Images:** Reveal with mask or scale 0.95→1
- **Numbers/counters:** Count up on scroll into view

### Hover States
- **Buttons:** Scale 1.0→1.02, shadow increase, 200ms
- **Cards:** Scale 1.0→1.02, y: 0→-4, shadow increase, 300ms
- **Links:** Underline expand from center, 200ms
- **Images:** Scale 1.0→1.05, 400ms (slow for premium feel)

### Button Click
- Scale 1.0→0.98→1.0, 150ms total
- Shadow decrease on press

### Form Interactions
- **Input focus:** Border color fade, 200ms
- **Input error:** Shake animation, 300ms, `back.inOut(1)`
- **Success checkmark:** Draw SVG path, 400ms
- **Radio/checkbox:** Scale pop, `back.out(1.7)`, 250ms

### Modal/Dialog
- **Backdrop:** Fade in, 300ms
- **Modal:** Scale 0.95→1, fade in, 400ms, `power3.out`
- **Close:** Reverse, 250ms

### Page Transitions
- **Out:** Fade out, y: 0→-20, 300ms
- **In:** Fade in, y: 30→0, 400ms, `power3.out`
- **Shared elements:** Scale/morph if applicable

## Scroll Storyboard

### Homepage

**Hero Section**
1. Page load: Hero image fades in (0.8s)
2. Headline rises (y: 40→0, opacity 0→1, 1s, delay 0.3s)
3. Subtitle fades in (0.6s, delay 0.6s)
4. CTA buttons pop in (scale 0.9→1, 0.4s, `back.out(1.7)`, delay 0.9s)

**Workshops Preview**
1. Section header: Fade up on scroll (0.6s)
2. Workshop cards: Stagger reveal (0.5s each, stagger 0.1s)
3. Images: Subtle parallax (y: -30 over scroll distance)

**How It Works**
1. Step numbers: Count up on scroll (1s)
2. Step cards: Slide in from sides (alternate left/right)
3. Connecting lines: Draw SVG on scroll (scrub-linked)

**Gallery**
1. Images: Reveal with clip-path or mask
2. Horizontal scroll: Pin section, scroll horizontally
3. Image hover: Scale + subtle rotation

**Events**
1. Event cards: Fade up with stagger
2. Date badges: Pop in with `back.out(1.7)`
3. CTA: Pulse gently (scale 1.0→1.05→1.0, 2s infinite)

**Studio Info**
1. Map: Fade in with scale 0.95→1
2. Hours table: Rows fade up with stagger
3. Contact info: Underline expand

**FAQs**
1. Accordion headers: Fade up
2. Content: Slide down on expand (300ms, `ease-out`)
3. Icon: Rotate 0→180deg on expand

**Footer CTA**
1. Background: Parallax (moves at 0.5x scroll speed)
2. Text: Fade up
3. Button: Magnetic hover effect

### Workshop Pages

**Hero**
1. Workshop title: Typewriter or character reveal
2. Price/duration: Count up animation
3. Book button: Magnetic hover

**Description**
1. Text blocks: Fade up with stagger
2. Images: Reveal with scroll-triggered mask

**Inclusions**
1. Checkmarks: Draw SVG paths on scroll
2. List items: Slide in from left

**Gallery**
1. Grid: Masonry layout with fade-up
2. Lightbox: Scale in from click point

**FAQs**
- Same as homepage FAQs

**Booking CTA**
1. Sticky bar: Slide up from bottom on scroll past
2. Price: Highlight with pulse

### Booking Flow

**Calendar**
1. Month view: Fade in
2. Available dates: Pop in with stagger
3. Selected date: Scale up, highlight

**Session Selection**
1. Time slots: Slide in from right
2. Participant count: Counter animation

**Checkout**
1. Form fields: Fade up with stagger
2. Order summary: Slide in from right
3. Payment button: Pulse gently

### Confirmation

**Success Animation**
1. Checkmark: Draw SVG (600ms)
2. Reference number: Count up
3. Details: Fade up with stagger
4. What to expect: Slide up

## Page Transitions

### Route Changes
```typescript
// Next.js App Router transition
- Current page: opacity 1→0, y: 0→-20, 300ms
- New page: opacity 0→1, y: 30→0, 400ms, delay 100ms
- Overlap: 100ms crossfade
```

### Shared Elements
- Workshop card → Workshop page: Scale image to hero
- Gallery image → Lightbox: Expand from click point
- Booking CTA → Booking page: Morph button to header

## Microinteractions

### Booking Button
- Hover: Scale 1.02, shadow increase
- Click: Scale 0.98, then navigate
- Loading: Spinner with rotation, 1s infinite

### Calendar Date
- Hover: Scale 1.1, background color fade
- Select: Scale 1.2→1.0, `back.out(1.7)`, checkmark appears
- Unavailable: Opacity 0.5, cursor not-allowed

### Accordion (FAQs)
- Header hover: Background color fade
- Expand: Content height 0→auto, 300ms, `ease-out`
- Icon: Rotate 0→180deg, 300ms
- Multiple: Allow multiple open, or collapse others

### Image Gallery
- Hover: Scale 1.05, caption slides up
- Click: Lightbox opens, scale from click point
- Navigate: Slide left/right, 400ms, `power3.out`

### Form Validation
- Focus: Border color fade, 200ms
- Valid: Green border, checkmark appears, 300ms
- Invalid: Red border, shake animation, 300ms
- Error message: Fade down, 200ms

## Responsive Behavior

### Mobile (390-640px)
- Reduce animation complexity
- Shorter durations: 0.8x desktop
- Smaller stagger: 0.06s instead of 0.1s
- Disable parallax on scroll
- Simplify hover states (touch devices)

### Tablet (768-1024px)
- Full animation suite
- Standard durations
- Enable parallax

### Desktop (1280px+)
- Full animation suite
- Add subtle ambient motion
- Enable custom cursor (if brand-appropriate)
- Magnetic button effects

## Performance Guidelines

### Budget
- 60fps target on mid-range devices
- Max 3 simultaneous complex animations
- Use `will-change` sparingly (only on animated elements)
- Clean up GSAP contexts on unmount

### Optimization
- Use `transform` and `opacity` for smooth animations
- Avoid animating `height`, `width`, `top`, `left`
- Use `contain: layout style paint` for animated components
- Lazy-load animations below the fold
- Use `requestAnimationFrame` for custom animations

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  html { scroll-behavior: auto; }
}
```

## GSAP Implementation Rules

### Context Cleanup (MANDATORY)
```typescript
useEffect(() => {
  const ctx = gsap.context(() => {
    // All GSAP animations here
  });
  return () => ctx.revert();
}, []);
```

### ScrollTrigger Setup
```typescript
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger);
}, []);
```

### Timeline Pattern
```typescript
const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
tl.from('.element1', { y: 20, opacity: 0, duration: 0.6 })
  .from('.element2', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')
  .from('.element3', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4');
```

### ScrollTrigger Pattern
```typescript
gsap.from('.element', {
  scrollTrigger: {
    trigger: '.element',
    start: 'top 80%',
    toggleActions: 'play none none none',
  },
  y: 30,
  opacity: 0,
  duration: 0.6,
  ease: 'power2.out'
});
```

## Quality Rubric

| Level | Description | Target |
|-------|-------------|--------|
| 1 | No animation | ❌ |
| 2 | Basic CSS transitions | ❌ |
| 3 | Generic fade/slide | ⚠️ Minimum |
| 4 | Carefully choreographed | ✅ Target |
| 5 | Distinctive brand-led motion | 🎯 Flagship |

**Clay Clay Target:** Level 4 (Carefully choreographed) with Level 5 moments in hero and key interactions.
