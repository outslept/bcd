# @bcd/typegen

Type-safe Browser Compatibility Data for TypeScript.

## Problem

Mozilla's `@mdn/browser-compat-data` provides no IntelliSense or type safety:

```ts
import bcd from '@mdn/browser-compat-data';

// No autocomplete - which properties exist?
bcd.css.properties.b

// Everything is "possibly undefined"
const support = bcd.css?.properties?.background?.__compat?.support;
```

## Solution

```ts
import { css } from '@bcd/typegen/css';

// Full autocomplete for all CSS properties
css.properties.background.__compat.support

// Guaranteed type safety - no optional chaining
const support = css.properties.grid.__compat.support;
```

## Installation

```bash
npm install @bcd/typegen
```

## Data Source

Compatibility data from [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data) (CC0 1.0 Universal).

## License

MIT
