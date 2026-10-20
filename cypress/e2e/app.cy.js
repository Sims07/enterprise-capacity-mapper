describe('Application smoke test', () => {
  const assertApplicationLoaded = () => {
    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('.map-filter-bar').should('be.visible');
    cy.get('[data-testid="pwa-version"]').should('be.visible');
    cy.get('[data-testid="pwa-version"] a')
      .should('have.attr', 'href', 'https://github.com/Sims07/enterprise-capacity-mapper/releases')
      .and('contain.text', 'Versions');
    cy.get('[data-testid="pwa-version"]').invoke('text').should('match', /v\d+\.\d+\.\d+(?:-[\w.]+)?\s*·\s*Versions/);
    cy.get('.map').should('be.visible');
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

  const openToolsMenu = () => {
    cy.get('[data-testid="tools-menu"]').then($menu => {
      if (!$menu.attr('open')) cy.get('[data-testid="tools-menu-toggle"]').click();
    });
  };

  const openWizard = () => {
    cy.visit('/');
    openToolsMenu();
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('[data-testid="wizard-step-1"]').should('be.visible');
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

  it('reste utilisable à la largeur d’un iPhone 17 Pro sans débordement horizontal de page', () => {
    cy.viewport(402, 874);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('header').should('have.css', 'position', 'relative').then(header => {
      expect(header[0].getBoundingClientRect().height, 'hauteur de l’en-tête mobile').to.be.lessThan(300);
    });
    cy.get('.map').should('be.visible').then(map => {
      expect(map[0].scrollWidth, 'matrice visible sans défilement horizontal').to.be.at.most(map[0].clientWidth);
    });
    cy.get('.map-row:not(.map-head)').first().should('have.css', 'grid-template-columns').then(columns => {
      expect(columns.trim().split(/\s+/), 'cellules empilées sur une colonne').to.have.length(1);
    });
    cy.get('.cell-column-label').first().should('be.visible').and('not.be.empty');
    cy.get('.map-cell').first().should('be.visible');
    cy.get('html').then(html => {
      expect(html[0].scrollWidth, 'largeur de page').to.be.at.most(402);
    });
    cy.get('.toolbar-actions').should('have.css', 'overflow-x', 'visible');
    cy.get('#app-inventory').should('be.visible');
    cy.get('.app-item').should('be.visible');
    cy.get('.inventory-toggle-rail').should('not.exist');
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
      cy.get('[data-testid="template-matrix"]')
        .should('have.attr', 'aria-pressed', 'true')
        .and('have.css', 'background-color', 'rgb(245, 245, 255)');
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

  it('ferme le menu contextuel quand on clique hors du menu', () => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.contains('.domain', 'Relation & Engagement Client').rightclick();
    cy.get('.context-menu').should('be.visible');
    cy.get('body').click(10, 10);
    cy.get('.context-menu').should('not.exist');
  });

  it('renomme une capacité N1 sans perdre ses applications associées', () => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

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
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

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
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    openToolsMenu();
    cy.get('[data-testid="save-local-map"]').click();
    cy.get('[data-testid="local-map-name"]').clear().type('Cartographie locale QA');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.window().then(window => {
      const savedMaps = JSON.parse(window.localStorage.getItem('enterprise-capacity-mapper:local-maps:v1'));
      expect(savedMaps.map(map => map.name)).to.include('Cartographie locale QA');
    });

    cy.reload();
    openToolsMenu();
    cy.get('[data-testid="open-local-maps"]').click();
    cy.get('[data-testid="recent-maps-list"]').contains('.local-map-row', 'Cartographie locale QA').should('be.visible');
    cy.get('[data-testid="saved-maps-list"]').contains('.local-map-row', 'Cartographie locale QA').should('be.visible');
    cy.get('.modal-head button').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => {
      cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').click();
    });
    cy.get('.context-menu').contains('button', 'Renommer').click();
    cy.get('.modal .field input').clear().type('Modification non sauvegardée');
    cy.contains('.modal button', 'Enregistrer').click();

    openToolsMenu();
    cy.get('[data-testid="open-local-maps"]').click();
    cy.get('[data-testid="saved-maps-list"]').contains('.local-map-row', 'Cartographie locale QA').contains('button', 'Ouvrir').click();
    cy.get('[data-testid="confirm-load-local-map"]').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist');
    cy.contains('.cap', 'Modification non sauvegardée').should('not.exist');
  });

  it('permet de choisir une cartographie à 1 ou 2 niveaux', () => {
    openWizard();

    cy.get('[data-testid="depth-1"]').should('have.attr', 'aria-pressed', 'false').click();
    cy.get('[data-testid="depth-1"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="depth-2"]').should('have.attr', 'aria-pressed', 'false').click();
    cy.get('[data-testid="depth-2"]').should('have.attr', 'aria-pressed', 'true');

    cy.get('[data-testid="template-blank"]').click();
    cy.get('[data-testid="wizard-name"]').clear().type('Cartographie 1 niveau');
    cy.get('[data-testid="depth-1"]').click();
    cy.contains('button', 'Suivant').click();
    cy.contains('button', 'Suivant').click();
    cy.get('[data-testid="wizard-create"]').click();

    cy.get('.domain-card').should('not.exist');
    cy.get('.cap').should('not.exist');
    cy.get('.cell-add').first().click();
    cy.get('.modal .field input').eq(0).type('Domaine niveau 1');
    cy.get('.modal .field input').eq(1).type('N0-01');
    cy.contains('.modal button', 'Créer').click();
    cy.contains('.domain', 'Domaine niveau 1').within(() => {
      cy.get('.primary-soft').should('not.exist');
    });
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

  it('ne modifie rien tant que l’assistant n’est pas validé', () => {
    openWizard();
    cy.contains('.modal button', 'Annuler').click();
    cy.get('[data-testid="wizard-step-1"]').should('not.exist');
    cy.get('.domain-card').should('have.length', 4);

    openToolsMenu();
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('body').type('{esc}');
    cy.get('[data-testid="wizard-step-1"]').should('not.exist');
    cy.get('.domain-card').should('have.length', 4);
  });

  it('valide les champs obligatoires et permet de reprendre la structure actuelle', () => {
    openWizard();
    cy.get('[data-testid="wizard-name"]').clear();
    cy.contains('button', 'Suivant').click();
    cy.get('[data-testid="wizard-error"]').should('be.visible');
    cy.get('[data-testid="wizard-step-2"]').should('not.exist');

    cy.get('[data-testid="wizard-name"]').type('Copie de structure');
    cy.get('[data-testid="template-current"]').click();
    cy.contains('button', 'Suivant').click();
    cy.get('[data-testid="structure-columns-input"]').should('have.length', 4);
    cy.get('[data-testid="structure-layers-input"]').should('have.length', 3);

    cy.get('[data-testid="structure-columns-input"]').first().clear();
    cy.contains('button', 'Suivant').click();
    cy.get('[data-testid="wizard-error"]').should('be.visible');
    cy.get('[data-testid="structure-columns-input"]').first().type('Client');
    cy.contains('button', 'Suivant').click();

    cy.get('[data-testid="wizard-backup"]').uncheck();
    cy.get('[data-testid="wizard-create"]').click();
    cy.get('.domain-card').should('not.exist');
    cy.get('.app-item').should('not.exist');
    cy.get('.axis-label').should('contain.text', 'Core / Value');
    cy.get('.map-cell[data-zone-key="customer:strategic"]').should('exist');
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

  it('met en évidence dans la cartographie les capacités sélectionnées dans Impact', () => {
    cy.visit('/');
    cy.get('header').contains('button', 'Impact').click();
    cy.contains('.cap-select', 'CRM-01 — Gestion des Prospects & Leads')
      .should('have.attr', 'aria-pressed', 'false')
      .click()
      .should('have.attr', 'aria-pressed', 'true');

    cy.get('header').contains('button', 'Cartographie').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads')
      .should('have.class', 'impact-selected')
      .and('have.css', 'outline-color', 'rgba(124, 58, 237, 0.2)');
  });

  it('conserve l’inventaire visible et les commandes de cartographie sans bouton de masquage', () => {
    cy.visit('/');
    cy.get('#app-inventory').should('be.visible');
    cy.get('.map').should('be.visible');
    cy.get('.inventory-toggle-rail').should('not.exist');
    cy.get('.workspace').should('not.have.class', 'inventory-collapsed');
    cy.get('[data-testid="map-filter"]').should('be.visible');
    cy.get('.help-icon').click();
    cy.get('.togaf-guide').should('be.visible');
    cy.get('.togaf-guide .guide-intro').should('have.css', 'background-color', 'rgb(238, 242, 255)');
    cy.get('.togaf-guide section').should('have.length', 4).first().should('have.css', 'border-radius', '9px');
    cy.get('.togaf-guide button[aria-label="Fermer"]').click();
    cy.get('#app-inventory').should('be.visible');
  });

  it('regroupe les commandes secondaires dans Outils sans retirer les actions principales', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.get('.toolbar-switch').within(() => {
      cy.contains('button', 'Cartographie').should('be.visible');
      cy.get('[data-testid="tab-relations"]').should('be.visible');
      cy.contains('button', 'Impact').should('be.visible');
    });
    cy.get('.toolbar-history').within(() => {
      cy.get('[data-testid="undo-button"]').should('be.visible').and('be.disabled');
      cy.get('[data-testid="redo-button"]').should('be.visible').and('be.disabled');
    });
    cy.get('[data-testid="theme-toggle"]').should('not.be.visible');
    cy.get('[data-testid="new-map-button"]').should('not.be.visible');
    cy.get('[data-testid="presentation-toggle"]').should('be.visible');
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.attr', 'open');
    cy.get('[data-testid="theme-toggle"]').should('be.visible');
    cy.get('[data-testid="tools-menu-toggle"]').should('have.attr', 'aria-expanded', 'true');
    cy.get('.toolbar-tools-panel').within(() => {
      cy.contains('.toolbar-menu-heading', 'Cartographie').should('be.visible');
      cy.contains('.toolbar-menu-heading', 'Données').should('be.visible');
      cy.contains('.toolbar-menu-heading', 'Affichage').should('be.visible');
      cy.get('[data-testid="new-map-button"]').should('be.visible');
      cy.get('[data-testid="open-local-maps"]').should('be.visible');
      cy.get('[data-testid="save-local-map"]').should('be.visible').and('contain.text', 'Enregistrer');
      cy.get('[data-testid="export-model"]').should('be.visible');
      cy.get('[data-testid="import-model"]').should('exist').and('have.attr', 'accept', '.json,application/json');
    });

    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('have.class', 'presentation-mode');
    cy.get('[data-testid="presentation-switch-input"]').should('have.attr', 'role', 'switch').and('be.checked');
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('not.have.class', 'presentation-mode');
    openToolsMenu();
    cy.get('[data-testid="open-local-maps"]').click();
    cy.get('.modal').should('be.visible').and('contain.text', 'Cartographies');
    cy.get('.modal-head button').click();
    openToolsMenu();
    cy.get('[data-testid="save-local-map"]').click();
    cy.get('[data-testid="local-map-name"]').should('be.visible');
    cy.contains('.modal button', 'Annuler').click();

    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
    openToolsMenu();
    cy.get('body').type('{esc}');
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
  });

  it('garde le menu Outils utilisable sur mobile sans débordement horizontal', () => {
    cy.viewport(402, 874);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.get('.toolbar-switch').should('be.visible');
    cy.get('[data-testid="new-map-button"]').should('not.be.visible');
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="new-map-button"]').should('be.visible');
    cy.get('.toolbar-tools-panel').should('be.visible');
    cy.get('html').then(html => {
      expect(html[0].scrollWidth, 'largeur de page sur mobile').to.be.at.most(402);
    });
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
  });



  it('garde les compteurs d’applications lisibles en thème sombre et en présentation', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.get('[data-testid="tools-menu"]').then($menu => { if (!$menu.attr('open')) cy.get('[data-testid="tools-menu-toggle"]').click(); });
    cy.get('[data-testid="theme-toggle"]').then($toggle => {
      if (!$toggle.closest('.app').hasClass('theme-dark')) cy.wrap($toggle).click();
    });
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('.cap .app-count').first().should('be.visible').then($count => {
      expect(getComputedStyle($count[0]).color, 'texte du compteur en thème sombre').not.to.equal('rgb(0, 0, 0)');
      expect(getComputedStyle($count[0]).backgroundColor, 'fond du compteur en thème sombre').not.to.equal('rgba(0, 0, 0, 0)');
    });

    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('have.class', 'presentation-mode');
    cy.get('.presentation-mode .cap .app-count').first().should('be.visible').then($count => {
      expect(getComputedStyle($count[0]).color, 'texte du compteur en présentation sombre').not.to.equal('rgb(0, 0, 0)');
      expect(getComputedStyle($count[0]).backgroundColor, 'fond du compteur en présentation sombre').not.to.equal('rgba(0, 0, 0, 0)');
    });
  });

  it('conserve un contraste lisible au survol des applications en thème sombre', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.get('[data-testid="tools-menu"]').then($menu => { if (!$menu.attr('open')) cy.get('[data-testid="tools-menu-toggle"]').click(); });

    cy.get('[data-testid="theme-toggle"]').then($toggle => {
      if (!$toggle.closest('.app').hasClass('theme-dark')) cy.wrap($toggle).click();
    });
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('#app-inventory').should('be.visible');
    cy.get('.app-item').first().trigger('mouseover');
    cy.document().then(doc => {
      const rules = Array.from(doc.styleSheets).flatMap(sheet => {
        try { return Array.from(sheet.cssRules); } catch { return []; }
      });
      const hoverRule = rules.find(rule => rule.selectorText === '.app.theme-dark .app-item:hover');
      const titleRule = rules.find(rule => rule.selectorText === '.app.theme-dark .app-item:hover b');
      const detailRule = rules.find(rule => rule.selectorText === '.app.theme-dark .app-item:hover small');

      expect(hoverRule, 'règle de survol en thème sombre').to.exist;
      expect(hoverRule.style.backgroundColor).to.equal('rgb(37, 41, 54)');
      expect(hoverRule.style.borderColor).to.equal('rgb(98, 85, 143)');
      expect(titleRule, 'couleur du titre au survol').to.exist;
      expect(titleRule.style.color).to.equal('rgb(249, 250, 251)');
      expect(detailRule, 'couleur des détails au survol').to.exist;
      expect(detailRule.style.color).to.equal('rgb(196, 202, 218)');
    });
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



  it('adapte visuellement le switch Présentation au thème clair et sombre', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="presentation-toggle"]')
      .should('have.css', 'background-color', 'rgb(255, 255, 255)')
      .and('have.css', 'color', 'rgb(51, 65, 85)');
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="presentation-toggle"]')
      .should('have.css', 'background-color', 'rgb(30, 41, 59)')
      .and('have.css', 'color', 'rgb(241, 245, 249)');
    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('not.have.class', 'theme-dark');
    cy.get('[data-testid="presentation-toggle"]')
      .should('have.css', 'background-color', 'rgb(255, 255, 255)');
  });


  it('garde le surlignage sur le bouton actif dans les thèmes clair et sombre', () => {
    cy.viewport(1280, 800);
    cy.visit('/');

    const assertNavigationHighlight = () => {
      cy.get('.toolbar-switch').should('be.visible').then($switch => {
        const highlight = getComputedStyle($switch[0], '::before');
        expect(highlight.content, 'aucun curseur flottant hérité').to.equal('none');
      });

      cy.get('.toolbar-switch > button.active')
        .should('have.length', 1)
        .and('have.css', 'box-shadow', 'none')
        .then($active => {
          const activeStyle = getComputedStyle($active[0]);
          const inactive = $active.parent().find('button:not(.active)')[0];
          expect(inactive, 'un onglet inactif permet la comparaison').to.exist;
          const inactiveStyle = getComputedStyle(inactive);
          expect(activeStyle.backgroundColor, 'fond distinct pour l’onglet actif')
            .not.to.equal(inactiveStyle.backgroundColor);
          expect(activeStyle.color, 'texte distinct pour l’onglet actif')
            .not.to.equal(inactiveStyle.color);
        });

      cy.get('.toolbar-switch > button:not(.active)').each($button => {
        expect($button, 'les onglets non sélectionnés ne portent pas la classe active')
          .not.to.have.class('active');
      });
    };

    cy.contains('.toolbar-switch > button', 'Cartographie').should('have.class', 'active');
    assertNavigationHighlight();
    cy.get('[data-testid="tab-relations"]').click().should('have.class', 'active');
    assertNavigationHighlight();
    cy.get('header').contains('button', 'Impact').click().should('have.class', 'active');
    assertNavigationHighlight();

    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
    assertNavigationHighlight();
    cy.get('header').contains('button', 'Cartographie').click().should('have.class', 'active');
    assertNavigationHighlight();
  });


  it('préserve la distinction visuelle entre domaines N0 et capacités N1 en présentation claire et sombre', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    const assertN0N1Contrast = () => {
      cy.get('.domain-card').first().then($domain => {
        const banner = $domain.find('.domain-banner')[0];
        const capability = $domain.find('.cap')[0];
        expect(banner, 'en-tête du domaine N0').to.exist;
        expect(capability, 'carte de capacité N1').to.exist;
        expect(getComputedStyle(banner).backgroundColor, 'fond N0').not.to.equal(
          getComputedStyle(capability).backgroundColor
        );
        expect(getComputedStyle(capability).borderColor, 'bordure N1 distincte').not.to.equal('rgba(0, 0, 0, 0)');
      });
    };

    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('have.class', 'presentation-mode');
    assertN0N1Contrast();

    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
    assertN0N1Contrast();
  });


  it('renforce la lisibilité des axes et des zones de cartographie dans les deux thèmes et modes', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    const assertMapContrast = (theme, presentation) => {
      cy.get('.map .axis-label').first().should('be.visible')
        .and('have.css', 'font-size', '12px')
        .then($label => {
          expect(Number.parseInt(getComputedStyle($label[0]).fontWeight, 10), 'poids des titres de lignes').to.be.at.least(700);
        });
      cy.get('.map .col-head').first().should('be.visible')
        .and('have.css', 'font-size', '12px');
      cy.get('.map .map-cell').first().should('be.visible').then($cell => {
        expect(getComputedStyle($cell[0]).borderTopStyle, 'limite de zone visible').to.equal('solid');
        expect(getComputedStyle($cell[0]).borderTopWidth, 'épaisseur de limite').to.equal('1px');
        expect(getComputedStyle($cell[0]).borderTopColor, 'contraste des limites')
          .to.equal(theme === 'dark'
            ? (presentation ? 'rgb(104, 117, 139)' : 'rgb(89, 100, 119)')
            : 'rgb(174, 187, 208)');
      });
    };

    assertMapContrast('light', false);

    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('have.class', 'presentation-mode');
    assertMapContrast('light', true);

    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
    assertMapContrast('dark', true);

    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('not.have.class', 'presentation-mode');
    assertMapContrast('dark', false);
  });

  it('conserve le défilement horizontal dans la carte en présentation mobile sans élargir la page', () => {
    cy.viewport(402, 874);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    openToolsMenu();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.app').should('have.class', 'presentation-mode');
    cy.get('.map').should('be.visible').and('have.css', 'overflow-x', 'auto').then($map => {
      expect($map[0].clientWidth, 'largeur de la carte dans le viewport').to.be.at.most(402);
      expect($map[0].scrollWidth, 'contenu de la carte').to.be.at.least($map[0].clientWidth);
    });
    cy.get('.presentation-mode .domain-banner h3').first().should('be.visible');
    cy.get('.presentation-mode .cap-head .map-cap-select').first().should('be.visible');
    cy.get('html').then($html => {
      expect($html[0].scrollWidth, 'aucun débordement horizontal de la page').to.be.at.most(402);
    });
  });
});

describe('Dashboard — filtres de la heatmap', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
  });

  it('filtre les gaps et expose les résultats navigables', () => {
    cy.get('[data-testid="dashboard-heatmap-result-count"]').should('contain.text', '10 / 10 éléments');
    cy.get('[data-testid="dashboard-heatmap-status-filter"]').select('gap');
    cy.get('[data-testid="dashboard-heatmap-result-count"]').should('contain.text', '2 / 10 éléments');
    cy.get('[data-testid="dashboard-filter-results"] .dashboard-target').should('have.length', 2);
    cy.get('[data-testid="dashboard-filter-results"] .dashboard-target').first().click();
    cy.get('[data-testid="return-to-dashboard"]').should('be.visible');
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');
    cy.get('[data-testid="return-to-dashboard"]').click();
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
  });

  it('combine recherche et domaine N0 puis réinitialise les filtres', () => {
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

  it('conserve la matrice et les extensions de colonnes pendant le filtrage', () => {
    cy.window().then(win => {
      const key = 'enterprise-capacity-mapper:model:v3';
      const model = JSON.parse(win.localStorage.getItem(key));
      model.domains.find(domain => domain.id === 'l0-1').layout.columnSpan = 2;
      win.localStorage.setItem(key, JSON.stringify(model));
    });
    cy.reload();
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

  it('reste utilisable sur mobile et en thème sombre', () => {
    cy.viewport(402, 874);
    cy.get('[data-testid="dashboard-heatmap-filters"]').should('be.visible');
    cy.get('[data-testid="dashboard-heatmap-search"]').should('be.visible');
    cy.get('html').then($html => expect($html[0].scrollWidth).to.be.at.most(402));
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="dashboard-heatmap-status-filter"]').select('redundant');
    cy.get('[data-testid="dashboard-filter-results"]').should('be.visible');
  });
});
