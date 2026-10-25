describe('Lot 7 — import/export et bibliothèque locale', () => {
  const openToolsMenu = () => {
    cy.get('[data-testid="tools-menu"]').then($menu => {
      if (!$menu.hasClass('is-open')) cy.get('[data-testid="tools-menu-toggle"]').click();
    });
  };

  const saveNamedMap = name => {
    openToolsMenu();
    cy.get('[data-testid="save-local-map"]').click();
    cy.get('[data-testid="local-map-name"]').should('be.visible').clear().type(name);
    cy.contains('.modal button', 'Enregistrer').click();
    cy.get('.toast').should('contain.text', 'enregistrée localement');
  };

  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('valide le nom de sauvegarde et permet d’annuler sans créer d’entrée', () => {
    openToolsMenu();
    cy.get('[data-testid="save-local-map"]').click();
    cy.get('[data-testid="local-map-name"]').should('have.value', 'Cartographie SI de démonstration').clear();
    cy.contains('.modal button', 'Enregistrer').should('be.disabled');
    cy.get('[data-testid="local-map-name"]').type('Sauvegarde annulée');
    cy.contains('.modal button', 'Annuler').click();

    cy.window().then(win => {
      const mapsAfterCancel = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:local-maps:v1') || '[]');
      expect(mapsAfterCancel.find(map => map.name === 'Sauvegarde annulée')).to.equal(undefined);
    });
  });

  it('crée une sauvegarde puis met à jour la même entrée après modification du modèle', () => {
    saveNamedMap('Sauvegarde lot 7');

    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => {
      cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').click();
    });
    cy.get('.context-menu').contains('button', 'Renommer').click();
    cy.get('.modal input').first().clear().type('Gestion des Prospects — version modifiée');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.contains('.cap', 'Gestion des Prospects — version modifiée').should('be.visible');

    openToolsMenu();
    cy.get('[data-testid="save-local-map"]').click();
    cy.get('.toast').should('contain.text', 'enregistrée localement');

    cy.window().then(win => {
      const saved = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:local-maps:v1'));
      expect(saved).to.have.length(1);
      expect(saved[0].name).to.equal('Sauvegarde lot 7');
      expect(saved[0].model.capabilities.some(cap => cap.name === 'Gestion des Prospects — version modifiée')).to.equal(true);
    });

    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="saved-maps-list"]').should('contain.text', 'Sauvegarde lot 7');
    cy.get('[data-testid="saved-maps-list"] .library-map-card').should('be.visible');
  });

  it('retire une cartographie des récents sans supprimer sa sauvegarde nommée', () => {
    saveNamedMap('Sauvegarde conservée');

    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('[data-testid="recent-maps-list"]').should('be.visible');
    cy.get('[data-testid="recent-maps-list"] .library-map-card').contains('h4', 'Sauvegarde conservée')
      .closest('.library-map-card')
      .find('[data-testid^="remove-recent-"]')
      .click();

    cy.get('[data-testid="saved-maps-list"]').should('contain.text', 'Sauvegarde conservée');
    cy.window().then(win => {
      const saved = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:local-maps:v1'));
      const recent = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:recent-maps:v1') || '[]');
      expect(saved).to.have.length(1);
      expect(saved[0].name).to.equal('Sauvegarde conservée');
      expect(recent.some(entry => entry.name === 'Sauvegarde conservée')).to.equal(false);
    });
  });

  it('exporte le modèle en JSON avec un nom de fichier daté', () => {
    cy.window().then(win => {
      cy.stub(win.URL, 'createObjectURL').returns('blob:coverage-test');
      cy.stub(win.URL, 'revokeObjectURL');
      cy.stub(win.HTMLAnchorElement.prototype, 'click').callsFake(function (this: HTMLAnchorElement) {
        expect(this.href).to.contain('blob:coverage-test');
        const parts = this.download.split('-');
        expect(parts[0]).to.equal('enterprise');
        expect(parts[1]).to.equal('capacity');
        expect(parts[2]).to.equal('mapper');
        expect(parts[3]).to.match(/^\d{4}$/);
        expect(parts[4]).to.match(/^\d{2}$/);
        expect(parts[5]).to.match(/^\d{2}\.json$/);
      }).as('downloadClick');
    });

    openToolsMenu();
    cy.get('[data-testid="export-model"]').click();
    cy.get('@downloadClick').should('have.been.calledOnce');
  });
});

export {};
