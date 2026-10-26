describe('Compagnon cartographe — decision brief', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('expose les priorités et questions de revue dans des sections distinctes', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-overview"]').click();

    cy.get('[data-testid="companion-answer"]').first()
      .should('contain.text', 'point(s) de vigilance')
      .and('not.contain.text', 'À retenir')
      .and('not.contain.text', 'Questions de revue');
    cy.get('[data-testid="companion-decision-brief"]').should('be.visible').within(() => {
      cy.get('h4').first().should('contain.text', 'À retenir');
      cy.contains('Questions à trancher').should('be.visible');
      cy.get('.companion-decision-priorities li').should('have.length.at.least', 1);
      cy.get('.companion-review-questions li').should('have.length.at.most', 2);
    });
  });
});
