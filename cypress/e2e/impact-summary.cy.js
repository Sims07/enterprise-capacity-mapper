describe('Lot 3 — synthèse de l’analyse d’impact', () => {
  const resetApp = () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  };

  const openImpact = () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="dashboard-view-impact"]').click();
    cy.get('[data-testid="impact-view"]').should('be.visible');
  };

  const selectCapability = name => {
    cy.contains('[data-testid="impact-view"] .dashboard-impact-select-list button', name).click();
  };

  beforeEach(resetApp);

  it('présente un état vide explicite avant toute sélection', () => {
    openImpact();
    cy.get('[data-testid="dashboard-impact-empty"]')
      .should('be.visible')
      .and('contain.text', 'Aucune sélection d’impact active');
    cy.get('[data-testid="dashboard-impact-summary"]').should('not.exist');
    cy.get('[data-testid="impact-view"]').should('contain.text', '0 sélectionnée(s)');
  });

  it('relie la sélection utilisateur au rendu de la synthèse d’impact', () => {
    openImpact();
    selectCapability('CRM-01 — Gestion des Prospects & Leads');
    selectCapability('Achats Fournisseurs');

    cy.get('[data-testid="dashboard-impact-summary"]').should('be.visible');
    cy.get('[data-testid="dashboard-impact-summary"] .dashboard-impact-metrics article').should('have.length', 3);
    cy.get('[data-testid="dashboard-impact-summary"]')
      .should('contain.text', 'Éléments sollicités')
      .and('contain.text', 'Applications impactées')
      .and('contain.text', 'Gaps dans la sélection')
      .and('contain.text', 'Gestion des Prospects & Leads')
      .and('contain.text', 'Achats Fournisseurs')
      .and('contain.text', 'Salesforce CRM');
    cy.get('[data-testid="dashboard-impact-empty"]').should('not.exist');
  });

  it('retire la synthèse lorsque toutes les capacités sont désélectionnées', () => {
    openImpact();
    selectCapability('CRM-01 — Gestion des Prospects & Leads');
    cy.get('[data-testid="dashboard-impact-summary"]').should('be.visible');
    selectCapability('CRM-01 — Gestion des Prospects & Leads');
    cy.get('[data-testid="dashboard-impact-empty"]').should('be.visible');
    cy.get('[data-testid="dashboard-impact-summary"]').should('not.exist');
    cy.contains('[data-testid="impact-view"] .dashboard-impact-select-list button', 'CRM-01 — Gestion des Prospects & Leads')
      .should('have.attr', 'aria-pressed', 'false');
  });
});
