#!/usr/bin/env node

import { Runner } from './Runner'
import yargs from 'yargs'

const argv = yargs
  .options({
    config: {
      default: 'webpack.config.js',
      describe: 'path to webpack config',
    },
    stats: {
      boolean: true,
      default: true,
      describe: 'Don\'t show the webpack build stats when successfull',
    },
    clear: {
      boolean: true,
      default: true,
      describe: 'Don\'t clear the console before a rebuild',
    },
    watch: {
      boolean: true,
      default: false,
      describe: 'rebuild on change, and re-test changes',
    },
    silent: {
      boolean: true,
      default: false,
      describe: 'prevent all output',
    },
    manual: {
      boolean: true,
      default: false,
      describe: 'Print the command to run mocha in a seperate process',
    },
    interactive: {
      boolean: true,
      default: process.stdout.isTTY,
      describe: (
        'should logging be done in an interactive way? ' +
        'using --no-interactive will cause progress and ' +
        'clear to be disabled so that non-TTY stdout ' +
        'consumers don\'t get littered with useless ' +
        'output. The default is based on `process.stdout.isTTY`'
      ),
    },
  })
  .help()
  .argv

const runner = new Runner({
  cwd: process.cwd(),
  execArgv: argv._,
  watch: argv.watch,
  manual: argv.manual,
  webpackConfigFile: argv.config,

  log: {
    silent: argv.silent,
    clear: argv.interactive && argv.clear,
    progress: argv.interactive,
    webpackStats: argv.stats,
  },
})

runner.init()

process.on('exit', () => runner.abort())
