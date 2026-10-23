describe('Relations — hover N1 en Dark Linear', () => {
  it('permet le survol de la ligne N1 et de son bouton de libellé en thème sombre', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.window().then(win => {
      win.localStorage.setItem('enterprise-capacity-mapper:theme', 'dark');
    });
    cy.reload();

    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.coverage-tree').should('be.visible');

    cy.get('.tree-node-cap > .tree-row').first()
      .should('be.visible')
      .trigger('mouseover')
      .within(() => {
        cy.get('.tree-toggle')
          .should('be.visible')
          .trigger('mouseover');
        cy.get('.tree-name').should('be.visible');
      });

    // Vérifie que les règles de hover consomment les tokens sémantiques.
    // Les tests ne dépendent pas de valeurs RGB/RGBA concrètes.
    cy.document().then(doc => {
      const rules = [...doc.styleSheets].flatMap(sheet => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      });

      const rowHoverRule = rules.find(rule =>
        rule.selectorText?.includes('.app.theme-dark .coverage-tree .tree-node-cap > .tree-row:hover')
      );
      const toggleHoverRule = rules.find(rule =>
        rule.selectorText?.includes('.app.theme-dark .coverage-tree .tree-node-cap > .tree-row:hover .tree-toggle')
      );

      expect(rowHoverRule, 'la règle de hover de la ligne N1 est présente').to.exist;
      expect(toggleHoverRule, 'la règle de hover du bouton N1 est présente').to.exist;
      expect(rowHoverRule.style.getPropertyValue('background')).to.include('--relation-n1-hover-bg');
      expect(rowHoverRule.style.getPropertyValue('color')).to.include('--relation-n1-hover-text');
      expect(rowHoverRule.style.getPropertyValue('border-color')).to.include('--relation-n1-hover-border');
      expect(toggleHoverRule.style.getPropertyValue('background')).to.include('--relation-n1-hover-bg');
      expect(toggleHoverRule.style.getPropertyValue('color')).to.include('--relation-n1-hover-text');
    });
  });
});
