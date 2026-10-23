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

  it('expose des tokens sémantiques en thème clair et sombre', () => {
    cy.get('.app').should('not.have.class', 'theme-dark');
    readToken('--color-bg').then(lightBackground => {
      expect(lightBackground, 'background token in light theme').not.to.equal('');
      readToken('--color-text').then(lightText => {
        expect(lightText, 'text token in light theme').not.to.equal('');
        expect(lightBackground).not.to.equal(lightText);
      });
    });

    toggleTheme();
    cy.get('.app').should('have.class', 'theme-dark');
    readToken('--color-bg').should('not.be.empty').then(darkBackground => {
      readToken('--color-text').then(darkText => {
        expect(darkBackground).not.to.equal(darkText);
        expect(darkBackground).not.to.equal('');
      });
      readToken('--color-bg').then(lightOrDarkBackground => {
        expect(lightOrDarkBackground).not.to.equal('');
      });
    });
    cy.get('.app').should($app => {
      expect(getComputedStyle($app[0]).colorScheme).to.equal('dark');
    });
  });

  it('utilise les tokens sémantiques pour les surfaces globales', () => {
    cy.get('.app').should($app => {
      const styles = getComputedStyle($app[0]);
      expect(styles.getPropertyValue('--color-bg').trim()).not.to.equal('');
      expect(styles.backgroundColor).not.to.equal('');
    });
    cy.get('.app aside').should('be.visible').and($aside => {
      expect(getComputedStyle($aside[0]).getPropertyValue('background-color')).not.to.equal('');
    });
  });
});
