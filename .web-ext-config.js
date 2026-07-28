module.exports = {
  sourceDir: '.',
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
