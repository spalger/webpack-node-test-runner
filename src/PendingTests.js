
export class PendingTests {
  constructor() {
    this.all = new Set()
  }

  addFromStats(stats) {
    const { all } = this
    const { modules } = stats.compilation
    const idsByRequest = new Map()

    modules.forEach(m => {
      if (!m.rawRequest) return

      idsByRequest.set(m.rawRequest, m.id)
      if (m.built) all.add(m.rawRequest)
    })

    return [...all]
      .map(req => idsByRequest.get(req))
      .filter(id => id != null)
  }

  clear() {
    this.all.clear()
  }
}
