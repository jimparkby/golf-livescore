/**
 * HCP Group utilities for tournament predictions
 */

/**
 * Determine HCP group based on player's HCP and gender
 * @param {number} hcp - Player handicap
 * @param {string} gender - Player gender ('man' or 'woman')
 * @returns {string} - HCP group name
 */
export function getHcpGroup(hcp, gender = 'man') {
  const normalizedGender = gender.toLowerCase()

  if (normalizedGender === 'woman') {
    if (hcp <= 24) {
      return 'Woman A HCP по 24'
    } else {
      return 'Woman B HCP 24,1-36'
    }
  } else {
    // Default to man groups
    if (hcp <= 13.5) {
      return 'Man A HCP по 13,5'
    } else if (hcp <= 22) {
      return 'Man B HCP 13,6-22'
    } else {
      return 'Man C HCP 22,1-36'
    }
  }
}

/**
 * Get all HCP groups
 * @returns {Array} - List of all HCP groups
 */
export function getAllHcpGroups() {
  return [
    'Man A HCP по 13,5',
    'Man B HCP 13,6-22',
    'Man C HCP 22,1-36',
    'Woman A HCP по 24',
    'Woman B HCP 24,1-36',
  ]
}

/**
 * Detect gender from player name (simple heuristic)
 * @param {string} name - Player name
 * @returns {string} - 'man' or 'woman'
 */
export function detectGender(name) {
  // Common female name endings in Russian
  const femaleEndings = ['ва', 'на', 'ая', 'ья', 'ина', 'ова', 'ева', 'ская']
  const normalizedName = name.toLowerCase().trim()

  for (const ending of femaleEndings) {
    if (normalizedName.endsWith(ending)) {
      return 'woman'
    }
  }

  return 'man'
}
