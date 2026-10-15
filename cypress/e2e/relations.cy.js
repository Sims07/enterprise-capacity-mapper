describe('Relations applications ↔ capacités', () => {
  const fresh = (path = '/') => {
    cy.visit(path);
    cy.clearLocalStorage();
    cy.reload();
  };
  const openTree = () => {
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.coverage-tree').should('be.visible');
  };
  const node = name => cy.contains('.tree-node-cap', name);
  const dragAppTo = (appName, rowSelector, targetName) => {
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer();
      cy.contains('.app-item', appName).trigger('dragstart', { dataTransfer });
      cy.contains(rowSelector, targetName)
        .trigger('dragover', { dataTransfer })
        .should('have.class', 'drop-over')
        .trigger('drop', { dataTransfer });
    });
  };

  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
  });

  it('affiche l’arbre Domaine N0 → N1 → applications avec ses compteurs', () => {
    fresh();
    openTree();
    cy.get('.tree-node-domain').should('have.length', 4);
    cy.get('.tree-cap').should('have.length', 10);
    node('Gestion des Prospects & Leads').should('contain.text', 'Salesforce CRM').and('contain.text', 'Couvert');
    node('Achats Fournisseurs').should('contain.text', 'Gap');
    cy.get('.tree-summary').should('contain.text', '2 gaps').and('contain.text', '1 redondance');
  });

  it('relie une application par glisser-déposer sur une ligne de l’arbre', () => {
    fresh();
    openTree();
    dragAppTo('Odoo Invoice', '.tree-cap', 'Achats Fournisseurs');
    node('Achats Fournisseurs').should('contain.text', 'Odoo Invoice').and('contain.text', 'Couvert');
    cy.get('.drop-over').should('not.exist');
    cy.reload();
    cy.get('[data-testid="tab-relations"]').click();
    node('Achats Fournisseurs').should('contain.text', 'Odoo Invoice');
  });

  it('relie sans glisser-déposer via la fenêtre « Relier… » et permet d’annuler', () => {
    fresh();
    openTree();
    cy.get('button[aria-label="Relier des applications à Achats Fournisseurs"]').click();
    cy.get('.modal').should('have.attr', 'role', 'dialog');
    cy.get('[data-testid="link-list"]').contains('label', 'Odoo Invoice').find('input').check();
    cy.get('[data-testid="link-save"]').click();
    node('Achats Fournisseurs').should('contain.text', 'Odoo Invoice');
    cy.get('[data-testid="undo-button"]').click();
    node('Achats Fournisseurs').should('not.contain.text', 'Odoo Invoice');
  });

  it('relie plusieurs applications sélectionnées dans l’inventaire avec « Relier ici »', () => {
    fresh();
    cy.get('input[aria-label="Sélectionner Odoo Invoice"]').check();
    cy.get('input[aria-label="Sélectionner Manhattan WMS"]').check();
    cy.get('[data-testid="picked-bar"]').should('contain.text', '2 sélectionnée(s)');
    openTree();
    cy.contains('.tree-cap', 'Congés & Suivi des Temps').contains('button', 'Relier ici (2)').click();
    node('Congés & Suivi des Temps').should('contain.text', 'Odoo Invoice').and('contain.text', 'Manhattan WMS');
    cy.get('[data-testid="picked-bar"]').should('not.exist');
  });

  it('relie depuis le bouton « Relier à… » de l’inventaire sans quitter la cartographie', () => {
    fresh();
    cy.get('button[aria-label="Relier Odoo Invoice à des capacités N1"]').click();
    cy.get('.modal h2').should('contain.text', 'Odoo Invoice');
    cy.get('[data-testid="link-list"]').contains('label', 'Achats Fournisseurs').find('input').check();
    cy.get('[data-testid="link-save"]').click();
    cy.contains('.cap', 'Achats Fournisseurs').should('contain.text', 'Odoo Invoice');
    cy.contains('.cap', 'Facturation & Recouvrement').should('contain.text', 'Odoo Invoice');
  });

  it('relie depuis le menu contextuel d’une capacité de la cartographie', () => {
    fresh();
    cy.get('button[aria-label="Renommer Support & Service Client (SAV)"]').click();
    cy.get('.context-menu').contains('button', 'Relier des applications…').click();
    cy.get('[data-testid="link-list"]').contains('label', 'Odoo Invoice').find('input').check();
    cy.get('[data-testid="link-save"]').click();
    cy.contains('.cap', 'Support & Service Client (SAV)').should('contain.text', 'Odoo Invoice');
  });

  it('retire une relation depuis l’arbre', () => {
    fresh();
    openTree();
    cy.get('button[aria-label="Retirer Salesforce CRM de Gestion des Prospects & Leads"]').click();
    node('Gestion des Prospects & Leads').should('contain.text', 'Gap').and('not.contain.text', 'Salesforce CRM');
  });

  it('filtre les gaps et les redondances et peut réinitialiser le filtre', () => {
    fresh();
    openTree();
    cy.get('[data-testid="tree-coverage-filter"]').select('gap');
    cy.get('.tree-cap').should('have.length', 2);
    cy.get('[data-testid="tree-coverage-filter"]').select('redundant');
    cy.get('.tree-cap').should('have.length', 1).and('contain.text', 'Facturation & Recouvrement');
    cy.contains('button', 'Réinitialiser le filtre').click();
    cy.get('.tree-cap').should('have.length', 10);
    cy.get('[data-testid="tree-filter"]').type('Zendesk');
    cy.get('.tree-cap').should('have.length', 1).and('contain.text', 'Support & Service Client');
    cy.get('[data-testid="tree-filter"]').clear().type('introuvable');
    cy.get('.tree-empty').should('contain.text', 'Aucun élément');
  });

  it('replie, déplie et se navigue au clavier', () => {
    fresh();
    openTree();
    cy.contains('button', 'Tout replier').click();
    cy.get('.tree-node-domain').first().should('have.attr', 'aria-expanded', 'false');
    cy.get('.tree-cap').should('not.exist');
    cy.contains('button', 'Tout déplier').click();
    cy.get('.tree-cap').should('have.length', 10);
    cy.get('.tree-toggle').first().focus().type('{leftarrow}');
    cy.get('.tree-node-domain').first().should('have.attr', 'aria-expanded', 'false');
    cy.get('.tree-toggle').first().type('{rightarrow}');
    cy.get('.tree-node-domain').first().should('have.attr', 'aria-expanded', 'true');
    cy.get('.tree-toggle').first().type('{downarrow}');
    cy.focused().should('contain.text', 'CRM-01');
  });

  it('garde l’inventaire visible (sticky) sur grand écran', () => {
    cy.viewport(1280, 800);
    fresh();
    cy.get('#app-inventory').should('have.css', 'position', 'sticky');
    cy.get('.drop').first().invoke('outerHeight').should('be.gte', 30);
  });

  it('reste sans débordement horizontal sur mobile dans l’onglet Relations', () => {
    cy.viewport(402, 874);
    fresh();
    openTree();
    cy.get('html').then(html => { expect(html[0].scrollWidth).to.be.at.most(402); });
    cy.get('.tree-cap').first().should('be.visible');
  });

  it('fonctionne sous le chemin GitHub Pages', () => {
    fresh('/enterprise-capacity-mapper/');
    openTree();
    cy.get('.tree-cap').should('have.length', 10);
  });

  it('en profondeur 1, relie directement les domaines N0 aux applications', () => {
    cy.visit('/');
    cy.contains('button', 'Nouvelle cartographie').click();
    cy.get('[data-testid="depth-1"]').click();
    cy.get('[data-testid="template-blank"]').click();
    cy.get('[data-testid="wizard-name"]').clear().type('Relations niveau 1');
    cy.contains('button', 'Suivant').click();
    cy.contains('button', 'Suivant').click();
    cy.get('[data-testid="wizard-backup"]').uncheck();
    cy.get('[data-testid="wizard-create"]').click();

    cy.get('.cell-add').first().click();
    cy.get('.modal .field input').eq(0).type('Domaine niveau 1');
    cy.get('.modal .field input').eq(1).type('N0-01');
    cy.contains('.modal button', 'Créer').click();
    cy.get('.side-add').click();
    cy.get('.modal .field input').eq(0).type('Application test');
    cy.get('.modal .field input').eq(1).type('APP-TEST');
    cy.get('.modal .field input').eq(2).type('Éditeur test');
    cy.contains('.modal button', 'Créer').click();

    openTree();
    cy.get('.tree-domain').should('contain.text', 'Domaine niveau 1').and('contain.text', 'Gap');
    cy.get('button[aria-label="Relier des applications à Domaine niveau 1"]').click();
    cy.get('[data-testid="link-list"]').contains('label', 'Application test').find('input').check();
    cy.get('[data-testid="link-save"]').click();
    cy.contains('.tree-node-domain', 'Domaine niveau 1').should('contain.text', 'Application test').and('contain.text', 'Couvert');
  });

  it('présente l’onglet Relations avec une hiérarchie visuelle légère sans altérer les actions', () => {
    cy.viewport(1280, 800);
    fresh();
    openTree();

    cy.get('.tree-toolbar')
      .should('have.css', 'background-color', 'rgb(255, 255, 255)')
      .and('have.css', 'border-radius', '12px');
    cy.get('.tree-node-domain').first()
      .should('have.css', 'border-radius', '12px')
      .and('have.css', 'border-top-style', 'solid');
    cy.get('.tree-domain .tree-caret').first()
      .should('be.visible')
      .and('have.css', 'font-size', '19px')
      .and('have.css', 'width', '24px');
    cy.get('.tree-node-cap > .tree-row').first()
      .should('have.css', 'border-radius', '9px')
      .and('have.css', 'background-color', 'rgb(255, 255, 255)');
    cy.get('.tree-actions .tree-link').first().should('be.visible').click();
    cy.get('.modal').should('be.visible');
    cy.get('[data-testid="link-list"]').should('be.visible');
    cy.get('.modal').contains('button', 'Annuler').click();

    cy.viewport(402, 874);
    cy.get('.tree-cap').first().should('be.visible');
    cy.get('html').then(html => { expect(html[0].scrollWidth).to.be.at.most(402); });
  });



  it('garde les onglets et le bouton Ajouter un domaine lisibles en clair et en Dark Linear', () => {
    cy.viewport(1280, 800);
    fresh();

    cy.get('.toolbar-switch')
      .should('have.css', 'background-color', 'rgb(32, 35, 44)');
    cy.get('.toolbar-switch button.active')
      .should('have.css', 'background-color', 'rgb(52, 48, 68)')
      .and('have.css', 'color', 'rgb(231, 221, 255)');
    cy.get('.cell-add')
      .first()
      .should('be.visible')
      .and('have.css', 'background-color', 'rgb(245, 243, 255)')
      .and('have.css', 'color', 'rgb(67, 56, 168)')
      .and('have.css', 'border-top-style', 'dashed');

    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('.toolbar-switch')
      .should('have.css', 'background-color', 'rgb(21, 23, 29)');
    cy.get('.toolbar-switch button.active')
      .should('have.css', 'background-color', 'rgb(52, 42, 81)')
      .and('have.css', 'color', 'rgb(240, 234, 255)');
    cy.get('.cell-add')
      .first()
      .should('have.css', 'background-color', 'rgb(38, 33, 57)')
      .and('have.css', 'color', 'rgb(216, 204, 255)');
  });



  it('assure le contraste du compteur d’inventaire et des surfaces Relations dans les deux thèmes', () => {
    cy.viewport(1280, 800);
    fresh();

    cy.get('.panel-title em')
      .should('be.visible')
      .and('have.css', 'background-color', 'rgb(241, 237, 255)')
      .and('have.css', 'color', 'rgb(67, 56, 168)')
      .and('have.css', 'font-weight', '800');
    openTree();
    cy.get('.tree-domain').first()
      .should('have.css', 'background-color', 'rgb(248, 250, 252)');
    cy.get('.tree-node-cap > .tree-row').first()
      .should('have.css', 'background-color', 'rgb(255, 255, 255)');
    cy.get('.tree-app').first()
      .should('have.css', 'background-color', 'rgb(255, 255, 255)');

    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.panel-title em')
      .should('have.css', 'background-color', 'rgb(52, 42, 81)')
      .and('have.css', 'color', 'rgb(240, 234, 255)');
    cy.get('.tree-domain').first()
      .should('have.css', 'background-color', 'rgb(28, 30, 38)');
    cy.get('.tree-node-cap > .tree-row').first()
      .should('have.css', 'background-color', 'rgb(25, 27, 34)');
    cy.get('.tree-app').first()
      .should('have.css', 'background-color', 'rgb(25, 27, 34)');
    cy.get('.tree-app small').first()
      .should('be.visible')
      .and('have.css', 'color', 'rgb(226, 217, 255)')
      .and('have.css', 'background-color', 'rgb(48, 39, 71)')
      .and('have.css', 'font-weight', '800');

    // Les titres N0/N1 et toutes les commandes doivent rester lisibles sur les surfaces sombres.
    cy.get('.tree-domain .tree-name').first()
      .should('be.visible')
      .and('have.css', 'color', 'rgb(241, 243, 250)');
    cy.get('.tree-node-cap .tree-name').first()
      .should('be.visible')
      .and('have.css', 'color', 'rgb(241, 243, 250)');
    cy.get('.tree-actions .tree-link').first()
      .should('be.visible')
      .and('have.css', 'color', 'rgb(231, 234, 243)')
      .and('have.css', 'background-color', 'rgb(37, 40, 51)');
    cy.get('.tree-bulk button').each($button => {
      cy.wrap($button)
        .should('be.visible')
        .and('have.css', 'color', 'rgb(231, 234, 243)')
        .and('have.css', 'background-color', 'rgb(37, 40, 51)');
    });
  });


  it('active le thème Dark Linear et conserve la préférence après rechargement', () => {
    fresh();
    cy.get('[data-testid="theme-toggle"]').should('contain.text', 'Dark Linear').click();
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="theme-toggle"]').should('have.attr', 'aria-pressed', 'true').and('contain.text', 'Thème clair');
    cy.window().then(win => {
      expect(win.localStorage.getItem('enterprise-capacity-mapper:theme')).to.equal('dark');
    });
    cy.reload();
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="theme-toggle"]').should('contain.text', 'Thème clair').click();
    cy.get('.app').should('not.have.class', 'theme-dark');
    cy.window().then(win => {
      expect(win.localStorage.getItem('enterprise-capacity-mapper:theme')).to.equal('light');
    });
  });

});