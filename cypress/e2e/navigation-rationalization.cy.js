describe('Navigation rationalisée', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('présente une navigation principale sans titres de groupe redondants', () => {
    cy.get('.primary-navigation').should('be.visible');
    cy.get('.primary-navigation > button').should('have.length', 3);
    cy.get('[data-testid="nav-cartography"]').should('contain.text', 'Cartographie');
    cy.get('[data-testid="nav-analysis"]').should('contain.text', 'Analyse');
    cy.get('[data-testid="primary-library"]').should('contain.text', 'Bibliothèque');
    cy.contains('.primary-navigation', 'Construire').should('not.exist');
    cy.contains('.primary-navigation', 'Analyser').should('not.exist');
    cy.contains('.primary-navigation', 'Gérer').should('not.exist');
    cy.get('[data-testid="tools-menu-toggle"]').should('contain.text', 'Outils');
  });

  it('ouvre la bibliothèque depuis la navigation principale', () => {
    cy.get('[data-testid="primary-library"]').click().should('have.class', 'active');
    cy.get('[data-testid="library-page"]').should('be.visible').and('contain.text', 'Bibliothèque de cartographies');
    cy.get('[data-testid="library-page-heading"]').should('be.visible');
    cy.get('[data-testid="back-to-cartography"]').should('have.css', 'border-radius', '8px');
    cy.get('[data-testid="save-current-from-library"]').should('have.css', 'background-color', 'rgb(79, 70, 229)');
    cy.get('[data-testid="recent-maps-count"]').should('be.visible');
    cy.get('[data-testid="saved-maps-count"]').should('be.visible');
    cy.get('.modal').should('not.exist');
  });

  it('ouvre Outils comme un menu déroulant sans ajouter une entrée principale', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.class', 'is-open');
    cy.get('.toolbar-tools-panel').should('be.visible');
    cy.get('[data-testid="export-model"]').should('be.visible');
    cy.get('[data-testid="import-model"]').should('exist');
    cy.get('[data-testid="theme-toggle"]').should('be.visible');
    cy.get('[data-testid="tools-menu"]').should('have.class', 'is-open');
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('.toolbar-tools-panel').should('not.exist');
  });

  it('garde les dimensions des actions Outils stables au survol', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="export-model"]').should('be.visible').then($button => {
      const before = $button[0].getBoundingClientRect();
      const initial = { width: before.width, height: before.height, top: before.top, left: before.left };
      cy.wrap($button).trigger('mouseover');
      cy.get('[data-testid="export-model"]').should($hovered => {
        const after = $hovered[0].getBoundingClientRect();
        expect(after.width).to.equal(initial.width);
        expect(after.height).to.equal(initial.height);
        expect(after.top).to.equal(initial.top);
        expect(after.left).to.equal(initial.left);
      });
    });
  });

  it('garde le panneau Outils visible sur mobile malgré la navigation défilante', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('.toolbar-tools-panel').should('be.visible').then($panel => {
      const rect = $panel[0].getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
      expect(rect.top).to.be.at.least(0);
      expect(rect.bottom).to.be.at.most(844);
    });
  });

  it('ouvre la bibliothèque depuis Outils sans afficher de popup', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="open-local-maps"]').click();
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('.modal').should('not.exist');
  });

  it('confirme le remplacement par une popup depuis la bibliothèque', () => {
    cy.window().then(win => {
      const model = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:model:v3'));
      model.metadata = { ...model.metadata, name: 'Cartographie à ouvrir test' };
      win.localStorage.setItem('enterprise-capacity-mapper:recent-maps:v1', JSON.stringify([{
        id: 'recent-test',
        name: 'Cartographie à ouvrir test',
        model,
        openedAt: new Date().toISOString()
      }]));
    });
    cy.reload();
    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="recent-maps-list"]').contains('button', 'Ouvrir cette cartographie').click();
    cy.get('.modal[role="dialog"]').should('be.visible').and('contain.text', 'remplacera la cartographie actuellement affichée');
    cy.get('[data-testid="confirm-load-local-map"]').should('be.visible').click();
    cy.get('[data-testid="library-page"]').should('not.exist');
    cy.get('[data-testid="nav-cartography"]').should('have.class', 'active');
    cy.get('.workspace').should('be.visible');
    cy.get('[data-testid="confirm-load-local-map"]').should('not.exist');
    cy.window().then(win => {
      const loadedModel = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:model:v3'));
      expect(loadedModel.metadata.name).to.equal('Cartographie à ouvrir test');
    });
  });


  it('permet d’annuler la popup de remplacement sans quitter la bibliothèque', () => {
    cy.window().then(win => {
      const model = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:model:v3'));
      win.localStorage.setItem('enterprise-capacity-mapper:recent-maps:v1', JSON.stringify([{
        id: 'recent-cancel-test',
        name: 'Cartographie à ne pas ouvrir',
        model,
        openedAt: new Date().toISOString()
      }]));
    });
    cy.reload();
    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="recent-maps-list"]').contains('button', 'Ouvrir cette cartographie').click();
    cy.get('.modal[role="dialog"]').should('be.visible');
    cy.get('.modal').contains('button', 'Annuler').click();
    cy.get('.modal').should('not.exist');
    cy.get('[data-testid="library-page"]').should('be.visible');
  });

  it('affiche la navigation secondaire uniquement dans les vues d’analyse', () => {
    cy.get('[data-testid="analysis-subnav"]').should('not.exist');
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="analysis-subnav"]').should('be.visible').and('have.class', 'is-active');
    cy.get('[data-testid="tab-dashboard"]').should('contain.text', "Vue d'ensemble");
    cy.get('[data-testid="tab-relations"]').should('be.visible');
    cy.get('[data-testid="tab-impact"]').should('not.exist');
    cy.get('[data-testid="dashboard-view-impact"]').should('be.visible').and('contain.text', 'Comprendre les impacts');

    cy.get('[data-testid="nav-analysis"]').click().should('have.class', 'active');
    cy.get('[data-testid="tab-dashboard"]').click().should('have.class', 'active');
    cy.get('[data-testid="tab-relations"]').click().should('have.class', 'active');
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-impact"]').click();
    cy.get('[data-testid="impact-view"]').should('be.visible').and('contain.text', 'Capacités à analyser');
    cy.get('[data-testid="dashboard-impact-empty"]').should('be.visible');
    cy.get('[data-testid="impact-view"] .dashboard-impact-select-list button').first().click();
    cy.get('[data-testid="dashboard-impact-empty"]').should('not.exist');
    cy.get('[data-testid="dashboard-impact-summary"]').should('be.visible').and('contain.text', 'Éléments sollicités');
    cy.get('[data-testid="impact-view"] .dashboard-impact-select-list button[aria-pressed="true"]').should('have.length', 1);
  });

  it('revient à la cartographie sans perdre les vues d’analyse', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-relations"]').click().should('have.class', 'active');
    cy.get('[data-testid="nav-cartography"]').click().should('have.class', 'active');
    cy.get('[data-testid="analysis-subnav"]').should('not.exist');
    cy.get('[data-testid="nav-analysis"]').click().should('have.class', 'active');
    cy.get('[data-testid="analysis-subnav"]').should('be.visible');
    cy.get('[data-testid="dashboard-view-impact"]').should('be.visible');
  });
});
