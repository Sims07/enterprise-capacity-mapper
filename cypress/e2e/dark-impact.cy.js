describe('Dark Linear impact selection', () => {
  beforeEach(() => {
    cy.clearLocalStorage('enterprise-capacity-mapper:theme');
  });

  it('rend la sélection d’impact violette et lisible sur la cartographie sombre', () => {
    cy.visit('/');

    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');

    cy.get('header').contains('button', 'Impact').click();
    cy.contains('.cap-select', 'CRM-01 — Gestion des Prospects & Leads')
      .click()
      .should('have.attr', 'aria-pressed', 'true');

    cy.get('header').contains('button', 'Cartographie').click();
    cy.get('.impact-selected').should('have.length.greaterThan', 0).each($el => {
      expect($el.css('border-top-color')).to.eq('rgb(167, 139, 250)');
      expect($el.css('border-top-width')).to.eq('2px');
    });
  });
});
