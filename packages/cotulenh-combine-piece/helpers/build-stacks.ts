// Build script: Generate predefined-stacks.ts from blueprints.yaml
// Handles file I/O and parsing, feeds pure data to generate-stacks

import { generatePredefinedStacks } from './generate-stacks';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// Role flags - duplicated here to avoid circular import during build
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

interface BlueprintYaml {
  blueprints: { [carrierName: string]: string[][] };
}

interface Blueprint {
  [carrierRole: number]: number[][];
}

const OUTPUT_FILE = 'src/predefined-stacks.ts';
const YAML_FILE = 'blueprints.yaml';

/**
 * Parse YAML and convert to numeric blueprint
 */
function parseBlueprint(yamlPath: string): Blueprint {
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Blueprint YAML file not found: ${yamlPath}`);
  }

  try {
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const data = yaml.load(yamlContent) as BlueprintYaml;

    const blueprint: Blueprint = {};

    // Convert role names to numbers using local ROLE_FLAGS
    for (const [carrierName, slots] of Object.entries(data.blueprints)) {
      const carrierRole = ROLE_FLAGS[carrierName as keyof typeof ROLE_FLAGS];
      if (!carrierRole) {
        throw new Error(`Unknown carrier role: ${carrierName}`);
      }

      const numericSlots: number[][] = [];
      for (const slot of slots) {
        const numericSlot: number[] = [];
        for (const roleName of slot) {
          const roleNumber = ROLE_FLAGS[roleName as keyof typeof ROLE_FLAGS];
          if (!roleNumber) {
            throw new Error(`Unknown role: ${roleName}`);
          }
          numericSlot.push(roleNumber);
        }
        numericSlots.push(numericSlot);
      }

      blueprint[carrierRole] = numericSlots;
    }

    return blueprint;
  } catch (error) {
    throw new Error(`Failed to parse blueprint YAML: ${error}`);
  }
}

/**
 * Generate TypeScript code for the predefined stacks Map
 */
function generateStacksCode(stacks: Map<number, bigint>): string {
  let code = '// Auto-generated from blueprints.yaml - DO NOT EDIT MANUALLY\n';
  code += '// Run `npm run build:stacks` to regenerate\n\n';
  code += '// Pre-calculated valid stack combinations - Map for O(1) lookup\n';
  code += '// Key: role mask, Value: BigInt state\n';
  code += 'export const PREDEFINED_STACKS = new Map<number, bigint>([\n';

  // Sort by key for consistent output
  const sortedEntries = Array.from(stacks.entries()).sort((a, b) => a[0] - b[0]);

  for (const [mask, state] of sortedEntries) {
    code += `  [${mask}, ${state}n], // mask: ${mask.toString(2).padStart(11, '0')}\n`;
  }

  code += ']);\n';

  return code;
}

/**
 * Check if predefined-stacks.ts needs to be generated
 */
function needsGeneration(): boolean {
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.log(`📄 ${OUTPUT_FILE} does not exist`);
    return true;
  }

  if (!fs.existsSync(YAML_FILE)) {
    console.log(`⚠️  ${YAML_FILE} not found, but ${OUTPUT_FILE} exists`);
    return false; // Don't regenerate if YAML is missing
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
 * Main build function
 */
function buildStacks(force: boolean = false): void {
  try {
    if (!force && !needsGeneration()) {
      console.log(`✅ ${OUTPUT_FILE} is up to date`);
      return;
    }

    console.log('🔨 Building predefined stacks from blueprints.yaml...');

    // Check if YAML exists
    if (!fs.existsSync(YAML_FILE)) {
      throw new Error(`Blueprint file not found: ${YAML_FILE}`);
    }

    // Parse YAML to numeric blueprint
    const blueprint = parseBlueprint(YAML_FILE);

    // Generate stacks from numeric blueprint
    const stacks = generatePredefinedStacks(blueprint);
    console.log(`✅ Generated ${stacks.size} stack combinations`);

    // Generate TypeScript code
    const code = generateStacksCode(stacks);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output file
    fs.writeFileSync(OUTPUT_FILE, code, 'utf8');
    console.log(`✅ Generated ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

/**
 * Ensure predefined stacks exist (auto-generate if missing)
 */
function ensurePredefinedStacks(): void {
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.log(`🔧 Auto-generating missing ${OUTPUT_FILE}...`);
    buildStacks(true);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes('--force');
  buildStacks(force);
}

export { buildStacks, ensurePredefinedStacks };
