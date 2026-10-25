import '@cypress/code-coverage/support';

// Capture coverage after each test into a shard-local file. Each GitHub Actions
// runner uploads its own .nyc_output directory; the coverage job merges the
// independent Istanbul maps after all shards have completed.
afterEach(() => {
  cy.window({ log: false }).then((win) => {
    const coverage = win.__coverage__;
    if (coverage && Object.keys(coverage).length > 0) {
      return cy.task('saveCoverageShard', JSON.stringify(coverage), { log: false });
    }
    return null;
  });
});
