// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Create/edit modal helpers (the list opens a modal, it does not navigate)
Cypress.Commands.add('openCreateSheet', () => {
  cy.get('button').contains('New reminder').should('be.visible').click()
  cy.get('[role="dialog"]').should('be.visible')
})

Cypress.Commands.add('openEditSheet', title => {
  cy.get('article').contains(title).parents('article').within(() => {
    cy.get('button[aria-label="Edit reminder"]').click()
  })
  cy.get('[role="dialog"]').should('be.visible')
})

Cypress.Commands.add('fillSheet', (title, description, limitDate) => {
  cy.get('[role="dialog"]').within(() => {
    cy.get('[data-testid="title"]').clear().type(title)
    cy.get('[data-testid="description"]').clear().type(description)
    cy.get('[data-testid="limitDate"]').clear().type(limitDate)
  })
})

Cypress.Commands.add('saveSheet', () => {
  cy.get('[data-testid="save-button"]').should('be.enabled').click()
})

Cypress.Commands.add('deleteFromSheet', () => {
  cy.get('button').contains('Delete reminder').click()
  cy.contains('Delete this reminder?').should('be.visible')
  cy.get('[data-testid="delete-button"]').click()
})

// API intercept helpers
Cypress.Commands.add('mockRemindersAPI', () => {
  cy.intercept('GET', '**/api/reminders', { 
    statusCode: 200, 
    fixture: 'reminders.json',
    delay: 100
  }).as('getReminders')
  cy.intercept('GET', '**/api/reminders/*', { 
    statusCode: 200, 
    body: {
      "id": "1",
      "title": "Test Reminder 1",
      "description": "This is a test reminder for Cypress testing",
      "limitDate": "2024-12-31T00:00:00.000Z",
      "limitDateFormatted": "2024-12-31",
      "isDone": false,
      "isDoneFormatted": "No"
    }
  }).as('getReminder')
  cy.intercept('POST', '**/api/reminders', { 
    statusCode: 201, 
    body: { 
      id: "999", 
      title: 'New Reminder',
      description: 'Test',
      limitDate: "2024-12-25T00:00:00.000Z",
      limitDateFormatted: "2024-12-25",
      isDone: false,
      isDoneFormatted: "No"
    } 
  }).as('createReminder')
  cy.intercept('PUT', '**/api/reminders/*', { 
    statusCode: 200, 
    body: { 
      id: "1", 
      title: 'Updated Reminder',
      description: 'Updated Description',
      limitDate: "2024-12-31T00:00:00.000Z",
      limitDateFormatted: "2024-12-31",
      isDone: true,
      isDoneFormatted: "Yes"
    } 
  }).as('updateReminder')
  cy.intercept('DELETE', '**/api/reminders/*', { statusCode: 204 }).as('deleteReminder')
})

// Command to wait for app to be ready
Cypress.Commands.add('waitForAppReady', () => {
  cy.get('main', { timeout: 15000 }).should('be.visible')
  cy.get('button').contains('New reminder', { timeout: 10000 }).should('be.visible')
})
