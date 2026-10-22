import '@cypress/code-coverage/support';

// Cypress 16 can expose the instrumented AUT window through cy.window() while
// the code-coverage plugin's window:load hook misses it. Collect the same
// coverage object explicitly after each test so every spec contributes to the
// single Istanbul map.
afterEach(() => {
  cy.window({ log: false }).then((win) => {
    const coverage = win.__coverage__;
    if (coverage && Object.keys(coverage).length > 0) {
      return cy.task('combineCoverage', JSON.stringify(coverage), { log: false });
    }
    return null;
  });
});
