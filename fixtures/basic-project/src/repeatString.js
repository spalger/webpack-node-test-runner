module.exports = function repeatString(str, n) {
  let out = ''
  let i = n
  while (i-- > 0) out += str
  return out
}
