describe('Instrumentation Istanbul pour Cypress', () => {
  it('expose des compteurs exécutables issus du code source', () => {
    cy.visit('/');
    cy.window().should((win) => {
      expect(win.__coverage__, 'window.__coverage__').to.be.an('object');
      const sourceFiles = Object.keys(win.__coverage__).filter((file) =>
        /[/\\\\]src[/\\\\]/.test(file),
      );
      expect(sourceFiles, 'fichiers src instrumentés').to.have.length.greaterThan(0);

      const executedFiles = sourceFiles.filter((file) => {
        const counters = win.__coverage__[file]?.s ?? {};
        return Object.values(counters).some((count) => count > 0);
      });
      expect(executedFiles, 'fichiers src réellement exécutés').to.have.length.greaterThan(0);
    });
  });
});
