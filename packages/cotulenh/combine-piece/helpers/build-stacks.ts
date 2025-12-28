/**
 * Build script: Generate predefined-stacks.ts from blueprints.yaml
 *
 * Workflow:
 * 1. Read blueprints.yaml
 * 2. Parse YAML and convert role names to numbers
 * 3. Generate all valid combinations
 * 4. Output as TypeScript code
 *
 * Note: ROLE_FLAGS duplicated here to avoid circular import during build
 */

import { generatePredefinedStacks } from './generate-stacks.js';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/** Role flags from src/index.ts (duplicated for build-time access) */
const ROLE_FLAGS = {
  COMMANDER: 1,
  INFANTRY: 2,
  MILITIA: 4,
  ARTILLERY: 8,
  ANTI_AIR: 16,
  MISSILE: 32,
  TANK: 64,
  AIR_FORCE: 128,
  ENGINEER: 256,
  NAVY: 512,
  HEADQUARTER: 1024
} as const;

/** Parsed YAML blueprint format (role names as strings) */
interface BlueprintYaml {
  blueprints: { [carrierName: string]: string[][] };
}

/** Numeric blueprint format used by generator (role flags as numbers) */
interface Blueprint {
  [carrierRole: number]: number[][];
}

const OUTPUT_FILE = 'src/predefined-stacks.ts';
const YAML_FILE = 'blueprints.yaml';

/**
 * Parse YAML blueprint file and convert role names to numeric flags
 * @param yamlPath Path to blueprints.yaml
 * @returns Blueprint with numeric role flags
 * @throws Error if YAML is missing, invalid, or contains unknown roles
 */
function parseBlueprint(yamlPath: string): Blueprint {
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Blueprint YAML file not found: ${yamlPath}`);
  }

  try {
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const data = yaml.load(yamlContent) as BlueprintYaml;
    const blueprint: Blueprint = {};

    for (const [carrierName, slots] of Object.entries(data.blueprints)) {
      const carrierRole = ROLE_FLAGS[carrierName as keyof typeof ROLE_FLAGS];
      if (!carrierRole) {
        throw new Error(`Unknown carrier role: ${carrierName}`);
      }

      const numericSlots = slots.map((slot) =>
        slot.map((roleName) => {
          const roleNumber = ROLE_FLAGS[roleName as keyof typeof ROLE_FLAGS];
          if (!roleNumber) throw new Error(`Unknown role: ${roleName}`);
          return roleNumber;
        })
      );

      blueprint[carrierRole] = numericSlots;
    }

    return blueprint;
  } catch (error) {
    throw new Error(`Failed to parse blueprint YAML: ${error}`);
  }
}

/**
 * Generate TypeScript code for the predefined stacks Map
 * @param stacks Pre-calculated valid stack combinations
 * @returns TypeScript code as string
 */
function generateStacksCode(stacks: Map<number, bigint>): string {
  let code = '// Auto-generated from blueprints.yaml - DO NOT EDIT MANUALLY\n';
  code += '// Run `npm run build:stacks` to regenerate\n\n';
  code += '// Pre-calculated valid stack combinations - Map for O(1) lookup\n';
  code += '// Key: role mask, Value: BigInt state\n';
  code += 'export const PREDEFINED_STACKS = new Map<number, bigint>([\n';

  const sortedEntries = Array.from(stacks.entries()).sort((a, b) => a[0] - b[0]);

  for (const [mask, state] of sortedEntries) {
    code += `  [${mask}, ${state}n], // mask: ${mask.toString(2).padStart(11, '0')}\n`;
  }

  code += ']);\n';
  return code;
}

/**
 * Check if predefined-stacks.ts needs to be regenerated
 * Compares modification times of YAML vs generated file
 * @returns true if generation is needed, false otherwise
 */
function needsGeneration(): boolean {
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.log(`📄 ${OUTPUT_FILE} does not exist`);
    return true;
  }

  if (!fs.existsSync(YAML_FILE)) {
    console.log(`⚠️  ${YAML_FILE} not found, but ${OUTPUT_FILE} exists`);
    return false;
  }

  const yamlStats = fs.statSync(YAML_FILE);
  const outputStats = fs.statSync(OUTPUT_FILE);

  if (yamlStats.mtime > outputStats.mtime) {
    console.log(`📄 ${YAML_FILE} is newer than ${OUTPUT_FILE}`);
    return true;
  }

  return false;
}

/**
 * Main build function - generates predefined stacks from blueprints.yaml
 * @param force Skip timestamp check and always regenerate
 */
function buildStacks(force: boolean = false): void {
  try {
    if (!force && !needsGeneration()) {
      console.log(`✅ ${OUTPUT_FILE} is up to date`);
      return;
    }

    console.log('🔨 Building predefined stacks from blueprints.yaml...');

    if (!fs.existsSync(YAML_FILE)) {
      throw new Error(`Blueprint file not found: ${YAML_FILE}`);
    }

    const blueprint = parseBlueprint(YAML_FILE);
    const stacks = generatePredefinedStacks(blueprint);
    console.log(`✅ Generated ${stacks.size} stack combinations`);

    const code = generateStacksCode(stacks);
    const outputDir = path.dirname(OUTPUT_FILE);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, code, 'utf8');
    console.log(`✅ Generated ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

/**
 * Ensure predefined stacks exist - auto-generates if missing
 */
function ensurePredefinedStacks(): void {
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.log(`🔧 Auto-generating missing ${OUTPUT_FILE}...`);
    buildStacks(true);
  }
}

// Run if invoked directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes('--force');
  buildStacks(force);
}

export { buildStacks, ensurePredefinedStacks };
