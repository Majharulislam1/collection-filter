# Minimog Collection Page Filtering System - Port to Dawn

This directory (`dawn-collection-port/`) contains the complete port of Minimog 6.0.0's collection page filtering, sorting, grid layout, and pagination system adapted to work seamlessly inside the Dawn theme without modifying or breaking any of Dawn's native files or functions.

All CSS rules in `assets/mm-collection.css` are 100% scoped under `.mm-collection-wrapper` so they cannot bleed into or affect Dawn's header, footer, cart drawer, modals, or other sections.

---

## 1. File List & Mapping to Dawn

Copy each file below from `dawn-collection-port/` into your target `Dawn` theme at the matching relative path:

### Sections
| Source File | Copy To (Dawn Path) | Description |
|---|---|---|
| `sections/main-collection-minimog.liquid` | `sections/main-collection-minimog.liquid` | Ported Minimog collection product listing section with Storefront & Tag filters, sidebar positions (left, right, off-canvas), column switcher (1-5 columns), sorting, and 3 pagination types (numbers, load more, infinite) |

### Snippets
All ported snippets use the `mm-` prefix to prevent collisions with existing Dawn snippets:

| Source File | Copy To (Dawn Path) | Description |
|---|---|---|
| `snippets/mm-collection-sidebar.liquid` | `snippets/mm-collection-sidebar.liquid` | Filter sidebar container (left, right, off-canvas drawer) |
| `snippets/mm-collection-page-toolbar.liquid` | `snippets/mm-collection-page-toolbar.liquid` | Toolbar with column switcher (1-5 cols) and sort selector |
| `snippets/mm-collection-filters-facets.liquid` | `snippets/mm-collection-filters-facets.liquid` | Active filter badges / clear pills for Storefront filters |
| `snippets/mm-selected-tags-filter.liquid` | `snippets/mm-selected-tags-filter.liquid` | Active tag filter badges for Tag-based filter mode |
| `snippets/mm-sort-by-mobile.liquid` | `snippets/mm-sort-by-mobile.liquid` | Mobile sort bottom sheet drawer |
| `snippets/mm-pagination.liquid` | `snippets/mm-pagination.liquid` | Standard pagination markup |
| `snippets/mm-icon.liquid` | `snippets/mm-icon.liquid` | Minimog SVG icons (including empty collection state) |
| `snippets/mm-new-locale.liquid` | `snippets/mm-new-locale.liquid` | Fallback locale translation resolver for ported keys |
| `snippets/mm-storefront-filters.liquid` | `snippets/mm-storefront-filters.liquid` | Storefront Filtering API facets, price range sliders, and color swatches |
| `snippets/mm-filter-by-tags.liquid` | `snippets/mm-filter-by-tags.liquid` | Tag-based filtering and custom collection menus |
| `snippets/mm-responsive-image.liquid` | `snippets/mm-responsive-image.liquid` | Responsive image element wrapper |
| `snippets/mm-image-card.liquid` | `snippets/mm-image-card.liquid` | Promotion banner widget for sidebar |
| `snippets/mm-get_swatch_texture.liquid` | `snippets/mm-get_swatch_texture.liquid` | Texture swatch lookup snippet |
| `snippets/mm-product-card-1.liquid` | `snippets/mm-product-card-1.liquid` | Minimog product card layout 1 with image hover, swatches, quick add, and badges |
| `snippets/mm-product-prices.liquid` | `snippets/mm-product-prices.liquid` | Product price display with sale badge support |
| `snippets/mm-product-card-option.liquid` | `snippets/mm-product-card-option.liquid` | Card variant color swatch picker |
| `snippets/mm-product-card-quick-add-btn.liquid` | `snippets/mm-product-card-quick-add-btn.liquid` | Quick add button for product card |
| `snippets/mm-tooltip.liquid` | `snippets/mm-tooltip.liquid` | Card action tooltips (quickview, wishlist, compare, add to cart) |
| `snippets/mm-product-reviews-app__badge.liquid` | `snippets/mm-product-reviews-app__badge.liquid` | Review badge connector (defaults cleanly to Shopify Reviews) |

### Assets
| Source File | Copy To (Dawn Path) | Description |
|---|---|---|
| `assets/mm-collection.js` | `assets/mm-collection.js` | Self-contained, multi-init safe JS bundle handling filters, sorting, column switcher, load more, infinite scroll, sticky toolbar, and card quick add |
| `assets/mm-collection.css` | `assets/mm-collection.css` | Complete collection styling, fully scoped under `.mm-collection-wrapper` |
| `assets/mm-component-product-inventory.css` | `assets/mm-component-product-inventory.css` | Inventory indicator styling |
| `assets/mm-component-image-card.css` | `assets/mm-component-image-card.css` | Sidebar banner image card styling |
| `assets/mm-filter_color1.png` | `assets/mm-filter_color1.png` | Swatch image texture 1 |
| `assets/mm-filter_color2.png` | `assets/mm-filter_color2.png` | Swatch image texture 2 |

### Locales
| Source File | Copy To (Dawn Path) | Description |
|---|---|---|
| `locales/en.default.minimog-keys.json` | *Manual merge* | Supplementary translation keys used by the ported section. Merge these into Dawn's `locales/en.default.json` without overwriting existing Dawn keys. |

### Templates
| Source File | Copy To (Dawn Path) | Description |
|---|---|---|
| `templates/collection.minimog.json` | `templates/collection.minimog.json` | Collection template configured with Dawn's `main-collection-banner` and `main-collection-minimog` |

---

## 2. CSS Scoping & Dead Rule Cleanup

To ensure total isolation and prevent styles from leaking into Dawn's global layout:
- **100% Scoped**: Every selector in `assets/mm-collection.css` is prefixed under `.mm-collection-wrapper` (including inside `@media` queries).
- **Zero Unscoped Selectors**: Excludes only `@keyframes` animation step names (`0%`, `100%`, `from`, `to`).
- **Safely Scoped Global Rules**:
  - `input[type=number]::-webkit-*-spin-button` and `input::-webkit-*-spin-button` are strictly scoped to `.mm-collection-wrapper input...`.
  - `.rte a` rules are strictly scoped to `.mm-collection-wrapper .rte a` to prevent modifying Dawn's rich text links elsewhere.
- **Removed Dead Rule Groups**:
  - `.foxkit-*` (Foxkit proprietary flash sales)
  - `.spr-*` (Shopify Product Reviews legacy styles)
  - `.shopify-payment-button__button*` (accelerated checkout button styles)
  - `.quantity__rules-cart*`
  - `.deferred-media__poster-button*`
  - `.main-product__block-inventory_status*`
  - `.in-prod-page*`
  - `.m-countdown-timer*` (Dawn has no countdown)

---

## 3. Anything That Could Not Be Ported and Why

1. **Foxkit Proprietary Scripts & Badges (`foxkit-*`)**:
   - *Reason*: Foxkit is a closed-source Minimog companion app. Flash sale countdowns and preorder badges require an active Foxkit backend server.
2. **Alternative Product Card Layouts 2 through 5**:
   - *Reason*: Minimog's active layout setting is Card Layout 1. Per specification, only the active layout (`product-card-1`) and its dependent snippets were ported to avoid unused code overhead.
3. **External Review / Wishlist App Renders (`growave`, `judgeme`, `socialshopwave`)**:
   - *Reason*: Third-party app widgets require store-specific app installations and script tags. Standard fallbacks and clean direct links are provided instead.

---

## 4. Installation Steps

1. **Copy Files**:
   - Copy `sections/`, `snippets/`, `assets/`, and `templates/` into your Dawn theme.
2. **Merge Locale Keys**:
   - Open `locales/en.default.minimog-keys.json` and merge the nested keys into your Dawn theme's `locales/en.default.json`.
3. **Verify Theme Template in Shopify Admin**:
   - Go to **Online Store > Themes > Customize (Dawn)**.
   - Using the top template selector, switch to **Collections > minimog** (`collection.minimog`).
   - If assigning to specific collections, go to **Products > Collections** in Shopify Admin, open a collection, and under **Theme template** in the bottom-right, choose **minimog**.
4. **Configure Section**:
   - In the theme editor sidebar for the collection page, customize the **Product listing (Minimog)** section:
     - **Filters**: Storefront filters or Tags filter.
     - **Sidebar**: Left column, Right column, or Fixed (off-canvas drawer).
     - **Columns switcher**: Show/hide 1 to 5 grid columns.
     - **Pagination type**: Numbered pagination, Load more button, or Infinite loading.
     - **Product card settings**: Image ratio, hover second image, color swatches, quick add button, alignment, sale badges, sold-out badges.
