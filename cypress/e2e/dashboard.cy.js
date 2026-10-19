describe('Dashboard de couverture', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  it('présente des indicateurs calculés depuis la cartographie active', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="tab-impact"]').next('[data-testid="tab-dashboard"]').should('exist');
    cy.get('[data-testid="capability-dashboard"]').should('have.attr', 'aria-label', 'Dashboard de couverture');
    cy.get('[data-testid="dashboard-coverage-rate"]').should('contain.text', '%');
    cy.get('[data-testid="dashboard-gap-count"]').invoke('text').then(value => {
      expect(Number(value.trim())).to.be.greaterThan(0);
    });
    cy.get('[data-testid="dashboard-redundancy-count"]').invoke('text').then(value => {
      expect(Number(value.trim())).to.be.at.least(0);
    });
    cy.get('.dashboard-domain-row').should('have.length.greaterThan', 0);
    cy.get('.dashboard-progress[role="progressbar"]').should('have.attr', 'aria-valuenow');
  });

  it('garde les quatre onglets principaux sur une seule ligne sur mobile', () => {
    cy.viewport(390, 844);
    cy.get('.toolbar-switch > button').should('have.length', 4).then($tabs => {
      const tops = [...$tabs].map(tab => tab.getBoundingClientRect().top);
      expect(Math.max(...tops) - Math.min(...tops)).to.be.lessThan(1);
    });
  });

  it('garde le surlignage actif sur l’onglet sélectionné', () => {
    const tabs = ['[data-testid="tab-relations"]', '[data-testid="tab-impact"]', '[data-testid="tab-dashboard"]'];
    tabs.forEach(selector => {
      cy.get(selector).click().should('have.class', 'active');
      cy.get('.toolbar-switch > button.active').should('have.length', 1).and('have.attr', 'data-testid').and('equal', selector.match(/tab-[a-z]+/)[0]);
    });
  });

  it('affiche un onglet actif statique sans animation de déplacement', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.toolbar-switch > button.active')
      .should('have.length', 1)
      .and('have.css', 'transition-duration', '0s')
      .and('have.css', 'animation-name', 'none');
  });

  it('permet d’ouvrir dans Relations un gap depuis le dashboard', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('.dashboard-target[aria-label*="dans Relations"]').first().click();
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');
    cy.get('.tree-impact-toggle[aria-pressed="true"]').should('exist');
  });

  it('reste lisible en thème sombre', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('.dashboard-panel').should('be.visible');
    cy.get('.dashboard-kpi').should('have.length', 5);
    cy.get('.app.theme-dark .dashboard-panel').should('have.css', 'background-color', 'rgb(23, 26, 32)');
  });
});
