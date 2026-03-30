// Glicko-2 Rating System Implementation
// Based on Mark Glickman's paper: "Example of the Glicko-2 System"
// Pure TypeScript, no dependencies. Works in Node.js and Deno.

export const GLICKO2_DEFAULTS = {
  rating: 1500,
  rd: 350,
  volatility: 0.06
} as const;

// System constant (tau) — constrains volatility change. 0.5 recommended for chess.
const TAU = 0.5;

// Convergence tolerance for volatility iteration
const EPSILON = 0.000001;

// Glicko-2 scaling factor: converts between Glicko-1 and Glicko-2 scales
const SCALE = 173.7178;

type PlayerRating = {
  rating: number;
  rd: number;
  volatility: number;
};

type OpponentRating = {
  rating: number;
  rd: number;
};

type MatchResult = {
  opponent: OpponentRating;
  score: number;
};

/** Convert Glicko-1 rating to Glicko-2 scale */
function toGlicko2(rating: number): number {
  return (rating - 1500) / SCALE;
}

/** Convert Glicko-2 rating back to Glicko-1 scale */
function fromGlicko2(mu: number): number {
  return mu * SCALE + 1500;
}

/** Convert Glicko-1 RD to Glicko-2 scale */
function rdToGlicko2(rd: number): number {
  return rd / SCALE;
}

/** Convert Glicko-2 RD back to Glicko-1 scale */
function rdFromGlicko2(phi: number): number {
  return phi * SCALE;
}

/** g(phi) function — reduces impact of opponent's rating based on their RD */
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/** E(mu, mu_j, phi_j) — expected score */
function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/** Compute new volatility using the Illinois algorithm (Section 5.4 of Glickman paper) */
function computeNewVolatility(sigma: number, phi: number, v: number, delta: number): number {
  const a = Math.log(sigma * sigma);
  const deltaSq = delta * delta;
  const phiSq = phi * phi;

  function f(x: number): number {
    const ex = Math.exp(x);
    const num1 = ex * (deltaSq - phiSq - v - ex);
    const den1 = 2 * (phiSq + v + ex) * (phiSq + v + ex);
    const num2 = x - a;
    const den2 = TAU * TAU;
    return num1 / den1 - num2 / den2;
  }

  // Initial bounds
  let A = a;
  let B: number;

  if (deltaSq > phiSq + v) {
    B = Math.log(deltaSq - phiSq - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) {
      k++;
    }
    B = a - k * TAU;
  }

  // Illinois algorithm iteration
  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);

    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }

    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

/**
 * Calculate new Glicko-2 rating after a rating period.
 *
 * This matches Glickman's published formulation where all games in a period
 * are evaluated together.
 */
export function calculateGlicko2RatingPeriod(
  player: PlayerRating,
  results: MatchResult[]
): PlayerRating {
  if (results.length === 0) {
    return { ...player };
  }

  // Step 2: Convert to Glicko-2 scale
  const mu = toGlicko2(player.rating);
  const phi = rdToGlicko2(player.rd);
  const sigma = player.volatility;

  const transformedResults = results.map(({ opponent, score }) => {
    const muJ = toGlicko2(opponent.rating);
    const phiJ = rdToGlicko2(opponent.rd);
    const gPhiJ = g(phiJ);
    const eVal = E(mu, muJ, phiJ);
    return { score, gPhiJ, eVal };
  });

  // Step 3: Compute v (estimated variance)
  const varianceDenominator = transformedResults.reduce(
    (sum, result) => sum + result.gPhiJ * result.gPhiJ * result.eVal * (1 - result.eVal),
    0
  );
  const v = 1 / varianceDenominator;

  // Step 4: Compute delta (estimated improvement)
  const deltaSum = transformedResults.reduce(
    (sum, result) => sum + result.gPhiJ * (result.score - result.eVal),
    0
  );
  const delta = v * deltaSum;

  // Step 5: Compute new volatility
  const newSigma = computeNewVolatility(sigma, phi, v, delta);

  // Step 6: Update RD to pre-rating period value
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

  // Step 7: Update rating and RD
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * deltaSum;

  // Convert back to Glicko-1 scale, round rating and RD to integers
  return {
    rating: Math.round(fromGlicko2(newMu)),
    rd: Math.round(rdFromGlicko2(newPhi)),
    volatility: parseFloat(newSigma.toFixed(6))
  };
}

/**
 * Calculate new Glicko-2 rating after a single game.
 *
 * @param player - Current player rating { rating, rd, volatility }
 * @param opponent - Opponent rating { rating, rd }
 * @param score - Game result: 1.0 = win, 0.5 = draw, 0.0 = loss
 * @returns New player rating { rating, rd, volatility } with integer rating/rd
 */
export function calculateGlicko2(
  player: PlayerRating,
  opponent: OpponentRating,
  score: number
): PlayerRating {
  return calculateGlicko2RatingPeriod(player, [{ opponent, score }]);
}
