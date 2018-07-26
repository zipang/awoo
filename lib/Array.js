const _MAP = { true: 0, false: 1 } // how we map boolean return

Array.prototype.part = function(fn, inside) {
  const parts = inside || [[], []] // we usually split in 2

  for (let item of this) {
    let keys = fn(item)
    if (!Array.isArray(keys)) keys = [keys]

    for (let k of keys) {
      k = (k in _MAP ? _MAP[k] : k) // true|false are remapped as 0 and 1
      if (!(k in parts)) {
        parts[k] = []  // initialize an empty array for every new keys
      }
      parts[k].push(item)
    }
  }
  return parts
}
