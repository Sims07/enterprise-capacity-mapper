describe('Description des domaines N0 sur la cartographie', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  const openFirstDomainEditor = () => {
    cy.get('.domain-card').first().find('.domain-banner .mini-action-trigger').first().click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('[data-testid="domain-description"]').should('be.visible');
  };

  it('permet de modifier et de conserver la description N0 dans la carte', () => {
    openFirstDomainEditor();
    cy.get('[data-testid="domain-description"]').clear().type('Périmètre client et engagement.');
    cy.get('.modal-actions').contains('button', 'Enregistrer').click();

    cy.get('.domain-card').first().find('.domain-desc')
      .should('be.visible')
      .and('have.text', 'Périmètre client et engagement.')
      .and('have.css', 'font-size', '10px')
      .and('have.css', 'line-height', '14px');

    cy.reload();
    cy.get('.domain-card').first().find('.domain-desc')
      .should('have.text', 'Périmètre client et engagement.');
  });

  it('n’affiche aucun bloc de description lorsqu’une description N0 est vide', () => {
    openFirstDomainEditor();
    cy.get('[data-testid="domain-description"]').clear();
    cy.get('.modal-actions').contains('button', 'Enregistrer').click();

    cy.get('.domain-card').first().find('.domain-desc').should('not.exist');
    cy.get('.domain-card').first().should('not.contain.text', 'Aucune description');
  });

  it('n’affiche pas de texte de remplacement artificiel pour les descriptions N1', () => {
    cy.get('.cap-desc').should('not.contain.text', 'Aucune description');
    cy.get('.cap-desc').each($description => {
      expect($description.text().trim()).not.to.equal('');
    });
  });

  it('permet de modifier et conserver la description d’une capacité N1', () => {
    cy.get('.cap').first().find('.mini-action-trigger').click();
    cy.get('.context-menu').contains('button', 'Renommer').click();

    cy.get('[data-testid="capability-description"]').should('be.visible')
      .then($textarea => {
        const textareaWidth = $textarea[0].getBoundingClientRect().width;
        const fieldWidth = $textarea.closest('.field')[0].getBoundingClientRect().width;
        expect(textareaWidth).to.be.closeTo(fieldWidth, 1);
      })
      .clear().type('Capacité à piloter le cycle de vie client.');
    cy.get('.modal-actions').contains('button', 'Enregistrer').click();

    cy.get('.cap').first().find('.cap-desc')
      .should('be.visible')
      .and('have.text', 'Capacité à piloter le cycle de vie client.');

    cy.reload();
    cy.get('.cap').first().find('.cap-desc')
      .should('have.text', 'Capacité à piloter le cycle de vie client.');
  });

  it('utilise les tokens sémantiques pour les champs de description', () => {
    cy.document().then(doc => {
      const rules = [...doc.styleSheets].flatMap(sheet => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      });
      const fieldRule = rules.find(rule =>
        (rule as CSSStyleRule).selectorText?.includes('.field textarea[data-testid="domain-description"]')
      );
      const focusRule = rules.find(rule =>
        (rule as CSSStyleRule).selectorText?.includes('.field textarea:focus-visible')
      );

      expect(fieldRule, 'règle du champ description').to.exist;
      expect(focusRule, 'règle de focus du champ description').to.exist;
      expect((fieldRule as CSSStyleRule).style.getPropertyValue('background')).to.equal('var(--color-surface)');
      expect((fieldRule as CSSStyleRule).style.getPropertyValue('color')).to.equal('var(--color-text)');
      expect((fieldRule as CSSStyleRule).style.getPropertyValue('border')).to.include('--color-border-strong');
      expect((focusRule as CSSStyleRule).style.getPropertyValue('border-color')).to.equal('var(--color-focus)');
      expect((focusRule as CSSStyleRule).style.getPropertyValue('outline')).to.include('var(--color-focus)');
    });
  });

  it('étire les champs de description sur toute la largeur du formulaire N0', () => {
    openFirstDomainEditor();
    cy.get('[data-testid="domain-description"]').then($textarea => {
      const textareaWidth = $textarea[0].getBoundingClientRect().width;
      const fieldWidth = $textarea.closest('.field')[0].getBoundingClientRect().width;
      expect(textareaWidth).to.be.closeTo(fieldWidth, 1);
    });
  });
});

export {};
