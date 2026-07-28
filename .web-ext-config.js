module.exports = {
  sourceDir: 'src',
  artifactsDir: 'web-ext-artifacts',
  build: {
    overwriteDest: true,
    filename: 'reclaim_focus-{version}.xpi'
  },
  run: {
    firefox: 'firefox',
    startUrl: ['about:debugging'],
    keepProfileChanges: false
  }
};
