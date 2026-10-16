describe('Impact selection on the capability map', () => {
  beforeEach(() => {
    cy.clearLocalStorage('enterprise-capacity-mapper:theme');
  });

  const enableDarkTheme = () => {
    cy.visit('/');
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
  };

  const selectImpactAndReturnToMap = () => {
    cy.get('header').contains('button', 'Impact').click();
    cy.contains('.cap-select', 'CRM-01 — Gestion des Prospects & Leads')
      .click()
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('header').contains('button', 'Cartographie').click();
    cy.get('.impact-selected').should('have.length.greaterThan', 0);
  };

  it('rend le surlignage violet clairement visible en thème clair en mode cartographie normal', () => {
    cy.visit('/');
    selectImpactAndReturnToMap();

    cy.get('.impact-selected').each($el => {
      expect($el.css('border-top-color')).to.eq('rgb(124, 58, 237)');
      expect($el.css('border-top-width')).to.eq('2px');
      expect($el.css('background-color')).to.eq('rgb(237, 233, 254)');
      expect($el.css('box-shadow')).to.include('rgb(124, 58, 237)');
    });
    cy.get('.domain-card.impact-selected').each($card => {
      expect($card.find('.domain-banner').css('background-color')).to.eq('rgb(221, 214, 254)');
    });
  });

  it('rend la sélection d’impact violette et lisible sur la cartographie sombre', () => {
    enableDarkTheme();
    selectImpactAndReturnToMap();

    cy.get('.impact-selected').each($el => {
      expect($el.css('border-top-color')).to.eq('rgb(167, 139, 250)');
      expect($el.css('border-top-width')).to.eq('2px');
      expect($el.css('background-color')).to.eq('rgb(48, 39, 80)');
      expect($el.css('box-shadow')).to.include('rgb(139, 92, 246)');
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

  it('conserve le violet d’impact et les surfaces N1 sombres dans une carte N0 sélectionnée', () => {
    enableDarkTheme();
    selectImpactAndReturnToMap();

    cy.get('.domain-card.impact-selected').each($card => {
      expect($card.css('background-color')).to.eq('rgb(48, 39, 80)');
      expect($card.css('border-top-color')).to.eq('rgb(167, 139, 250)');
      expect($card.find('.domain-banner').css('background-color')).to.eq('rgb(56, 45, 90)');
      expect($card.find('.cap').not('.impact-selected').first().css('background-color')).to.eq('rgb(23, 26, 32)');
    });
  });
});
