#!/usr/bin/env node

import { algebraic } from '../dist/esm/src/type.js'

function main() {
  const input = process.argv[2]

  if (!input) {
    console.error('Usage: ./algebraic-cli.ts <square_number>')
    process.exit(1)
  }

  const squareNumber = parseInt(input, 10)

  if (isNaN(squareNumber)) {
    console.error(`Error: Invalid input "${input}". Please provide a number.`)
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
