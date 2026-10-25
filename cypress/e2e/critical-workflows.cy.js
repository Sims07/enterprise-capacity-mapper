// Focused end-to-end regression tests for critical browser workflows.
// Business rules belong to unit/integration tests; Cypress verifies the real UI,
// persistence boundary and PWA/browser integration.
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
      cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').click();
    });
    cy.get('.context-menu').contains('button', 'Renommer').click();
    cy.get('.modal .field input').clear().type('Qualification des prospects');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.contains('.cap', 'Qualification des prospects').should('contain.text', 'Salesforce CRM');
    cy.reload();
    cy.contains('.cap', 'Qualification des prospects').should('contain.text', 'Salesforce CRM');
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('not.exist');
  });

  it('annule et rétablit une modification via boutons et raccourcis clavier', () => {
    visitFresh();
    cy.get('[data-testid="undo-button"]').should('be.disabled');
    cy.get('[data-testid="redo-button"]').should('be.disabled');
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => {
      cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').click();
    });
    cy.get('.context-menu').contains('button', 'Renommer').click();
    cy.get('.modal .field input').clear().type('Qualification des prospects');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.get('[data-testid="undo-button"]').should('be.enabled');
    cy.get('body').type('{ctrl}z');
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist');
    cy.get('body').type('{ctrl}{shift}z');
    cy.contains('.cap', 'Qualification des prospects').should('exist');
    cy.get('[data-testid="undo-button"]').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist');
    cy.get('[data-testid="redo-button"]').click();
    cy.contains('.cap', 'Qualification des prospects').should('exist');
  });

  it('enregistre une cartographie localement et la recharge après modification non sauvegardée', () => {
    visitFresh();
    openToolsMenu();
    cy.get('[data-testid="save-local-map"]').click();
    cy.get('[data-testid="local-map-name"]').clear().type('Cartographie locale QA');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.window().then(win => {
      const savedMaps = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:local-maps:v1'));
      expect(savedMaps.map(map => map.name)).to.include('Cartographie locale QA');
    });
    cy.reload();
    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="saved-maps-list"]').contains('.library-map-card', 'Cartographie locale QA').should('be.visible');
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

  it('crée une cartographie vierge et configure sa structure depuis l’assistant', () => {
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
    cy.get('[data-testid="wizard-backup"]').uncheck();
    cy.get('[data-testid="wizard-create"]').click();
    cy.get('.domain-card').should('not.exist');
    cy.get('.axis-label').should('contain.text', 'Stratégique').and('contain.text', 'Opérationnel');
    cy.get('.map-head').should('contain.text', 'Métier');
  });

  it('refuse les imports JSON invalides sans modifier la cartographie active', () => {
    visitFresh();
    cy.window().then(win => {
      cy.wrap(win.localStorage.getItem('enterprise-capacity-mapper:model:v3')).as('modelBeforeImport');
    });
    openToolsMenu();
    cy.get('[data-testid="import-model"]').selectFile({ contents: Cypress.Buffer.from('{ json invalide'), fileName: 'cartographie-invalide.json', mimeType: 'application/json' }, { force: true });
    cy.get('[data-testid="nav-cartography"]').should('be.visible');
    cy.get('@modelBeforeImport').then(before => cy.window().then(win => {
      expect(JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:model:v3'))).to.deep.equal(JSON.parse(before));
    }));
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('be.visible');
  });

  it('conserve une extension de domaine sur plusieurs colonnes après rechargement', () => {
    openWizard();
    cy.get('[data-testid="wizard-name"]').clear().type('Cartographie multi-colonnes');
    cy.contains('button', 'Suivant').click();
    cy.contains('button', 'Suivant').click();
    cy.get('[data-testid="wizard-backup"]').uncheck();
    cy.get('[data-testid="wizard-create"]').click();
    cy.get('.map-row:not(.map-head)').first().find('.cell-add').first().click();
    cy.get('.modal .field input').eq(0).type('Capacité transverse');
    cy.get('.modal .field input').eq(1).type('TRANSVERSE');
    cy.contains('.modal button', 'Créer').click();
    cy.contains('.domain', 'Capacité transverse').find('button[aria-label="Actions pour Capacité transverse"]').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('.modal select').eq(2).select('2');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.get('.map-cell').first().should('have.attr', 'style').and('contain', 'span 2');
    cy.reload();
    cy.contains('.domain', 'Capacité transverse').should('be.visible');
    cy.get('.map-cell').first().should('have.attr', 'style').and('contain', 'span 2');
  });

  it('permet plusieurs domaines N0 dans la même cellule', () => {
    openWizard();
    cy.get('[data-testid="wizard-name"]').clear().type('Plusieurs domaines dans une cellule');
    cy.contains('button', 'Suivant').click();
    cy.contains('button', 'Suivant').click();
    cy.get('[data-testid="wizard-backup"]').uncheck();
    cy.get('[data-testid="wizard-create"]').click();
    const firstCell = '.map-row:not(.map-head) .map-cell';
    cy.get(firstCell).first().find('.cell-add').click();
    cy.get('.modal .field input').eq(0).type('Domaine N0 A');
    cy.get('.modal .field input').eq(1).type('N0-A');
    cy.contains('.modal button', 'Créer').click();
    cy.get(firstCell).first().find('.cell-add').click();
    cy.get('.modal .field input').eq(0).type('Domaine N0 B');
    cy.get('.modal .field input').eq(1).type('N0-B');
    cy.contains('.modal button', 'Créer').click();
    cy.get(firstCell).first().contains('.domain h3', 'Domaine N0 A').should('be.visible');
    cy.get(firstCell).first().contains('.domain h3', 'Domaine N0 B').should('be.visible');
  });

  it('réaffiche correctement un domaine créé alors qu’un filtre était actif', () => {
    openWizard();
    cy.get('[data-testid="template-blank"]').click();
    cy.get('[data-testid="wizard-name"]').clear().type('Création avec filtre');
    cy.contains('button', 'Suivant').click();
    cy.contains('button', 'Suivant').click();
    cy.get('[data-testid="wizard-backup"]').uncheck();
    cy.get('[data-testid="wizard-create"]').click();
    cy.get('[data-testid="map-filter"]').type('introuvable');
    cy.get('.filter-count').should('contain.text', '0 / 0 domaines');
    cy.get('.map-row:not(.map-head)').first().find('.cell-add').first().click();
    cy.get('.modal .field input').eq(0).type('Domaine visible');
    cy.get('.modal .field input').eq(1).type('VISIBLE');
    cy.contains('.modal button', 'Créer').click();
    cy.get('[data-testid="map-filter"]').should('have.value', '');
    cy.contains('.domain h3', 'Domaine visible').should('be.visible');
  });

  it('filtre la cartographie puis active et quitte le mode présentation', () => {
    cy.visit('/');
    cy.get('[data-testid="map-filter"]').type('CAP-CRM');
    cy.get('.filter-count').should('contain.text', '1 / 4 domaines');
    cy.contains('.domain h3', 'Relation & Engagement Client').should('be.visible');
    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('have.class', 'presentation-mode');
    cy.get('aside').should('not.be.visible');
    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('not.have.class', 'presentation-mode');
    cy.get('[data-testid="map-filter"]').should('have.value', 'CAP-CRM');
  });

  it('enregistre le service worker PWA', () => {
    cy.visit('/enterprise-capacity-mapper/');
    cy.window().then(win => new Cypress.Promise((resolve, reject) => {
      const deadline = Date.now() + 5000;
      const poll = () => win.navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length) resolve(registrations);
        else if (Date.now() < deadline) setTimeout(poll, 100);
        else reject(new Error('Aucun service worker PWA enregistré après 5 secondes'));
      });
      poll();
    }));
  });

  it('affiche l’assistant Nouvelle cartographie sur desktop et mobile', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    openToolsMenu();
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('.modal.wizard').should('be.visible').and('have.css', 'border-radius', '16px');
    cy.get('.wizard-steps li.current').should('have.attr', 'aria-current', 'step');
    cy.viewport(390, 740);
    cy.get('.modal.wizard').should('be.visible').then(modal => {
      const rect = modal[0].getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
    });
  });

  it('affiche les récents même si la bibliothèque locale est corrompue', () => {
    visitFresh();
    cy.window().then(win => win.localStorage.setItem('enterprise-capacity-mapper:local-maps:v1', '{json invalide'));
    cy.get('[data-testid="primary-library"]').click();
    cy.get('.toast').should('contain.text', 'Certaines données locales sont invalides');
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('[data-testid="saved-maps-empty"]').should('be.visible');
    cy.get('[data-testid="recent-maps-list"]').should('be.visible');
  });

  it('masque la barre de défilement native sans bloquer le scroll interne ni faire bouger le viewport', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.get('body').should('have.css', 'overflow', 'hidden');
    cy.get('.app').should('have.css', 'height', '800px');
    cy.get('.map-scroll').should('be.visible').then($scroll => {
      const initialTop = $scroll[0].scrollTop;
      cy.wrap($scroll).scrollTo('bottom');
      cy.wrap($scroll).should($el => expect($el[0].scrollTop).to.be.greaterThan(initialTop));
    });
    cy.window().its('scrollY').should('eq', 0);
  });
});
