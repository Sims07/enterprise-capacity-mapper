describe('Application smoke test', () => {
  const assertApplicationLoaded = () => {
    cy.contains('Capacity Mapper').should('be.visible');
    cy.contains('Cartographie des capacités').should('be.visible');
    cy.get('#root').should('not.be.empty');
    cy.get('#root').should('not.contain.text', 'Cannot read properties');
    cy.document().its('readyState').should('eq', 'complete');

    cy.document().then((doc) => {
      const resources = [
        ...Array.from(doc.querySelectorAll('script[src]'), (el) => el.src),
        ...Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'), (el) => el.href),
        ...Array.from(doc.querySelectorAll('link[rel="manifest"][href]'), (el) => el.href),
      ];

      expect(resources, 'application resources').to.have.length.greaterThan(0);
      resources.forEach((url) => {
        cy.request({ url, failOnStatusCode: false }).its('status').should('be.within', 200, 299);
      });
    });
  };

  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      throw err;
    });
  });

  it('charge correctement l’application à la racine', () => {
    cy.visit('/');
    assertApplicationLoaded();
  });

  it('charge correctement l’application sous le chemin GitHub Pages', () => {
    cy.visit('/enterprise-capacity-mapper/');
    assertApplicationLoaded();
  });

  it('permet de créer une cartographie vierge avec des L0, colonnes et layers personnalisés', () => {
    cy.on('window:confirm', () => true);
    cy.visit('/');
    cy.contains('button', 'Nouvelle cartographie').click();
    cy.get('.stats').should('contain.text', '0 L0');

    cy.contains('button', '⚙ Structure').click();
    cy.get('.structure-section').eq(0).find('input').first().clear().type('Métier');
    cy.get('.structure-section').eq(1).find('input').first().clear().type('Stratégique');
    cy.get('.structure-section').eq(1).contains('button', 'Ajouter un layer').click();
    cy.get('.structure-section').eq(1).find('input').eq(1).clear().type('Opérationnel');
    cy.get('[data-zone-key="customer:strategic"] input').clear().type('Zone métier stratégique');
    cy.get('[data-zone-key="customer:core"] input').clear().type('Zone métier opérationnelle');
    cy.contains('button', 'Enregistrer').click();
    cy.get('.map-cell[data-zone-key="customer:strategic"] .cell-label').should('have.text', 'Zone métier stratégique');
    cy.get('.map-cell[data-zone-key="customer:core"] .cell-label').should('have.text', 'Zone métier opérationnelle');
    cy.get('.axis-label').should('contain.text', 'Stratégique');
    cy.get('.axis-label').should('contain.text', 'Opérationnel');

    cy.contains('button', '＋ Domaine L0').click();
    cy.get('.modal .field input').eq(0).type('Domaine personnalisé');
    cy.get('.modal .field input').eq(1).type('CUSTOM');
    cy.get('.modal .field input').eq(2).type('Créé depuis une cartographie vierge.');
    cy.contains('.modal button', 'Créer').click();
    cy.contains('.domain h3', 'Domaine personnalisé').should('be.visible');

    cy.contains('.domain', 'Domaine personnalisé').contains('button', 'Modifier').click();
    cy.get('.modal .field input').eq(0).clear().type('Domaine renommé');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.contains('.domain h3', 'Domaine renommé').should('be.visible');

    cy.reload();
    cy.get('.map-cell[data-zone-key="customer:strategic"] .cell-label').should('have.text', 'Zone métier stratégique');
    cy.get('.map-cell[data-zone-key="customer:core"] .cell-label').should('have.text', 'Zone métier opérationnelle');
    cy.get('.axis-label').should('contain.text', 'Opérationnel');
    cy.contains('.domain h3', 'Domaine renommé').should('be.visible');
  });

  it('enregistre le service worker PWA', () => {
    cy.visit('/enterprise-capacity-mapper/');
    cy.window().then((win) => {
      return new Cypress.Promise((resolve, reject) => {
        const deadline = Date.now() + 5000;
        const poll = () => {
          win.navigator.serviceWorker.getRegistrations().then((registrations) => {
            if (registrations.length > 0) {
              resolve(registrations);
            } else if (Date.now() < deadline) {
              setTimeout(poll, 100);
            } else {
              reject(new Error('Aucun service worker PWA enregistré après 5 secondes'));
            }
          });
        };
        poll();
      });
    });
  });
});
