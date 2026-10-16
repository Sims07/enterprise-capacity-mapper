describe('Dark Linear impact selection', () => {
  beforeEach(() => {
    cy.clearLocalStorage('enterprise-capacity-mapper:theme');
  });

  const enableDarkTheme = () => {
    cy.visit('/');
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
  };

  it('rend la sélection d’impact violette et lisible sur la cartographie sombre', () => {
    enableDarkTheme();

    cy.get('header').contains('button', 'Impact').click();
    cy.contains('.cap-select', 'CRM-01 — Gestion des Prospects & Leads')
      .click()
      .should('have.attr', 'aria-pressed', 'true');

    cy.get('header').contains('button', 'Cartographie').click();
    cy.get('.impact-selected').should('have.length.greaterThan', 0).each($el => {
      expect($el.css('border-top-color')).to.eq('rgb(139, 92, 246)');
      expect($el.css('border-top-width')).to.eq('2px');
      expect($el.css('background-color')).to.eq('rgb(42, 35, 69)');
      expect($el.css('box-shadow')).to.include('rgba(139, 92, 246, 0.16)');
    });
  });

  it('affiche les conteneurs N0 et N1 sur des surfaces Linear Black sombres', () => {
    enableDarkTheme();

    cy.get('.domain-card').should('have.length.greaterThan', 0).each($el => {
      expect($el.css('background-color')).to.eq('rgb(32, 34, 40)');
      expect($el.css('border-top-color')).to.eq('rgb(52, 56, 66)');
      expect($el.find('.domain-banner').css('background-color')).to.eq('rgb(32, 34, 40)');
      expect($el.find('.cap').first().css('background-color')).to.eq('rgb(23, 26, 32)');
    });
  });

  it('assombrit légèrement les conteneurs N0 en mode présentation', () => {
    enableDarkTheme();

    cy.get('[data-testid="presentation-switch-input"]').check({ force: true });
    cy.get('.app').should('have.class', 'presentation-mode');
    cy.get('.domain-card').should('have.length.greaterThan', 0).each($el => {
      expect($el.css('background-color')).to.eq('rgb(29, 32, 38)');
      expect($el.find('.domain-banner').css('background-color')).to.eq('rgb(29, 32, 38)');
    });
  });
});
