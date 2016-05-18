import yargs from 'yargs'

export const argv = yargs
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
  })
  .help()
  .argv
