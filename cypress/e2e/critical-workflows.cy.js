// Focused end-to-end regression tests for user workflows that cannot be
// guaranteed by domain/application unit tests alone.
const visitFresh = (path = '/') => cy.visit(path, {
  onBeforeLoad(win) {
    win.localStorage.clear();
  },
});

const openToolsMenu = () => cy.get('[data-testid="tools-menu"]').then($menu => {
  if (!$menu.hasClass('is-open')) cy.get('[data-testid="tools-menu-toggle"]').click();
});

const openWizard = () => {
  cy.visit('/');
  openToolsMenu();
  cy.get('[data-testid="new-map-button"]').click();
  cy.get('[data-testid="wizard-step-1"]').should('be.visible');
};

describe('Critical user workflows — regression coverage', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
  });

  it('renomme une capacité N1 sans perdre ses applications associées', () => {
    visitFresh();

    cy.get('.cap').should('have.length', 10);
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => {
      cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').should('be.visible').click();
    });
    cy.get('.context-menu').contains('button', 'Renommer').click();
    cy.get('.modal h2').should('contain.text', 'Modifier la capacité N1');
    cy.get('.modal .field input').clear().type('Qualification des prospects');
    cy.contains('.modal button', 'Enregistrer').click();

    cy.contains('.cap', 'Qualification des prospects').should('contain.text', 'Salesforce CRM');
    cy.reload();
    cy.contains('.cap', 'Qualification des prospects').should('contain.text', 'Salesforce CRM');
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('not.exist');
  });

  it('annule et rétablit une modification avec les boutons et les raccourcis clavier', () => {
    visitFresh();

    cy.get('[data-testid="undo-button"]').should('be.disabled');
    cy.get('[data-testid="redo-button"]').should('be.disabled');
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => {
      cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').click();
    });
    cy.get('.context-menu').contains('button', 'Renommer').click();
    cy.get('.modal .field input').clear().type('Qualification des prospects');
    cy.contains('.modal button', 'Enregistrer').click();

    cy.contains('.cap', 'Qualification des prospects').should('exist');
    cy.get('[data-testid="undo-button"]').should('be.enabled');
    cy.get('body').type('{ctrl}z');
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist');
    cy.get('[data-testid="redo-button"]').should('be.enabled');

    cy.get('body').type('{ctrl}{shift}z');
    cy.contains('.cap', 'Qualification des prospects').should('exist');
    cy.get('[data-testid="undo-button"]').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist');
    cy.get('[data-testid="redo-button"]').click();
    cy.contains('.cap', 'Qualification des prospects').should('exist');
  });

  it('enregistre une cartographie localement et permet de la rouvrir après rechargement', () => {
    visitFresh();

    openToolsMenu();
    cy.get('[data-testid="save-local-map"]').click();
    cy.get('[data-testid="local-map-name"]').clear().type('Cartographie locale QA');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.window().then(window => {
      const savedMaps = JSON.parse(window.localStorage.getItem('enterprise-capacity-mapper:local-maps:v1'));
      expect(savedMaps.map(map => map.name)).to.include('Cartographie locale QA');
    });

    cy.reload();
    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="saved-maps-list"]').contains('.library-map-card', 'Cartographie locale QA').should('be.visible').within(() => {
      cy.get('.library-map-date').should('contain.text', ':');
    });
    cy.get('[data-testid="back-to-cartography"]').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => {
      cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').click();
    });
    cy.get('.context-menu').contains('button', 'Renommer').click();
    cy.get('.modal .field input').clear().type('Modification non sauvegardée');
    cy.contains('.modal button', 'Enregistrer').click();

    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="saved-maps-list"]').contains('.library-map-card', 'Cartographie locale QA').contains('button', 'Ouvrir cette cartographie').click();
    cy.get('[data-testid="confirm-load-local-map"]').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist');
    cy.contains('.cap', 'Modification non sauvegardée').should('not.exist');
  });

  it('crée une cartographie vierge avec l’assistant, ajoute des domaines depuis les cellules et les déplace', () => {
    openWizard();

    cy.get('[data-testid="template-blank"]').click();
    cy.get('[data-testid="wizard-name"]').clear().type('Ma cartographie');
    cy.contains('button', 'Suivant').click();

    cy.get('[data-testid="wizard-step-2"]').should('be.visible');
    cy.get('[data-testid="structure-columns-input"]').first().clear().type('Métier');
    cy.get('[data-testid="structure-add-columns"]').click();
    cy.get('[data-testid="structure-columns-input"]').eq(1).clear().type('Support');
    cy.get('[data-testid="structure-layers-input"]').first().clear().type('Stratégique');
    cy.get('[data-testid="structure-add-layers"]').click();
    cy.get('[data-testid="structure-layers-input"]').eq(1).clear().type('Opérationnel');
    cy.get('[data-testid="wizard-preview"]').should('contain.text', 'Métier').and('contain.text', 'Opérationnel');
    cy.contains('button', 'Suivant').click();

    cy.get('[data-testid="wizard-warning"]').should('contain.text', '4 domaines N0');
    cy.get('[data-testid="wizard-backup"]').should('be.checked').uncheck();
    cy.get('[data-testid="wizard-create"]').click();

    cy.get('.domain-card').should('not.exist');
    cy.get('.axis-label').should('contain.text', 'Stratégique').and('contain.text', 'Opérationnel');
    cy.get('.map-head').should('contain.text', 'Métier');
    cy.get('.cell-label').should('not.exist');

    cy.get('.map-row:not(.map-head)').eq(0).find('.map-cell[data-zone-key="default:default"] .cell-add').click();
    cy.get('.modal .field input').eq(0).type('Domaine personnalisé');
    cy.get('.modal .field input').eq(1).type('CUSTOM');
    cy.get('.modal .field input').eq(2).type('Créé depuis une cellule.');
    cy.contains('.modal button', 'Créer').click();
    cy.get('.map-row:not(.map-head)').eq(0).contains('.domain h3', 'Domaine personnalisé').should('be.visible');

    cy.get('.map-row:not(.map-head)').eq(1).find('.cell-add').first().click();
    cy.get('.modal .field input').eq(0).type('Domaine ligne 2');
    cy.get('.modal .field input').eq(1).type('CUSTOM-2');
    cy.contains('.modal button', 'Créer').click();
    cy.get('.map-row:not(.map-head)').eq(1).contains('.domain h3', 'Domaine ligne 2').should('be.visible');

    cy.contains('.domain', 'Domaine ligne 2').find('button[aria-label="Actions pour Domaine ligne 2"]').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('.modal select').eq(0).select('Support');
    cy.get('.modal select').eq(1).select('Stratégique');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.get('.map-row:not(.map-head)').eq(0).should('contain.text', 'Domaine ligne 2');
    cy.get('.map-row:not(.map-head)').eq(1).should('not.contain.text', 'Domaine ligne 2');

    cy.contains('.domain', 'Domaine personnalisé').find('button[aria-label="Actions pour Domaine personnalisé"]').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('.modal .field input').eq(0).clear().type('Domaine renommé');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.contains('.domain h3', 'Domaine renommé').should('be.visible');

    cy.contains('button', '⚙ Structure').click();
    cy.get('.modal [data-zone-key="default:default"] input').clear().type('Zone métier stratégique');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.get('.map-cell[data-zone-key="default:default"] .cell-label').should('have.text', 'Zone métier stratégique');
    cy.get('.map-cell').not('[data-zone-key="default:default"]').find('.cell-label').should('not.exist');

    cy.reload();
    cy.get('.axis-label').should('contain.text', 'Opérationnel');
    cy.get('.map-cell[data-zone-key="default:default"] .cell-label').should('have.text', 'Zone métier stratégique');
    cy.contains('.domain h3', 'Domaine renommé').should('be.visible');
  });

  it('refuse les imports JSON invalides sans modifier la cartographie active', () => {
    visitFresh();

    cy.window().should(win => {
      expect(win.localStorage.getItem('enterprise-capacity-mapper:model:v3')).to.be.a('string');
    }).then(win => {
      cy.wrap(win.localStorage.getItem('enterprise-capacity-mapper:model:v3')).as('modelBeforeImport');
    });

    openToolsMenu();
    cy.get('[data-testid="import-model"]').selectFile({
      contents: Cypress.Buffer.from('{ json invalide'),
      fileName: 'cartographie-invalide.json',
      mimeType: 'application/json',
    }, { force: true });
    cy.get('[data-testid="nav-cartography"]').should('be.visible');

    cy.get('@modelBeforeImport').then(before => {
      cy.window().then(win => {
        const currentModel = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:model:v3'));
        const originalModel = JSON.parse(before);
        // updatedAt is refreshed by the persistence effect independently of model content.
        delete currentModel.metadata?.updatedAt;
        delete originalModel.metadata?.updatedAt;
        expect(currentModel).to.deep.equal(originalModel);
      });
    });

    openToolsMenu();
    cy.get('[data-testid="import-model"]').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify({
        schemaVersion: 999,
        domains: [],
        capabilities: [],
        applications: [],
      })),
      fileName: 'version-non-supportee.json',
      mimeType: 'application/json',
    }, { force: true });

    cy.get('@modelBeforeImport').then(before => {
      cy.window().then(win => {
        const currentModel = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:model:v3'));
        const originalModel = JSON.parse(before);
        // updatedAt is refreshed by the persistence effect independently of model content.
        delete currentModel.metadata?.updatedAt;
        delete originalModel.metadata?.updatedAt;
        expect(currentModel).to.deep.equal(originalModel);
      });
    });
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('be.visible');
  });

});
});
