import { resolve } from 'path'

export function findJsOutput(stats) {
  const { chunks, outputOptions } = stats.compilation
  const orphans = chunks.filter(c => !c.parents.length)
  const files = orphans.reduce((a, c) => a.concat(c.files), [])
  return files
    .filter(f => /\.js$/.test(f))
    .map(f => resolve(outputOptions.path, f))
}
