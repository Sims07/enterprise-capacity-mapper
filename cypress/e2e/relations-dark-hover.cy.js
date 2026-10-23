describe('Relations — hover N1 en Dark Linear', () => {
  it('couvre la ligne N1 et son bouton de libellé sans réintroduire le hover clair', () => {
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

    cy.get('.coverage-tree')
      .should('have.css', '--relation-n1-hover-bg', '#202733')
      .and('have.css', '--relation-n1-hover-text', '#f1f5f9');

    cy.get('.tree-node-cap > .tree-row').first()
      .should('be.visible')
      .trigger('mouseover')
      .find('.tree-toggle')
      .trigger('mouseover')
      .find('.tree-name')
      .should('be.visible');

    cy.document().then(doc => {
      const rules = [...doc.styleSheets]
        .flatMap(sheet => {
          try {
            return [...sheet.cssRules];
          } catch {
            return [];
          }
        });

      const rowRule = rules.find(cssRule =>
        cssRule.selectorText === '.app.theme-dark .coverage-tree .tree-node-cap > .tree-row:hover'
      );
      const toggleRule = rules.find(cssRule =>
        cssRule.selectorText === '.app.theme-dark .coverage-tree .tree-node-cap > .tree-row:hover .tree-toggle'
      );

      expect(rowRule, 'la règle de hover de la ligne N1 est présente').to.exist;
      expect(toggleRule, 'la règle de hover du bouton N1 est présente').to.exist;
      expect(rowRule.style.getPropertyValue('background')).to.contain('var(--relation-n1-hover-bg)');
      expect(toggleRule.style.getPropertyValue('background')).to.contain('var(--relation-n1-hover-bg)');
      expect(toggleRule.style.getPropertyValue('color')).to.contain('var(--relation-n1-hover-text)');
    });
  });
});
