// Mobile layout under 760px (CSS media query): filter chips row in the
// sticky header, compressed progress strip, FAB, single column list.
describe('Reminders List (mobile)', () => {
  beforeEach(() => {
    cy.viewport(375, 667)
    cy.mockRemindersAPI()
    cy.visit('/')

    // waitForAppReady expects the desktop New reminder button, which is
    // hidden under 760px, so wait on the data instead.
    cy.get('main', { timeout: 15000 }).should('be.visible')
    cy.wait('@getReminders')
    cy.get('article').should('have.length', 3)
  })

  it('swaps the desktop shell for chips, strip and FAB', { tags: '@mobile' }, () => {
    // Sidebar and the desktop New reminder button are hidden
    cy.get('aside').should('not.be.visible')
    cy.contains('header button', 'New reminder').should('not.be.visible')

    // Filter chips row inside the sticky header, All active by default
    cy.get('header').within(() => {
      cy.contains('button', 'All')
        .should('be.visible')
        .and('have.attr', 'aria-current', 'true')
      cy.contains('button', 'Today').should('be.visible')
      cy.contains('button', 'Upcoming').should('be.visible')
      cy.contains('button', 'Done').should('be.visible').and('contain', '1')
    })

    // Compressed progress strip: 3 fixtures due in the past, 1 done, 2 overdue
    cy.contains('33%').should('be.visible')
    cy.contains('2 reminders are overdue').should('be.visible')

    // FAB bottom-right
    cy.get('button[aria-label="New reminder"]')
      .should('be.visible')
      .and('contain', 'New')
  })

  it('filters the list from the chips', { tags: '@mobile' }, () => {
    cy.contains('header button', 'Done').click()

    cy.contains('header button', 'Done').should(
      'have.attr',
      'aria-current',
      'true'
    )
    cy.get('article').should('have.length', 1)
    cy.contains('article', 'Test Reminder 2').should('be.visible')

    // Chip counts stay unfiltered
    cy.contains('header button', 'All').should('contain', '3')
  })

  it('opens the create sheet from the FAB', { tags: '@mobile' }, () => {
    cy.get('button[aria-label="New reminder"]').click()

    cy.get('[role="dialog"]').should('be.visible').within(() => {
      cy.contains('New reminder').should('be.visible')
      cy.contains('Create reminder').should('be.visible')
    })
  })
})
