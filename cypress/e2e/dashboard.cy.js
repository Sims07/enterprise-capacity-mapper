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

  it('affiche la heatmap de couverture et permet d’ouvrir une capacité dans Relations', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-coverage-heatmap"]').should('be.visible');
    cy.get('.dashboard-heatmap-legend').should('contain.text', 'Sans application')
      .and('contain.text', 'Une application')
      .and('contain.text', 'Plusieurs applications');
    cy.get('.dashboard-heatmap-tile').should('have.length.greaterThan', 0);
    cy.get('.dashboard-heatmap-tile').first().click();
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');
  });

  it('identifie une application sans relation et permet de la relier depuis le dashboard', () => {
    cy.get('.side-add').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label.field', /^Nom/).find('input').type('Application orpheline test');
      cy.contains('label.field', /^Code/).find('input').type('APP-ORPHELINE');
      cy.contains('label.field', /Éditeur \/ fournisseur/).find('input').type('Éditeur test');
      cy.contains('button', 'Créer').click();
    });

    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-unlinked-apps"]').within(() => {
      cy.contains('Application orpheline test').should('be.visible');
      cy.get('button[aria-label="Relier Application orpheline test à des capacités N1"]').click();
    });

    cy.get('[role="dialog"]').should('contain.text', 'Relier « Application orpheline test »');
    cy.get('[data-testid="link-list"] input[type="checkbox"]').first().check();
    cy.get('[data-testid="link-save"]').click();
    cy.get('[data-testid="dashboard-unlinked-apps"]')
      .should('contain.text', 'Toutes les applications sont reliées')
      .and('not.contain.text', 'Application orpheline test');
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

  it('affiche le Dashboard comme onglet actif sans curseur hérité de Cartographie', () => {
    cy.get('[data-testid="tab-dashboard"]').click().should('have.class', 'active');
    cy.get('.toolbar-switch').should('have.css', 'grid-template-columns', 'none');
    cy.get('.toolbar-switch').then($switch => {
      expect(getComputedStyle($switch[0], '::before').content).to.equal('none');
    });
    cy.get('[data-testid="tab-dashboard"]').then($button => {
      expect($button.css('background-color')).not.to.equal('rgba(0, 0, 0, 0)');
    });
  });

  it('préserve le menu Outils et les libellés complets sur mobile', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tools-menu-toggle"]').should('be.visible');
    cy.get('.toolbar-switch > button').each($button => {
      expect($button[0].scrollWidth, $button.text()).to.be.at.most($button[0].clientWidth);
      expect($button.css('text-overflow')).not.to.equal('ellipsis');
    });
  });

  it('garde un onglet actif sans curseur violet débordant', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.toolbar-switch > button.active')
      .should('have.length', 1)
      .and('have.css', 'animation-name', 'none')
      .and('have.css', 'transform', 'none');
    cy.get('.toolbar-switch > button.active').then($button => {
      expect($button[0].getBoundingClientRect().width).to.be.lessThan(200);
    });
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
