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


  it('permet à un domaine de couvrir deux colonnes adjacentes et conserve cette étendue', () => {
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
    cy.get('.map-row:not(.map-head)').first().find('.map-cell').should('have.length', 3);
    cy.reload();
    cy.contains('.domain', 'Capacité transverse').should('be.visible');
    cy.get('.map-row:not(.map-head)').first().find('.map-cell').should('have.length', 3);
    cy.get('.map-cell').first().should('have.attr', 'style').and('contain', 'span 2');
  });

  it('permet d’ajouter plusieurs domaines N0 dans la même cellule', () => {
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
    cy.get(firstCell).first().contains('.domain h3', 'Domaine N0 A').should('be.visible');

    cy.get(firstCell).first().find('.cell-add').click();
    cy.get('.modal .field input').eq(0).type('Domaine N0 B');
    cy.get('.modal .field input').eq(1).type('N0-B');
    cy.contains('.modal button', 'Créer').click();

    cy.get(firstCell).first().contains('.domain h3', 'Domaine N0 A').should('be.visible');
    cy.get(firstCell).first().contains('.domain h3', 'Domaine N0 B').should('be.visible');
    cy.get(firstCell).first().find('.domain-card').eq(1).should('have.css', 'margin-top', '8px');
    cy.get('.domain-card').should('have.length', 2);
  });

  it('affiche le domaine créé même si un filtre était actif', () => {
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
    cy.get('[data-testid="domain-color-hex"]').clear().type('#009e73');
    cy.contains('.modal button', 'Créer').click();

    cy.get('[data-testid="map-filter"]').should('have.value', '');
    cy.contains('.domain h3', 'Domaine visible').should('be.visible');
    cy.contains('.domain', 'Domaine visible').closest('.map-cell').find('.cell-add').should('have.css', 'margin-top', '10px');
    cy.contains('.domain', 'Domaine visible').find('.domain-banner').should('have.css', 'background-color', 'rgb(0, 158, 115)');
    cy.contains('.domain', 'Domaine visible').find('button[aria-label="Actions pour Domaine visible"]').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('[data-testid="domain-color-option"][data-color="#a16207"]')
      .should('have.attr', 'aria-pressed', 'false')
      .click()
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="domain-color-hex"]').should('have.value', '#a16207');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.contains('.domain', 'Domaine visible').find('.domain-banner').should('have.css', 'background-color', 'rgb(161, 98, 7)');
    cy.reload();
    cy.contains('.domain', 'Domaine visible').find('.domain-banner').should('have.css', 'background-color', 'rgb(161, 98, 7)');
    cy.contains('.domain', 'Domaine visible').find('button[aria-label="Actions pour Domaine visible"]').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('[data-testid="domain-color-option"][data-color="#a16207"]').should('have.attr', 'aria-pressed', 'true');
    cy.contains('.modal button', 'Annuler').click();
    cy.get('.domain-card').should('have.length', 1);
  });

  it('filtre la cartographie et active puis quitte le mode présentation', () => {
    cy.visit('/');
    cy.get('.map-controls-row').should('be.visible');
    cy.get('.canvas-title, .stats, .map-view-toggle').should('not.exist');
    cy.get('.canvas-actions').should('not.contain.text', 'Domaine N0');
    cy.get('.map-filter-bar').should('be.visible');
    cy.get('[data-testid="map-filter"]').should('be.visible');
    cy.get('[data-testid="map-filter"]').type('CAP-CRM');
    cy.get('.filter-count').should('contain.text', '1 / 4 domaines');
    cy.contains('.domain h3', 'Relation & Engagement Client').should('be.visible');
    cy.contains('.domain h3', 'Finance, Gestion & Comptabilité').should('not.exist');
    openToolsMenu();
    cy.get('[data-testid="presentation-switch-input"]').should('have.attr', 'role', 'switch').and('not.be.checked');
    cy.get('header').then($header => {
      const before = $header[0].getBoundingClientRect();
      const beforeHeight = before.height;
      cy.get('[data-testid="presentation-toggle"]').then($toggle => {
        const toggleBefore = $toggle[0].getBoundingClientRect();
        cy.wrap($toggle).click();
        cy.get('.app').should('have.class', 'presentation-mode');
        cy.get('header').then($after => {
          const after = $after[0].getBoundingClientRect();
          expect(after.height, 'hauteur stable de l’en-tête').to.equal(beforeHeight);
        });
        cy.get('[data-testid="presentation-toggle"]').then($toggleAfter => {
          const toggleAfter = $toggleAfter[0].getBoundingClientRect();
          expect(toggleAfter.width, 'largeur stable du switch Présentation').to.equal(toggleBefore.width);
          expect(toggleAfter.height, 'hauteur stable du switch Présentation').to.equal(toggleBefore.height);
        });
      });
    });
    cy.get('aside').should('not.be.visible');
    cy.get('.workspace').should('have.css', 'grid-template-columns').and('not.contain', '300px');
    cy.get('.presentation-mode .cap').should('have.length', 3).first().should('have.css', 'border-radius', '6px');
    cy.get('.presentation-mode .cap-desc, .presentation-mode .cap .relations, .presentation-mode .cell-add, .presentation-mode .domain-actions').should('not.be.visible');
    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('not.have.class', 'presentation-mode');
    cy.get('[data-testid="map-filter"]').should('have.value', 'CAP-CRM');
    cy.get('.domain-card').should('have.length', 1);
  });

  it('conserve la matrice et les extensions de colonnes pendant le filtrage', () => {
    visitFresh();
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.window().then(win => {
      const key = 'enterprise-capacity-mapper:model:v3';
      const model = JSON.parse(win.localStorage.getItem(key));
      model.domains.find(domain => domain.id === 'l0-1').layout.columnSpan = 2;
      win.localStorage.setItem(key, JSON.stringify(model));
    });
    cy.reload();
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('[data-testid="dashboard-map-layout"]').then($map => {
      const initialColumns = $map.find('.dashboard-map-grid').first().css('grid-template-columns');
      const initialColumnHeads = $map.find('.dashboard-map-column-headings').text();
      const initialSpans = $map.find('.dashboard-map-cell[style*="span 2"]').length;
      expect(initialSpans, 'au moins un domaine N0 occupe deux colonnes').to.be.greaterThan(0);
      cy.get('[data-testid="dashboard-heatmap-status-filter"]').select('gap');
      cy.get('[data-testid="dashboard-map-layout"]').should($filteredMap => {
        expect($filteredMap.find('.dashboard-map-grid').first().css('grid-template-columns')).to.equal(initialColumns);
        expect($filteredMap.find('.dashboard-map-column-headings').text()).to.equal(initialColumnHeads);
        expect($filteredMap.find('.dashboard-map-cell[style*="span 2"]').length).to.equal(initialSpans);
      });
    });
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

  it('affiche un assistant Nouvelle cartographie stylé et adapté au mobile', () => {
    cy.visit('/');
      cy.viewport(1280, 800);
      openToolsMenu();
      cy.get('[data-testid="new-map-button"]').click();
      cy.get('.modal.wizard')
        .should('be.visible')
        .and('have.css', 'border-radius', '16px')
        .and('have.css', 'width', '920px');
      cy.get('.wizard-steps li.current').should('have.attr', 'aria-current', 'step');
      cy.get('[data-testid="template-capability-map"]')
        .should('have.attr', 'aria-pressed', 'true')
        .and('be.visible');
      cy.contains('button', 'Suivant').click();
      cy.get('.axis-editor').should('have.length', 2).and('have.css', 'border-radius', '11px');
      cy.get('[data-testid="wizard-preview"]').should('be.visible');

      cy.viewport(390, 740);
      cy.get('.modal.wizard').should('be.visible').then(modal => {
        const rect = modal[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(390);
      });
      cy.get('.wizard-structure').should('have.css', 'grid-template-columns').then(columns => {
        expect(columns).to.match(/^\d+(?:\.\d+)?px$/);
      });
      cy.get('.wizard .wizard-footer').should('be.visible');
  });

  it('propose quatre intentions et affiche la synthèse adaptée à chacune', () => {
    visitFresh();
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-overview"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="dashboard-overview-intro"]').should('be.visible');
    cy.get('[data-testid="dashboard-coverage-heatmap"]').should('not.exist');
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('[data-testid="dashboard-coverage-heatmap"]').should('be.visible');
    cy.get('[data-testid="dashboard-gap-priorities"]').should('not.exist');
    cy.get('[data-testid="dashboard-view-attention"]').click();
    cy.get('[data-testid="dashboard-gap-priorities"]').should('be.visible');
    cy.get('[data-testid="dashboard-coverage-heatmap"]').should('not.exist');
    cy.get('[data-testid="dashboard-view-impact"]').click();
    cy.get('[data-testid="dashboard-coverage-heatmap"]').should('be.visible');
    cy.get('[data-testid="dashboard-impact-empty"]').should('be.visible');
  });

  it('combine recherche et domaine N0 puis réinitialise les filtres', () => {
    visitFresh();
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('[data-testid="dashboard-heatmap-search"]').type('FIN-05');
    cy.get('[data-testid="dashboard-heatmap-result-count"]').should('contain.text', '0 / 10 éléments');
    cy.get('[data-testid="dashboard-heatmap-search"]').clear().type('Facturation');
    cy.get('[data-testid="dashboard-heatmap-result-count"]').should('contain.text', '1 / 10 éléments');
    cy.get('[data-testid="dashboard-heatmap-domain-filter"]').select('l0-2');
    cy.get('[data-testid="dashboard-heatmap-result-count"]').should('contain.text', '1 / 10 éléments');
    cy.get('[data-testid="dashboard-filter-results"] .dashboard-target').should('have.length', 1).and('contain.text', 'Facturation');
    cy.get('[data-testid="dashboard-heatmap-reset"]').click();
    cy.get('[data-testid="dashboard-heatmap-search"]').should('have.value', '');
    cy.get('[data-testid="dashboard-heatmap-domain-filter"]').should('have.value', 'all');
    cy.get('[data-testid="dashboard-heatmap-status-filter"]').should('have.value', 'all');
    cy.get('[data-testid="dashboard-heatmap-result-count"]').should('contain.text', '10 / 10 éléments');
  });

  it('permet de filtrer la heatmap depuis la synthèse d’un domaine N0', () => {
    visitFresh();
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-overview"]').click();
    cy.get('[data-testid="dashboard-domain-drilldown-l0-2"]').click();
    cy.get('[data-testid="dashboard-heatmap-domain-filter"]').should('have.value', 'l0-2');
    cy.get('[data-testid="dashboard-heatmap-result-count"]').should('contain.text', '3 / 10 éléments');
    cy.get('[data-testid="dashboard-heatmap-search"]').should('have.value', '');
    cy.get('[data-testid="dashboard-heatmap-status-filter"]').should('have.value', 'all');
  });

  it('affiche les récents même si la bibliothèque de sauvegardes est corrompue', () => {
    visitFresh();

    cy.window().then(win => {
      win.localStorage.setItem('enterprise-capacity-mapper:local-maps:v1', '{json invalide');
    });
    cy.get('[data-testid="primary-library"]').click();

    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('[data-testid="saved-maps-empty"]').should('be.visible');
    cy.get('[data-testid="recent-maps-list"]').should('be.visible');
    cy.get('.toast').should('contain.text', 'Certaines données locales sont invalides');
  });

  it('masque la barre de défilement native sans bloquer le scroll interne ni faire bouger le viewport', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.get('body').should('have.css', 'overflow', 'hidden');
    cy.get('.app').should('have.css', 'height', '800px');
    cy.get('.workspace').should('have.css', 'min-height', '0px');
    cy.get('main').should('have.css', 'overflow', 'auto');
    cy.get('main').then($main => {
      expect(getComputedStyle($main[0]).scrollbarWidth).to.equal('none');
    });
    cy.get('html').then($html => {
      expect(getComputedStyle($html[0]).scrollbarWidth).to.equal('none');
    });

    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('have.class', 'presentation-mode');
    cy.get('body').should('have.css', 'overflow', 'hidden');
    cy.get('.app').should('have.css', 'height', '800px');
    
    cy.viewport(402, 874);
    cy.get('.app').should('have.css', 'height', '874px');
    cy.get('body').should('have.css', 'overflow', 'hidden');
  });
});
