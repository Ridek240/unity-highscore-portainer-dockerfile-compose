function validPoints(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function validTimestamp(value) {
  return Number.isSafeInteger(value) && value > 0;
}
function validUsername(value) {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 24;
}
function parseUnsignedInteger(raw) {
  if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}
module.exports = { validPoints, validTimestamp, validUsername, parseUnsignedInteger };
