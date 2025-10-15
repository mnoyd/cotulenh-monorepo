/**
 * Factory for creating a fully configured MoveGenerator
 */

import { MoveGenerator } from './MoveGenerator'
import {
  InfantryGenerator,
  TankGenerator,
  MilitiaGenerator,
  ArtilleryGenerator,
  MissileGenerator,
  AntiAirGenerator,
  CommanderGenerator,
  NavyGenerator,
  AirForceGenerator,
  HeadquarterGenerator,
} from './pieces'

/**
 * Create a MoveGenerator with all piece generators registered
 */
export function createMoveGenerator(): MoveGenerator {
  const generator = new MoveGenerator()

  // Register all piece generators
  generator.registerGenerator(new CommanderGenerator())
  generator.registerGenerator(new InfantryGenerator())
  generator.registerGenerator(new TankGenerator())
  generator.registerGenerator(new MilitiaGenerator())
  generator.registerGenerator(new ArtilleryGenerator())
  generator.registerGenerator(new MissileGenerator())
  generator.registerGenerator(new AntiAirGenerator())
  generator.registerGenerator(new NavyGenerator())
  generator.registerGenerator(new AirForceGenerator())
  generator.registerGenerator(new HeadquarterGenerator())

  return generator
}
