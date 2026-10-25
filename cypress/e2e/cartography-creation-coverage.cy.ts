describe('Lot 6 — création et arbre de cartographie', () => {
  const fresh = () => cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.clear();
    },
  });

  const openWizard = () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('[data-testid="wizard-step-1"]').should('be.visible');
  };

  const openTree = () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.coverage-tree').should('be.visible');
  };

  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
    fresh();
  });

  it('bloque le passage à l’étape suivante si le nom est vide puis accepte un nom valide', () => {
    openWizard();
    cy.get('[data-testid="wizard-name"]').clear();
    cy.contains('.wizard-footer button', 'Suivant').click();
    cy.get('[data-testid="wizard-error"]').should('contain.text', 'nom de la cartographie est obligatoire');
    cy.get('[data-testid="wizard-name"]').type('Cartographie de test');
    cy.contains('.wizard-footer button', 'Suivant').click();
    cy.get('[data-testid="wizard-step-2"]').should('be.visible');
  });

  it('présente des points de départ orientés capability mapping et conserve la chaîne de valeur', () => {
    openWizard();
    cy.get('[data-testid="template-capability-map"]').should('contain.text', 'Cartographie de capacités');
    cy.get('[data-testid="template-capability-map"]').should('contain.text', 'structure neutre');
    cy.get('[data-testid="template-value-chain"]').should('contain.text', 'Capacités par chaîne de valeur');
    cy.get('[data-testid="template-blank"]').should('contain.text', 'Cartographie vierge');
    cy.get('[data-testid="template-matrix"]').should('not.exist');
  });

  it('couvre les deux niveaux de détail et leur vocabulaire métier', () => {
    openWizard();
    cy.get('[data-testid="depth-1"]').should('contain.text', 'Vue synthétique');
    cy.get('[data-testid="depth-2"]').should('contain.text', 'Vue détaillée');
    cy.get('[data-testid="depth-2"]').click().should('have.attr', 'aria-pressed', 'true');
    cy.contains('.structure-hint', 'axes de la grille servent uniquement à organiser leur lecture').should('be.visible');
    cy.get('[data-testid="depth-1"]').click().should('have.attr', 'aria-pressed', 'true');
  });

  it('couvre l’édition complète des axes : ajout, renommage, déplacement et suppression', () => {
    openWizard();
    cy.contains('.wizard-footer button', 'Suivant').click();

    cy.get('[data-testid="structure-add-columns"]').click();
    cy.get('[data-testid="structure-columns-input"]').should('have.length', 5);
    cy.get('[data-testid="structure-columns-input"]').last().clear().type('Canal');
    cy.get('[aria-label="Monter Canal"]').click();
    cy.get('[data-testid="structure-columns-input"]').eq(3).should('have.value', 'Canal');
    cy.get('[aria-label="Supprimer Canal"]').click();
    cy.get('[data-testid="structure-columns-input"]').should('have.length', 4);

    cy.get('[data-testid="structure-add-layers"]').click();
    cy.get('[data-testid="structure-layers-input"]').last().clear().type('Tactique');
    cy.get('[aria-label="Monter Tactique"]').click();
    cy.get('[aria-label="Supprimer Tactique"]').click();
    cy.get('[data-testid="structure-layers-input"]').should('have.length', 1);

    cy.get('[data-testid="structure-columns-input"]').first().clear().type('Client modifié');
    cy.get('[data-testid="wizard-preview"]').should('contain.text', 'Client modifié');
  });

  it('refuse une structure contenant un axe sans nom et permet de revenir en arrière', () => {
    openWizard();
    cy.contains('.wizard-footer button', 'Suivant').click();
    cy.get('[data-testid="structure-columns-input"]').first().clear();
    cy.contains('.wizard-footer button', 'Suivant').click();
    cy.get('[data-testid="wizard-error"]').should('contain.text', 'Chaque colonne et chaque ligne doit avoir un nom');
    cy.contains('.wizard-footer button', 'Précédent').click();
    cy.get('[data-testid="wizard-step-1"]').should('be.visible');
  });

  it('construit le récapitulatif avec le niveau et le point de départ sélectionnés', () => {
    openWizard();
    cy.get('[data-testid="wizard-name"]').clear().type('Cartographie sauvegardée');
    cy.get('[data-testid="wizard-description"]').type('Description de test');
    cy.get('[data-testid="depth-1"]').click();
    cy.get('[data-testid="template-value-chain"]').click();
    cy.contains('.wizard-footer button', 'Suivant').click();
    cy.contains('.wizard-footer button', 'Suivant').click();

    cy.get('[data-testid="wizard-step-3"]').should('contain.text', 'Cartographie sauvegardée')
      .and('contain.text', 'Description de test')
      .and('contain.text', 'Vue synthétique · N0')
      .and('contain.text', 'Capacités par chaîne de valeur')
      .and('contain.text', 'Concevoir')
      .and('contain.text', 'Management');
    cy.get('[data-testid="wizard-warning"]').should('be.visible');
    cy.get('[data-testid="wizard-backup"]').should('be.checked').uncheck().should('not.be.checked');
    cy.get('[data-testid="wizard-create"]').should('be.visible');
  });

  it('annule le wizard avec Echap sans créer de cartographie', () => {
    openWizard();
    cy.get('[data-testid="wizard-name"]').clear().type('Ne doit pas être créée');
    cy.get('body').type('{esc}');
    cy.get('.modal.wizard').should('not.exist');
    cy.contains('.cap', 'Ne doit pas être créée').should('not.exist');
  });

  it('couvre les raccourcis de navigation clavier Home et End dans l’arbre', () => {
    openTree();
    cy.get('.tree-toggle').first().focus().type('{end}');
    cy.focused().should('have.class', 'tree-toggle');
    cy.get('.tree-toggle').last().type('{home}');
    cy.get('.tree-toggle').first().should('have.focus');
  });
});

export {};
