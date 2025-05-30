#!/usr/bin/env node

import { algebraic } from '../dist/esm/src/type.js'

function main() {
  // Accepts: -d <decimal_number> or -h <hex_number>
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error(
      'Usage: ./algebraic-cli.ts [-d <decimal_number> | -h <hex_number>]',
    )
    process.exit(1)
  }

  let input = undefined
  let base = 10

  if (args[0] === '-d') {
    base = 10
    input = args[1]
  } else if (args[0] === '-h') {
    base = 16
    input = args[1]
  } else {
    // Default to decimal if no flag
    input = args[0]
    base = 10
  }

  if (!input) {
    console.error('Error: No number provided.')
    process.exit(1)
  }

  const squareNumber = parseInt(input, base)

  if (isNaN(squareNumber)) {
    console.error(
      `Error: Invalid input "${input}" for base ${base}. Please provide a valid number.`,
    )
    process.exit(1)
  }

  try {
    const result = algebraic(squareNumber)
    console.log(`Algebraic notation for square ${squareNumber} is: ${result}`)
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error converting square ${squareNumber}: ${error.message}`)
    } else {
      console.error(
        `An unknown error occurred while converting square ${squareNumber}`,
      )
    }
    process.exit(1)
  }
}

main()
