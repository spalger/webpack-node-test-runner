const context = require.context('./', true, /test/)
context.keys().forEach(k => context(k))
