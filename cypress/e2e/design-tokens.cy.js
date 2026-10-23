describe('Fondations du design system CSS', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  const readToken = (name) => cy.document().then(document => {
    const app = document.querySelector('.app');
    expect(app, 'application root').to.exist;
    return getComputedStyle(app).getPropertyValue(name).trim();
  });

  const toggleTheme = () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
  };

  it('change les tokens sémantiques selon le thème actif', () => {
    cy.get('.app').should('not.have.class', 'theme-dark');
    readToken('--color-bg').then(lightBackground => {
      expect(lightBackground, 'light background token').not.to.equal('');
      readToken('--color-text').then(lightText => {
        expect(lightText, 'light text token').not.to.equal('');
        expect(lightBackground).not.to.equal(lightText);

        toggleTheme();
        cy.get('.app').should('have.class', 'theme-dark').then($app => {
          const styles = getComputedStyle($app[0]);
          expect(styles.colorScheme).to.equal('dark');
          const darkBackground = styles.getPropertyValue('--color-bg').trim();
          const darkText = styles.getPropertyValue('--color-text').trim();
          expect(darkBackground, 'dark background token').not.to.equal('');
          expect(darkText, 'dark text token').not.to.equal('');
          expect(darkBackground).not.to.equal(lightBackground);
          expect(darkText).not.to.equal(lightText);
        });
      });
    });
  });

  it('expose les tokens de surface sur la racine et les panneaux', () => {
    cy.get('.app').should($app => {
      const styles = getComputedStyle($app[0]);
      expect(styles.getPropertyValue('--color-bg').trim()).not.to.equal('');
      expect(styles.getPropertyValue('--color-surface').trim()).not.to.equal('');
      expect(styles.backgroundColor).not.to.equal('');
    });
    cy.get('.app aside').should('be.visible').and($aside => {
      expect(getComputedStyle($aside[0]).backgroundColor).not.to.equal('');
    });
  });
});
