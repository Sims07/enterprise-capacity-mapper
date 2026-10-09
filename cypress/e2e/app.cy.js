describe('Application smoke test', () => {
  const assertApplicationLoaded = () => {
    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('.map-filter-bar').should('be.visible');
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

  const openWizard = () => {
    cy.visit('/');
    cy.contains('button', 'Nouvelle cartographie').click();
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

  it('conserve le style et la lisibilité du bouton Nouvelle cartographie dans la barre compacte', () => {
    cy.viewport(1000, 660);
    cy.visit('/');
    cy.get('[data-testid="new-map-button"]')
      .should('be.visible')
      .and('have.css', 'white-space', 'nowrap')
      .and('have.css', 'border-radius', '8px')
      .then(button => {
        expect(button[0].scrollWidth).to.be.at.most(button[0].clientWidth);
      });
    cy.viewport(1280, 720);
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
    cy.get('.modal h2').should('contain.text', 'Renommer la capacité N1');
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

    cy.get('[data-testid="save-local-map"]').click();
    cy.get('[data-testid="local-map-name"]').clear().type('Cartographie locale QA');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.window().then(window => {
      const savedMaps = JSON.parse(window.localStorage.getItem('enterprise-capacity-mapper:local-maps:v1'));
      expect(savedMaps.map(map => map.name)).to.include('Cartographie locale QA');
    });

    cy.reload();
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

    // Étape 1 : point de départ
    cy.get('[data-testid="template-blank"]').click();
    cy.get('[data-testid="wizard-name"]').clear().type('Ma cartographie');
    cy.contains('button', 'Suivant').click();

    // Étape 2 : structure
    cy.get('[data-testid="wizard-step-2"]').should('be.visible');
    cy.get('[data-testid="structure-columns-input"]').first().clear().type('Métier');
    cy.get('[data-testid="structure-add-columns"]').click();
    cy.get('[data-testid="structure-columns-input"]').eq(1).clear().type('Support');
    cy.get('[data-testid="structure-layers-input"]').first().clear().type('Stratégique');
    cy.get('[data-testid="structure-add-layers"]').click();
    cy.get('[data-testid="structure-layers-input"]').eq(1).clear().type('Opérationnel');
    cy.get('[data-testid="wizard-preview"]').should('contain.text', 'Métier').and('contain.text', 'Opérationnel');
    cy.contains('button', 'Suivant').click();

    // Étape 3 : récapitulatif, avec avertissement de remplacement
    cy.get('[data-testid="wizard-warning"]').should('contain.text', '4 domaines N0');
    cy.get('[data-testid="wizard-backup"]').should('be.checked').uncheck();
    cy.get('[data-testid="wizard-create"]').click();

    cy.get('.domain-card').should('not.exist');
    cy.get('.axis-label').should('contain.text', 'Stratégique').and('contain.text', 'Opérationnel');
    cy.get('.map-head').should('contain.text', 'Métier');
    cy.get('.cell-label').should('not.exist');

    // Ajout depuis la cellule de la première ligne
    cy.get('.map-row:not(.map-head)').eq(0).find('.map-cell[data-zone-key="default:default"] .cell-add').click();
    cy.get('.modal .field input').eq(0).type('Domaine personnalisé');
    cy.get('.modal .field input').eq(1).type('CUSTOM');
    cy.get('.modal .field input').eq(2).type('Créé depuis une cellule.');
    cy.contains('.modal button', 'Créer').click();
    cy.get('.map-row:not(.map-head)').eq(0).contains('.domain h3', 'Domaine personnalisé').should('be.visible');

    // Ajout depuis la cellule de la seconde ligne
    cy.get('.map-row:not(.map-head)').eq(1).find('.cell-add').first().click();
    cy.get('.modal .field input').eq(0).type('Domaine ligne 2');
    cy.get('.modal .field input').eq(1).type('CUSTOM-2');
    cy.contains('.modal button', 'Créer').click();
    cy.get('.map-row:not(.map-head)').eq(1).contains('.domain h3', 'Domaine ligne 2').should('be.visible');

    // Déplacement sans glisser-déposer, via les sélecteurs de la modale
    cy.contains('.domain', 'Domaine ligne 2').find('button[aria-label="Actions pour Domaine ligne 2"]').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    // Déplacer vers une cellule libre pour ne pas chevaucher le premier domaine.
    cy.get('.modal select').eq(0).select('Support');
    cy.get('.modal select').eq(1).select('Stratégique');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.get('.map-row:not(.map-head)').eq(0).should('contain.text', 'Domaine ligne 2');
    cy.get('.map-row:not(.map-head)').eq(1).should('not.contain.text', 'Domaine ligne 2');

    // Renommage
    cy.contains('.domain', 'Domaine personnalisé').find('button[aria-label="Actions pour Domaine personnalisé"]').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('.modal .field input').eq(0).clear().type('Domaine renommé');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.contains('.domain h3', 'Domaine renommé').should('be.visible');

    // Nom de zone facultatif : affiché uniquement s’il diffère du nom de la colonne
    cy.contains('button', '⚙ Structure').click();
    cy.get('.modal [data-zone-key="default:default"] input').clear().type('Zone métier stratégique');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.get('.map-cell[data-zone-key="default:default"] .cell-label').should('have.text', 'Zone métier stratégique');
    cy.get('.map-cell').not('[data-zone-key="default:default"]').find('.cell-label').should('not.exist');

    // Persistance
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

    cy.contains('button', 'Nouvelle cartographie').click();
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
    cy.get('header').contains('button', 'Présentation').click();
    cy.get('.app').should('have.class', 'presentation-mode');
    cy.get('aside').should('not.be.visible');
    cy.get('.workspace').should('have.css', 'grid-template-columns').and('not.contain', '300px');
    cy.get('.presentation-mode .cap').should('have.length', 3).first().should('have.css', 'border-radius', '6px');
    cy.get('.presentation-mode .cap-desc, .presentation-mode .cap .relations, .presentation-mode .cell-add, .presentation-mode .domain-actions').should('not.be.visible');
    cy.get('header').contains('button', 'Quitter la présentation').click();
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
      .and('have.css', 'outline-color', 'rgb(245, 158, 11)');
  });


  it('agrandit la cartographie en repliant l’inventaire sans perdre les commandes', () => {
    cy.visit('/');
    cy.get('#app-inventory').should('be.visible');
    cy.get('.map').should('be.visible');
    cy.get('.inventory-toggle-rail').should('be.visible').and('have.attr', 'aria-label', 'Masquer l’inventaire des applications').click();
    cy.get('#app-inventory').should('not.be.visible');
    cy.get('.workspace').should('have.class', 'inventory-collapsed');
    cy.get('.map').should('be.visible');
    cy.get('[data-testid="map-filter"]').should('be.visible');
    cy.get('.help-icon').click();
    cy.get('.togaf-guide').should('be.visible');
    cy.get('.togaf-guide .guide-intro').should('have.css', 'background-color', 'rgb(238, 242, 255)');
    cy.get('.togaf-guide section').should('have.length', 4).first().should('have.css', 'border-radius', '9px');
    cy.get('.togaf-guide button[aria-label="Fermer"]').click();
    cy.get('.inventory-toggle-rail').should('have.attr', 'aria-label', 'Afficher l’inventaire des applications').click();
    cy.get('#app-inventory').should('be.visible');
    cy.get('.workspace').should('not.have.class', 'inventory-collapsed');
  });

});