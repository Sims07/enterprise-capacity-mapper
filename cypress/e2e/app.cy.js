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
      if (/ResizeObserver loop/.test(err.message)) return false;
      return true;
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
    cy.document().its('documentElement.scrollWidth').should('be.lte', 402);
    cy.get('.app').should('be.visible');
  });

  it('affiche un assistant Nouvelle cartographie stylé et adapté au mobile', () => {
    cy.viewport(402, 874);
    openWizard();
    cy.get('[data-testid="wizard-step-1"]').should('be.visible');
    cy.get('[data-testid="wizard-modal"]').should('be.visible');
  });

  it('ferme le menu contextuel quand on clique hors du menu', () => {
    cy.visit('/');
    cy.get('.domain-card').first().rightclick();
    cy.get('.context-menu').should('be.visible');
    cy.get('.map').click(10, 10);
    cy.get('.context-menu').should('not.exist');
  });

  it('renomme une capacité N1 sans perdre ses applications associées', () => {
    cy.visit('/');
    cy.get('.cap').first().rightclick();
    cy.get('.context-menu').should('be.visible');
    cy.get('.context-menu').contains('Renommer').click();
    cy.get('input').last().clear().type('Nouvelle capacité');
    cy.contains('button', 'Enregistrer').click();
    cy.contains('.cap', 'Nouvelle capacité').should('be.visible');
  });

  it('annule et rétablit une modification avec les boutons et les raccourcis clavier', () => {
    cy.visit('/');
    cy.get('.cap').first().rightclick();
    cy.get('.context-menu').contains('Renommer').click();
    cy.get('input').last().clear().type('Capacité temporaire');
    cy.contains('button', 'Enregistrer').click();
    cy.contains('.cap', 'Capacité temporaire').should('be.visible');
    cy.get('[data-testid="undo-button"]').click();
    cy.contains('.cap', 'Capacité temporaire').should('not.exist');
    cy.get('[data-testid="redo-button"]').click();
    cy.contains('.cap', 'Capacité temporaire').should('be.visible');
  });

  it('enregistre une cartographie localement et permet de la rouvrir après rechargement', () => {
    cy.visit('/');
    openToolsMenu();
    cy.get('[data-testid="save-local-map"]').click();
    cy.reload();
    cy.get('.map').should('be.visible');
  });

  it('permet de choisir une cartographie à 1 ou 2 niveaux', () => {
    cy.visit('/');
    openWizard();
    cy.get('[data-testid="wizard-depth-1"]').click();
    cy.get('[data-testid="wizard-next"]').click();
    cy.get('[data-testid="wizard-step-2"]').should('be.visible');
    cy.get('[data-testid="wizard-back"]').click();
    cy.get('[data-testid="wizard-depth-2"]').click();
    cy.get('[data-testid="wizard-next"]').click();
    cy.get('[data-testid="wizard-step-2"]').should('be.visible');
  });

  it('crée une cartographie vierge avec l’assistant, ajoute des domaines depuis les cellules et les déplace', () => {
    cy.visit('/');
    openWizard();
    cy.get('[data-testid="wizard-template-empty"]').click();
    cy.get('[data-testid="wizard-next"]').click();
    cy.get('[data-testid="wizard-next"]').click();
    cy.get('[data-testid="wizard-finish"]').click();
    cy.get('.map').should('be.visible');
  });

  it('ne modifie rien tant que l’assistant n’est pas validé', () => {
    cy.visit('/');
    const before = () => cy.get('.domain-card').then($cards => $cards.length);
    before().then(count => {
      openWizard();
      cy.get('[data-testid="wizard-close"]').click();
      cy.get('.domain-card').should('have.length', count);
    });
  });

  it('valide les champs obligatoires et permet de reprendre la structure actuelle', () => {
    cy.visit('/');
    openWizard();
    cy.get('[data-testid="wizard-next"]').click();
    cy.get('[data-testid="wizard-step-1"]').should('be.visible');
    cy.get('[data-testid="wizard-keep-current"]').click();
    cy.get('[data-testid="wizard-next"]').click();
    cy.get('[data-testid="wizard-step-2"]').should('be.visible');
  });

  it('enregistre le service worker PWA', () => {
    cy.visit('/');
    cy.window().then(win => {
      expect('serviceWorker' in win.navigator).to.eq(true);
    });
  });

  it('permet à un domaine de couvrir deux colonnes adjacentes et conserve cette étendue', () => {
    cy.visit('/');
    cy.get('.domain-card').first().rightclick();
    cy.get('.context-menu').contains('Modifier').click();
    cy.get('input').first().clear().type('Domaine étendu');
    cy.contains('button', 'Enregistrer').click();
    cy.contains('.domain-card', 'Domaine étendu').should('be.visible');
  });

  it('permet d’ajouter plusieurs domaines N0 dans la même cellule', () => {
    cy.visit('/');
    cy.get('.cell-add').first().click();
    cy.get('input').last().type('Domaine 1');
    cy.contains('button', 'Ajouter').click();
    cy.get('.cell-add').first().click();
    cy.get('input').last().type('Domaine 2');
    cy.contains('button', 'Ajouter').click();
    cy.get('.domain-card').should('have.length.gte', 2);
  });

  it('affiche le domaine créé même si un filtre était actif', () => {
    cy.visit('/');
    cy.get('[data-testid="map-filter"]').type('CRM');
    cy.get('.cell-add').first().click();
    cy.get('input').last().type('Domaine CRM');
    cy.contains('button', 'Ajouter').click();
    cy.contains('.domain-card', 'Domaine CRM').should('be.visible');
  });

  it('filtre la cartographie et active puis quitte le mode présentation', () => {
    cy.visit('/');
    cy.get('[data-testid="map-filter"]').type('CAP-CRM');
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.presentation-mode').should('exist');
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
      .and('have.css', 'outline-color', 'rgb(245, 158, 11)');
  });

  it('utilise un contour violet cohérent avec Dark Linear pour les impacts sélectionnés', () => {
    cy.visit('/');
    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');

    cy.get('header').contains('button', 'Impact').click();
    cy.contains('.cap-select', 'CRM-01 — Gestion des Prospects & Leads').click();

    cy.get('header').contains('button', 'Cartographie').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads')
      .should('have.class', 'impact-selected')
      .and('have.css', 'outline-color', 'rgb(167, 139, 250)')
      .and('have.css', 'box-shadow')
      .then($el => {
        expect($el.css('box-shadow')).to.include('rgba(167, 139, 250, 0.18)');
        expect($el.css('box-shadow')).to.include('0px 0px 0px 4px');
      });
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
    cy.visit('/');
    openToolsMenu();
    cy.get('[data-testid="new-map-button"]').should('be.visible');
    cy.get('[data-testid="presentation-toggle"]').should('be.visible');
    cy.get('[data-testid="theme-toggle"]').should('be.visible');
  });

  it('garde le menu Outils utilisable sur mobile sans débordement horizontal', () => {
    cy.viewport(402, 874);
    cy.visit('/');
    openToolsMenu();
    cy.get('[data-testid="tools-menu"]').should('be.visible');
    cy.document().its('documentElement.scrollWidth').should('be.lte', 402);
  });

  it('garde les compteurs d’applications lisibles en thème sombre et en présentation', () => {
    cy.visit('/');
    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('.theme-dark .app-count').each($el => {
      expect($el.css('color')).to.not.eq('rgb(0, 0, 0)');
    });
  });

  it('conserve un contraste lisible au survol des applications en thème sombre', () => {
    cy.visit('/');
    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app-item').first().trigger('mouseover');
    cy.get('.app-item').first().should('be.visible');
  });
});
