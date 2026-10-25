describe('Lot 4 — intégrité de l’import JSON', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('importe une cartographie valide en préservant les relations et l’étendue de matrice après rechargement', () => {
    cy.window().should(win => {
      expect(win.localStorage.getItem('enterprise-capacity-mapper:model:v3')).to.be.a('string');
    }).then(win => {
      const model = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:model:v3'));
      expect(model.schemaVersion).to.equal(3);

      const capability = model.capabilities.find(item => item.name === 'Gestion des Prospects & Leads');
      expect(capability, 'capacité de démonstration').to.exist;
      capability.name = 'Gestion des Prospects & Leads — import vérifié';

      const domain = model.domains.find(item => item.name === 'Relation & Engagement Client');
      expect(domain, 'domaine avec étendue configurable').to.exist;
      domain.layout = { ...domain.layout, columnSpan: 2 };

      cy.wrap(JSON.stringify(model)).as('validModelJson');
    });

    // Charger le contenu depuis le modèle préparé dans le test, sans dépendre
    // d’un fichier local ou d’un service externe.
    cy.get('@validModelJson').then(json => {
      cy.get('[data-testid="tools-menu-toggle"]').click();
      cy.get('[data-testid="import-model"]').selectFile({
        contents: Cypress.Buffer.from(json),
        fileName: 'cartographie-valide.json',
        mimeType: 'application/json',
      }, { force: true });
    });

    cy.contains('.cap', 'Gestion des Prospects & Leads — import vérifié').should('be.visible');
    cy.get('.domain-card').contains('.domain-banner', 'Relation & Engagement Client')
      .closest('.map-cell')
      .should('have.attr', 'style')
      .and('contain', 'grid-column: span 2');

    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-relations"]').click();
    cy.contains('.tree-node-cap', 'Gestion des Prospects & Leads — import vérifié')
      .should('contain.text', 'Salesforce CRM')
      .and('contain.text', 'Couvert');

    cy.reload();
    cy.contains('.cap', 'Gestion des Prospects & Leads — import vérifié').should('be.visible');
    cy.get('.domain-card').contains('.domain-banner', 'Relation & Engagement Client')
      .closest('.map-cell')
      .should('have.attr', 'style')
      .and('contain', 'grid-column: span 2');
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-relations"]').click();
    cy.contains('.tree-node-cap', 'Gestion des Prospects & Leads — import vérifié')
      .should('contain.text', 'Salesforce CRM');
  });
});

export {};
