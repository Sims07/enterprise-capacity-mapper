describe('Compagnon cartographe — decision brief', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('expose les priorités et questions de revue dans la synthèse locale', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-overview"]').click();
    cy.get('[data-testid="companion-answer"]').first()
      .should('contain.text', 'À retenir:')
      .and('contain.text', 'Questions de revue:');
  });
});
