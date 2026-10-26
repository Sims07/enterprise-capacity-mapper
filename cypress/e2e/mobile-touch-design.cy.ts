describe('Polissage tactile mobile', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('présente des contrôles de navigation suffisamment grands au toucher', () => {
    cy.get('.primary-navigation > [data-testid="nav-cartography"]')
      .should('be.visible')
      .then($button => {
        expect($button[0].getBoundingClientRect().height).to.be.at.least(42);
      });

    cy.get('.primary-navigation > [data-testid="nav-analysis"]')
      .should('be.visible')
      .then($button => {
        expect($button[0].getBoundingClientRect().height).to.be.at.least(42);
      });

    cy.get('.workspace > aside .search')
      .should('be.visible')
      .and('have.css', 'font-size', '16px');
  });

  it('affiche la fenêtre Structure comme une feuille mobile qui reste dans le viewport', () => {
    cy.get('.canvas-actions').contains('Structure').click();

    cy.get('[role="dialog"]').should('be.visible').then($dialog => {
      const dialog = $dialog[0];
      const rect = dialog.getBoundingClientRect();
      const viewport = dialog.ownerDocument.defaultView!;
      const style = getComputedStyle(dialog);

      expect(rect.width, 'dialog width should fit the phone viewport').to.be.closeTo(viewport.innerWidth, 1);
      expect(rect.left, 'dialog should align with the viewport edge').to.be.closeTo(0, 1);
      expect(rect.bottom, 'dialog should stay within the mobile visual viewport, allowing browser chrome rounding').to.be.at.most(viewport.innerHeight + 16);
      expect(rect.top, 'dialog should have a visible portion').to.be.greaterThan(0);
      expect(style.borderTopLeftRadius).to.equal('18px');
    });

    cy.get('[role="dialog"] input').first().should('have.css', 'font-size', '16px');
    cy.document().should(doc => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });

  it('garde les actions de Relations accessibles sans débordement horizontal', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-relations"]').should('be.visible').click();

    cy.get('.coverage-tree').should('be.visible');
    cy.get('.tree-actions').first().should('be.visible').within(() => {
      cy.get('button').each($button => {
        expect($button[0].getBoundingClientRect().height).to.be.at.least(40);
      });
    });

    cy.get('.tree-row').each($row => {
      const row = $row[0];
      expect(row.scrollWidth, 'relation row should not create horizontal overflow').to.be.at.most(row.clientWidth + 1);
    });

    cy.document().should(doc => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });

  it('ouvre le compagnon dans une surface adaptée à la hauteur du téléphone', () => {
    cy.get('.companion-launcher').should('be.visible').click();
    cy.get('.companion-panel').should('be.visible').then($panel => {
      const panel = $panel[0];
      const rect = panel.getBoundingClientRect();
      const viewport = panel.ownerDocument.defaultView!;
      expect(rect.width).to.be.closeTo(viewport.innerWidth, 1);
      expect(rect.top).to.be.at.most(1);
      expect(rect.bottom).to.be.at.most(viewport.innerHeight + 16);
    });
    cy.get('.companion-close').should('be.visible');
  });

  it('préserve une vraie zone de conversation sur les petits écrans', () => {
    cy.viewport(320, 640);
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-panel"]').should('be.visible');

    cy.get('[data-testid="companion-mode-conversation"]').click();
    cy.get('[data-testid="companion-question"]')
      .should('be.visible')
      .and('have.css', 'font-size', '16px')
      .then($input => {
        expect($input[0].getBoundingClientRect().height, 'zone de saisie tactile').to.be.at.least(44);
      });

    cy.get('[data-testid="companion-submit"]').should('be.visible').then($button => {
      expect($button[0].getBoundingClientRect().width, 'bouton d’envoi tactile').to.be.at.least(44);
      expect($button[0].getBoundingClientRect().height, 'bouton d’envoi tactile').to.be.at.least(44);
    });

    cy.get('[data-testid="companion-panel"]').then($panel => {
      const panel = $panel[0];
      const viewport = panel.ownerDocument.defaultView!;
      const rect = panel.getBoundingClientRect();
      expect(rect.left, 'panneau aligné à gauche').to.be.closeTo(0, 1);
      expect(rect.right, 'panneau dans le viewport').to.be.closeTo(viewport.innerWidth, 1);
      expect(rect.height, 'panneau utilisable même sur un petit téléphone').to.be.at.least(600);
    });

    cy.document().should(doc => {
      expect(doc.documentElement.scrollWidth, 'pas de débordement horizontal global')
        .to.be.at.most(doc.documentElement.clientWidth);
    });
  });

});

export {};
