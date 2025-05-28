`@bcd/typegen`

## Overview

`@bcd/typegen` transforms Mozilla's Browser Compatibility Data into fully typed, tree-shakeable TypeScript modules. It generates static types for all ~15,000 web platform features, enabling perfect IntelliSense and type safety when working with compatibility data.

## The Problem

When working with Mozilla's @mdn/browser-compat-data, you lose all IDE assistance due to TypeScript limitations:

### 1.  No Autocomplete for Deep Property Paths

```js
import bcd from '@mdn/browser-compat-data';

// ❌ Every property access is "possibly undefined"
import bcd from '@mdn/browser-compat-data';

// ❌ No IntelliSense at any level
bcd.css.properties.b // No suggestions - is it "background"? "border"? "box-shadow"?
bcd.css.properties.background. // No suggestions for sub-features
bcd.api. // No suggestions for APIs                                                                       ^^^^^^^ possibly undefined
```

### 2. "Possibly Undefined" Everywhere

```ts
// ❌ Every property access shows as potentially undefined
const support = bcd.css.properties.background.__compat.support;
//                  ^^^^^^^^^^ possibly undefined
//                             ^^^^^^^^^^ possibly undefined
//                                        ^^^^^^^^ possibly undefined
//                                                 ^^^^^^^ possibly undefined
```

**Root Cause: Generic Type System**

BCD uses a recursive Identifier type that can't provide specific IntelliSense:

```ts
type Identifier = {
  [key: string]: Identifier;  // ❌ Generic - no specific property names
  __compat?: CompatStatement;
}
```

## The Solution

I created this project to solve the IntelliSense problem and lay the groundwork for building seamless MDN compatibility table primitives for modern frameworks without any problems.

```typescript
import { CSS_DATA } from '@bcd/typegen/css';

// ✅ Perfect autocomplete for all CSS properties
CSS_DATA.properties.b // Shows: background, border, box-shadow...
CSS_DATA.properties.background. // Shows all sub-features

// ✅ No "possibly undefined" - guaranteed type safety
const support = CSS_DATA.properties.background.__compat.support;
```

## Contributing

We welcome contributions! Please:

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## License

MIT

## Data Source

Browser compatibility data sourced from [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data) (CC0 1.0 Universal).
