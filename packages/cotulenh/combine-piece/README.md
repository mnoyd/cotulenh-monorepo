# @cotulenh/combine-piece

A pure logic engine for managing piece stacks in CoTuLenh. Handles the complex rules of combining up to 4 pieces into a single combat unit.

## Installation

```bash
pnpm add @cotulenh/combine-piece
```

## Usage

```typescript
import { PieceStacker, ROLE_FLAGS } from '@cotulenh/combine-piece';

const stacker = new PieceStacker((p) => p.roleFlag);
const newStack = stacker.combine([tank, infantry]);
```

## Features

- **Bitwise Engine**: Uses fast bitwise operations for combination validation.
- **O(1) Lookups**: Pre-calculated valid stack combinations.
- **Carrier Logic**: Automatically manages which piece acts as the carrier/transport.
- **Zero Dependencies**: Lightweight and portable core logic.

## License

Private
