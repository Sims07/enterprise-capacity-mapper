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
    cy.get('html').then(html => { expect(html[0].scrollWidth, 'largeur de page').to.be.at.most(402); });
    cy.get('.toolbar-actions').should('have.css', 'overflow-x', 'visible');
    cy.get('.inventory-toggle-rail').click();
    cy.get('#app-inventory').should('be.visible');
    cy.get('.app-item').should('be.visible');
    cy.get('.inventory-toggle-rail').click();
    cy.get('#app-inventory').should('not.be.visible');
  });

  it('affiche un assistant Nouvelle cartographie stylé et adapté au mobile', () => {
    cy.visit('/');
    cy.viewport(1280, 800);
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('.modal.wizard').should('be.visible').and('have.css', 'border-radius', '16px').and('have.css', 'width', '920px');
    cy.get('.wizard-steps li.current')
      .should('have.attr', 'aria-current', 'step')
      .and('have.css', 'color', 'rgb(55, 48, 163)')
      .and('have.css', 'background-color', 'rgb(238, 242, 255)');
    cy.get('[data-testid="template-matrix"]').should('have.attr', 'aria-pressed', 'true').and('have.css', 'background-color', 'rgb(245, 245, 255)');
    cy.contains('button', 'Suivant').click();
    cy.get('.wizard-steps li.current').should('contain.text', 'Structure').and('have.css', 'color', 'rgb(55, 48, 163)');
    cy.get('.axis-editor').should('have.length', 2).and('have.css', 'border-radius', '11px');
    cy.get('[data-testid="wizard-preview"]').should('be.visible');
    cy.viewport(390, 740);
    cy.get('.modal.wizard').should('be.visible').then(modal => {
      const rect = modal[0].getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
    });
    cy.get('.wizard-structure').should('have.css', 'grid-template-columns').then(columns => { expect(columns).to.match(/^\d+(?:\.\d+)?px$/); });
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
    cy.visit('/'); cy.clearLocalStorage(); cy.reload();
    cy.get('.cap').should('have.length', 10);
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => { cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').should('be.visible').click(); });
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
    cy.visit('/'); cy.clearLocalStorage(); cy.reload();
    cy.get('[data-testid="undo-button"]').should('be.disabled');
    cy.get('[data-testid="redo-button"]').should('be.disabled');
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => { cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').click(); });
    cy.get('.context-menu').contains('button', 'Renommer').click();
    cy.get('.modal .field input').clear().type('Qualification des prospects');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.contains('.cap', 'Qualification des prospects').should('exist');
    cy.get('[data-testid="undo-button"]').should('be.enabled');
    cy.get('body').type('{ctrl}z'); cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist');
    cy.get('[data-testid="redo-button"]').should('be.enabled');
    cy.get('body').type('{ctrl}{shift}z'); cy.contains('.cap', 'Qualification des prospects').should('exist');
    cy.get('[data-testid="undo-button"]').click(); cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist');
    cy.get('[data-testid="redo-button"]').click(); cy.contains('.cap', 'Qualification des prospects').should('exist');
  });

  it('enregistre une cartographie localement et permet de la rouvrir après rechargement', () => {
    cy.visit('/'); cy.clearLocalStorage(); cy.reload();
    openToolsMenu(); cy.get('[data-testid="save-local-map"]').click();
    cy.get('[data-testid="local-map-name"]').clear().type('Cartographie locale QA');
    cy.contains('.modal button', 'Enregistrer').click();
    cy.window().then(window => { const savedMaps = JSON.parse(window.localStorage.getItem('enterprise-capacity-mapper:local-maps:v1')); expect(savedMaps.map(map => map.name)).to.include('Cartographie locale QA'); });
    cy.reload(); openToolsMenu(); cy.get('[data-testid="open-local-maps"]').click();
    cy.get('[data-testid="recent-maps-list"]').contains('.local-map-row', 'Cartographie locale QA').should('be.visible');
    cy.get('[data-testid="saved-maps-list"]').contains('.local-map-row', 'Cartographie locale QA').should('be.visible');
    cy.get('.modal-head button').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads').within(() => { cy.get('button[aria-label="Renommer Gestion des Prospects & Leads"]').click(); });
    cy.get('.context-menu').contains('button', 'Renommer').click(); cy.get('.modal .field input').clear().type('Modification non sauvegardée'); cy.contains('.modal button', 'Enregistrer').click();
    openToolsMenu(); cy.get('[data-testid="open-local-maps"]').click();
    cy.get('[data-testid="saved-maps-list"]').contains('.local-map-row', 'Cartographie locale QA').contains('button', 'Ouvrir').click();
    cy.get('[data-testid="confirm-load-local-map"]').click();
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('exist'); cy.contains('.cap', 'Modification non sauvegardée').should('not.exist');
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
    cy.contains('button', 'Suivant').click(); cy.contains('button', 'Suivant').click(); cy.get('[data-testid="wizard-create"]').click();
  });

  it('ferme le menu Outils avec un clic extérieur et garde le contraste de l’étape active en dark', () => {
    cy.visit('/'); cy.clearLocalStorage(); cy.reload();
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.attr', 'open');
    cy.get('body').click(10, 10);
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('.modal.wizard').should('be.visible');
    cy.get('.app').then($app => {
      if ($app.hasClass('theme-dark')) {
        cy.get('.wizard-steps li.current').should('have.css', 'color', 'rgb(248, 250, 252)').and('have.css', 'background-color', 'rgb(38, 35, 59)');
      }
    });
  });
});
