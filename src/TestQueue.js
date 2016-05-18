import { relative } from 'path'

export class TestQueue {
  constructor(runner) {
    this.cwd = runner.config.cwd
    this.queue = new Set()
    this.pattern = /test/
  }

  addFromStats(stats) {
    const { queue } = this
    const { modules } = stats.compilation

    const dependents = new Set()
    const resourceIds = new Map()

    // add the module to the queue if the module
    // is a test module (matches the pattern) -- track
    // all dependents in the dependents Set so we
    // can prevent circular recursion (and stack overflow)
    const traverse = m => {
      if (!m.resource || dependents.has(m.resource)) return
      dependents.add(m.resource)
      resourceIds.set(m.resource, m.id)

      if (this.pattern.test(relative(this.cwd, m.resource))) {
        queue.add(m.resource)
      }

      // recurse
      m.reasons.forEach(r => traverse(r.module))
    }

    // traverse from all built modules to find the
    // test modules that require them
    modules.forEach(m => {
      if (m.built) traverse(m)
    })

    // convert the queue into module ids, and drop any
    // resources that don't have a module id right now
    return [...queue]
      .map(res => resourceIds.get(res))
      .filter(id => id != null)
  }

  clear() {
    this.queue.clear()
  }
}
