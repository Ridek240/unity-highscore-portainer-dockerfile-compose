// Returns up to ten real entries, never pads missing entries.
function exactPlacement(ranked, timestamp) {
  const index = ranked.findIndex(row => row.timestamp === timestamp);
  if (index === -1) return null;
  return {
    found: true,
    player: ranked[index],
    scores: ranked.slice(Math.max(0, index - 5), index + 5)
  };
}

function approximatePlacement(ranked, points) {
  // Tie rule: hypothetical entry sorts after existing entries with equal points.
  const nextLower = ranked.findIndex(row => row.points < points);
  const slot = nextLower === -1 ? ranked.length : nextLower;
  return {
    found: false,
    player: null,
    estimatedPlacement: slot + 1,
    scores: ranked.slice(Math.max(0, slot - 5), slot + 5)
  };
}

module.exports = { exactPlacement, approximatePlacement };
