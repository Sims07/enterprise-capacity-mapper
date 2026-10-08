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

  it('renomme une capacité N1 sans perdre ses applications associées', () => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.get('.stats').should('contain.text', '10 N1');
    cy.contains('.domain', 'Relation & Engagement Client').contains('button', '＋ N1').should('be.visible');
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => {
      cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').should('be.visible').click();
    });
    cy.get('.modal h2').should('contain.text', 'Renommer la capacité N1');
    cy.get('.modal .field input').clear().type('Qualification des prospects');
    cy.contains('.modal button', 'Enregistrer').click();

    cy.contains('.cap', 'Qualification des prospects').should('contain.text', 'Salesforce CRM');
    cy.reload();
    cy.contains('.cap', 'Qualification des prospects').should('contain.text', 'Salesforce CRM');
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('not.exist');
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

    cy.get('.stats').should('contain.text', '0 N0').and('not.contain.text', 'N1');
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
    cy.get('[data-testid="structure-layers-input"]').first().clear().type('Stratégique');
    cy.get('[data-testid="structure-add-layers"]').click();
    cy.get('[data-testid="structure-layers-input"]').eq(1).clear().type('Opérationnel');
    cy.get('[data-testid="wizard-preview"]').should('contain.text', 'Métier').and('contain.text', 'Opérationnel');
    cy.contains('button', 'Suivant').click();

    // Étape 3 : récapitulatif, avec avertissement de remplacement
    cy.get('[data-testid="wizard-warning"]').should('contain.text', '4 domaines N0');
    cy.get('[data-testid="wizard-backup"]').should('be.checked').uncheck();
    cy.get('[data-testid="wizard-create"]').click();

    cy.get('.stats').should('contain.text', '0 N0');
    cy.get('.axis-label').should('contain.text', 'Stratégique').and('contain.text', 'Opérationnel');
    cy.get('.map-head').should('contain.text', 'Métier');
    cy.get('.cell-label').should('not.exist');

    // Ajout depuis la cellule de la première ligne
    cy.get('.map-cell[data-zone-key="default:default"] .cell-add').click();
    cy.get('.modal .field input').eq(0).type('Domaine personnalisé');
    cy.get('.modal .field input').eq(1).type('CUSTOM');
    cy.get('.modal .field input').eq(2).type('Créé depuis une cellule.');
    cy.contains('.modal button', 'Créer').click();
    cy.get('.map-row:not(.map-head)').eq(0).contains('.domain h3', 'Domaine personnalisé').should('be.visible');

    // Ajout depuis la cellule de la seconde ligne
    cy.get('.map-row:not(.map-head)').eq(1).find('.cell-add').click();
    cy.get('.modal .field input').eq(0).type('Domaine ligne 2');
    cy.get('.modal .field input').eq(1).type('CUSTOM-2');
    cy.contains('.modal button', 'Créer').click();
    cy.get('.map-row:not(.map-head)').eq(1).contains('.domain h3', 'Domaine ligne 2').should('be.visible');

    // Déplacement sans glisser-déposer, via les sélecteurs de la modale
    cy.contains('.domain', 'Domaine ligne 2').contains('button', 'Modifier').click();
    cy.get('.modal select').eq(1).select('Stratégique');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.get('.map-row:not(.map-head)').eq(0).should('contain.text', 'Domaine ligne 2');
    cy.get('.map-row:not(.map-head)').eq(1).should('not.contain.text', 'Domaine ligne 2');

    // Renommage
    cy.contains('.domain', 'Domaine personnalisé').contains('button', 'Modifier').click();
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
    cy.contains('button', 'Annuler').click();
    cy.get('[data-testid="wizard-step-1"]').should('not.exist');
    cy.get('.stats').should('contain.text', '4 N0');

    cy.contains('button', 'Nouvelle cartographie').click();
    cy.get('body').type('{esc}');
    cy.get('[data-testid="wizard-step-1"]').should('not.exist');
    cy.get('.stats').should('contain.text', '4 N0');
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
    cy.get('.stats').should('contain.text', '0 N0').and('contain.text', '0 Apps');
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
});
