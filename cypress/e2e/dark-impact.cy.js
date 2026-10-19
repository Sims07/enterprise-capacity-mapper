describe('Impact selection on the capability map', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
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
    cy.get('.cap.impact-selected').should('have.length.greaterThan', 0);
  };

  it('garde les titres de capacités sobres tout en indiquant discrètement la sélection', () => {
    cy.visit('/');
    cy.get('[data-testid="map-cap-select"]').first().then($title => {
      expect(Number.parseFloat(getComputedStyle($title[0]).fontWeight)).to.be.at.most(700);
      expect($title.css('text-decoration-line')).to.eq('none');
      expect($title.css('background-color')).to.eq('rgba(0, 0, 0, 0)');
    });
    cy.get('[data-testid="map-cap-select"]').contains('Gestion des Prospects & Leads').click().then($title => {
      expect($title).to.have.attr('aria-pressed', 'true');
      expect($title.css('text-decoration-line')).to.eq('none');
      expect($title.css('background-color')).not.to.eq('rgba(0, 0, 0, 0)');
    });
  });

  it('permet de sélectionner une capacité depuis la cartographie et de retrouver la sélection dans Impact', () => {
    cy.visit('/');
    cy.get('[data-testid="map-cap-select"]').contains('Gestion des Prospects & Leads').click();
    cy.get('.cap.impact-selected').should('contain.text', 'Gestion des Prospects & Leads');
    cy.get('header').contains('button', 'Impact').click();
    cy.contains('.cap-select', 'CRM-01 — Gestion des Prospects & Leads').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="clear-impact-selection"]').click();
    cy.contains('.cap-select', 'CRM-01 — Gestion des Prospects & Leads').should('have.attr', 'aria-pressed', 'false');
  });

  it('rend le surlignage violet clairement visible en thème clair en mode cartographie normal', () => {
    cy.visit('/');
    cy.get('.app').should('not.have.class', 'theme-dark');
    selectImpactAndReturnToMap();

    cy.get('.cap.impact-selected').each($el => {
      expect($el.css('border-top-color')).to.eq('rgb(124, 58, 237)');
      expect($el.css('border-top-width')).to.eq('2px');
      expect($el.css('background-color')).to.eq('rgb(237, 233, 254)');
      expect($el.css('box-shadow')).to.include('124, 58, 237');
    });
  });

  it('rend la sélection d’impact violette et lisible sur la cartographie sombre', () => {
    enableDarkTheme();
    selectImpactAndReturnToMap();

    cy.get('.cap.impact-selected').each($el => {
      expect($el.css('border-top-color')).to.eq('rgb(167, 139, 250)');
      expect($el.css('border-top-width')).to.eq('2px');
      expect($el.css('background-color')).to.eq('rgb(48, 39, 80)');
      expect($el.css('box-shadow')).to.include('139, 92, 246');
    });
  });

  it('affiche les conteneurs N0 et N1 sur des surfaces Linear Black sombres', () => {
    enableDarkTheme();

    cy.get('.domain-card').should('have.length.greaterThan', 0).each($el => {
      expect($el.css('background-color')).to.eq('rgb(32, 34, 40)');
      expect($el.css('border-top-color')).to.eq('rgb(52, 56, 66)');
      const header = $el.find('.domain-banner');
      expect(header.css('background-color')).to.eq(header[0].style.backgroundColor);
      expect(header.css('background-color')).not.to.eq('rgb(32, 34, 40)');
      expect($el.find('.cap').first().css('background-color')).to.eq('rgb(23, 26, 32)');
    });
  });

  it('assombrit légèrement les conteneurs N0 en mode présentation', () => {
    enableDarkTheme();

    cy.get('[data-testid="presentation-switch-input"]').check({ force: true });
    cy.get('.app').should('have.class', 'presentation-mode');
    cy.get('.domain-card').should('have.length.greaterThan', 0).each($el => {
      expect($el.css('background-color')).to.eq('rgb(29, 32, 38)');
      const header = $el.find('.domain-banner');
      expect(header.css('background-color')).to.eq(header[0].style.backgroundColor);
      expect(header.css('background-color')).not.to.eq('rgb(29, 32, 38)');
    });
  });

  it('conserve le violet d’impact dans la capacité sélectionnée et le fond sombre des autres N1', () => {
    enableDarkTheme();
    selectImpactAndReturnToMap();

    cy.get('.domain-card').contains('.cap.impact-selected', 'Gestion des Prospects & Leads').parents('.domain-card').within(() => {
      cy.get('.cap.impact-selected')
        .should('have.css', 'background-color', 'rgb(48, 39, 80)')
        .and('have.css', 'border-top-color', 'rgb(167, 139, 250)');
      cy.get('.cap:not(.impact-selected)').first()
        .should('have.css', 'background-color', 'rgb(23, 26, 32)');
    });
  });
});
