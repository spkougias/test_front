describe('Deliverable 2: User Flows (Frontend Only)', () => {
  
  beforeEach(() => {
    // --- 1. GLOBAL MOCKS (Applies to all tests) ---
    
    // Mock: Recommended Events (Home Page)
    cy.intercept('GET', '**/event/recommended/*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 101,
            name: "Summer Disco Night",
            description: "The biggest disco party.",
            category: ["Party"],
            date: "2025-07-15T20:00:00.000Z",
            price: 15
          }
        ]
      }
    }).as('getEvents');

    // Mock: Details for standard event (ID 101)
    cy.intercept('GET', '**/event/101', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 101,
          name: "Summer Disco Night",
          date: "2025-07-15T20:00:00.000Z",
          price: 15,
          location: [40.6, 22.9],
          description: "The biggest disco party.",
          category: ["Party"],
          ageGroup: ["Adults"],
          host: "u1",
          interestedIn: [],
          vouchers: [],
          commentsData: []
        }
      }
    }).as('getEventDetails');

    // --- 2. SMOKE TEST (Runs before every flow) ---
    cy.visit('/');

    // Verify key elements exist
    cy.get('[data-testid="BeThere-Title"]').should('exist');
    cy.get('[data-testid="Hello-User"]').should('contain.text', 'Welcome back');
    cy.get('[data-testid="Button-To-CreateEvent"]').should('be.visible');
    cy.get('[data-testid="Button-To-Search"]').should('be.visible');
  });


  // --- FLOW 1: Happy Path (Host Flow) ---
  it('Flow 1 (Happy): User creates an event, searches for it, and views it', () => {
    
    // Mock: Create Event
    cy.intercept('POST', '**/event', {
      statusCode: 201,
      body: { success: true, message: "Event created" }
    }).as('createEvent');

    // Mock: Search for the NEW event
    // FIX: Using * wildcard ensures we catch "My%20Awesome%20Party"
    cy.intercept('GET', '**/search*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          users: [],
          events: [
            {
              id: 99, // Fake ID for the new event
              name: "My Awesome Party",
              description: "This is a test description.",
              category: ["Party"],
              date: "2025-12-25T20:00",
              price: 20
            }
          ]
        }
      }
    }).as('searchNewEvent');

    // Mock: Details for the NEW event (ID 99)
    cy.intercept('GET', '**/event/99', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 99,
          name: "My Awesome Party",
          date: "2025-12-25T20:00",
          price: 20,
          location: [40.6, 22.9],
          description: "This is a test description.",
          category: ["Party"],
          ageGroup: ["Adults"],
          host: "u1",
          interestedIn: [],
          vouchers: [],
          commentsData: []
        }
      }
    }).as('getNewEventDetails');

    // 1. Navigate to Create (Already on Home from beforeEach)
    cy.get('[data-testid="Button-To-CreateEvent"]').click();

    // 2. Fill Form
    cy.get('input[placeholder="Insert Name..."]').type('My Awesome Party');
    cy.get('input[type="datetime-local"]').type('2025-12-25T20:00');
    cy.get('input[type="number"]').type('20');
    cy.get('textarea[placeholder="Insert Description..."]').type('This is a test description.');
    cy.get('input[placeholder="40.6, 22.9"]').type('40.6, 22.9');

    // 3. Select Options
    cy.contains('button', 'Party').click(); 
    cy.contains('button', 'Adults').click(); 

    // 4. Submit
    cy.contains('button', 'Done').click();
    cy.wait('@createEvent'); 

    // 5. Navigate to Search Page
    cy.get('[data-testid="Button-To-Search"]').click();
    
    // 6. Type Name and Press ENTER
    cy.get('input[placeholder="Search"]').type('My Awesome Party{enter}');

    // 7. Click result (Target heading to avoid clicking input)
    cy.wait('@searchNewEvent'); // Ensure search results are loaded
    cy.contains('h4', 'My Awesome Party').should('be.visible').click();

    // 8. Verify Event Details page loaded
    cy.wait('@getNewEventDetails'); // Ensure details are loaded
    cy.contains('My Awesome Party').should('be.visible');
    cy.contains('This is a test description.').should('be.visible');
  });


  // --- FLOW 2: Happy Path (Guest/Search Flow) ---
  it('Flow 2 (Happy): User searches for a user and follows them', () => {
    
    // Mock: Search for "giannis"
    // FIX: Using * wildcard
    cy.intercept('GET', '**/search*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          events: [],
          users: [
            { username: "giannis", name: "Papadopoulos Giannis" }
          ]
        }
      }
    }).as('searchQuery');

    // Mock: User Profile
    cy.intercept('GET', '**/user/giannis', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: "u2",
          username: "giannis",
          name: "Papadopoulos Giannis",
          followers: [],
          following: []
        }
      }
    }).as('getUserProfile');

    // Mock: Follow Action
    cy.intercept('PUT', '**/user/giannis/follow', {
      statusCode: 200,
      body: { success: true }
    }).as('followUser');

    // 1. Navigate to Search
    cy.get('[data-testid="Button-To-Search"]').click();

    // 2. Type Name and Press ENTER
    cy.get('input[placeholder="Search"]').type('giannis{enter}');
    
    // 3. Click User
    cy.wait('@searchQuery');
    cy.contains('h4', 'Papadopoulos Giannis').should('be.visible').click();

    // 4. Verify Profile and Follow
    cy.wait('@getUserProfile');
    cy.contains("Papadopoulos Giannis's Profile").should('be.visible');

    cy.contains('button', 'Follow +').click();
    cy.wait('@followUser');
    cy.contains('button', 'Following ✓').should('be.visible');
  });


  // --- FLOW 3: Unhappy Path (Validation Error) ---
  it('Flow 3 (Unhappy): User tries to create event without required fields', () => {
    // 1. Navigate to Create
    cy.get('[data-testid="Button-To-CreateEvent"]').click();

    // 2. Deselect defaults to trigger validation error
    cy.contains('button', 'Other').click();     
    cy.contains('button', 'Everyone').click();  

    // 3. Fill ONLY the name
    cy.get('input[placeholder="Insert Name..."]').type('Incomplete Event');

    // 4. Spy on alert
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    // 5. Click Done
    cy.contains('button', 'Done').click();

    // 6. Assert Alert
    cy.wrap(alertStub).should(() => {
      expect(alertStub).to.have.been.calledWith('You must select at least one Category and one Age Group.');
    });

    // 7. Verify we remain on the form
    cy.contains('New Event').should('be.visible');
  });

  // --- FLOW 4: Happy Path (Comment on Event) ---
  it('Flow 4 (Happy): User posts a comment on an event', () => {
    // 1. Mock Post Comment
    cy.intercept('POST', '**/comment', {
      statusCode: 201,
      body: { success: true, message: "Comment added" }
    }).as('postComment');

    // 2. Mock Reload (Event WITH new comment)
    cy.intercept('GET', '**/event/101', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 101,
          name: "Summer Disco Night",
          date: "2025-07-15T20:00:00.000Z",
          price: 15,
          location: [40.6, 22.9],
          description: "The biggest disco party.",
          category: ["Party"],
          ageGroup: ["Adults"],
          host: "u1",
          interestedIn: [],
          vouchers: [],
          commentsData: [{
             _id: "c1", 
             text: "Cant wait for this!", 
             poster: "u1", 
             isPinned: false 
          }]
        }
      }
    }).as('getEventWithComment');

    cy.visit('/');
    cy.contains('Summer Disco Night').click();

    // 3. Open Comment Window
    // FIX: Target the first button in the absolute header (The Message Icon)
    cy.get('.absolute.top-6 button').first().click();
    
    // 4. Verify Window Open
    cy.contains('Write a Comment!').should('be.visible');

    // 5. Type and Post
    cy.get('textarea[placeholder="Your comment..."]').type('Cant wait for this!');
    cy.contains('button', 'Post').click();

    cy.wait('@postComment');

    // 6. Verify New Comment Appears
    cy.wait('@getEventWithComment');
    cy.contains('Cant wait for this!').should('be.visible');
  });


  // --- FLOW 5: Happy Path (Vouch & Unvouch Event) ---
  it('Flow 5 (Happy): User vouches for an event and then unvouches it', () => {
    // 1. Mock Toggle Vouch
    cy.intercept('PUT', '**/vouch', {
      statusCode: 200,
      body: { success: true, message: "Toggled Vouch Status" }
    }).as('toggleVouch');

    // 2. Mock State: VOUCHED (User added to vouchers)
    cy.intercept('GET', '**/event/101', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 101,
          name: "Summer Disco Night",
          date: "2025-07-15T20:00:00.000Z",
          price: 15,
          location: [40.6, 22.9],
          description: "The biggest disco party.",
          category: ["Party"],
          ageGroup: ["Adults"],
          host: "u1",
          interestedIn: [],
          vouchers: ["u1"], // User Added
          commentsData: []
        }
      }
    }).as('getVouchedEvent');

    cy.visit('/');
    cy.contains('Summer Disco Night').click();

    // 3. Open Options Menu
    // FIX: Target the last button in the absolute header (The 3 Dots Icon)
    cy.get('.absolute.top-6 button').last().click();
    
    // 4. Click Vouch
    cy.contains('button', 'Vouch').should('be.visible').click();
    cy.wait('@toggleVouch');

    // 5. Verify status changed to "Vouched"
    cy.wait('@getVouchedEvent');
    cy.get('.absolute.top-6 button').last().click(); // Reopen menu
    cy.contains('button', 'Vouched').should('be.visible');

    // --- UNVOUCH STEP ---

    // 6. Mock State: UNVOUCHED (User removed)
    cy.intercept('GET', '**/event/101', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 101,
          name: "Summer Disco Night",
          date: "2025-07-15T20:00:00.000Z",
          price: 15,
          location: [40.6, 22.9],
          description: "The biggest disco party.",
          category: ["Party"],
          ageGroup: ["Adults"],
          host: "u1",
          interestedIn: [],
          vouchers: [], // User Removed
          commentsData: []
        }
      }
    }).as('getUnvouchedEvent');

    // 7. Click Vouched (to unvouch)
    cy.contains('button', 'Vouched').click();
    cy.wait('@toggleVouch');

    // 8. Verify status changed back to "Vouch"
    cy.wait('@getUnvouchedEvent');
    cy.get('.absolute.top-6 button').last().click(); // Reopen menu
    cy.contains('button', 'Vouch').should('be.visible');
  });


  // --- FLOW 6: Unhappy Path (Empty Comment) ---
  it('Flow 6 (Unhappy): User tries to post an empty comment', () => {
    // Note: We do NOT need to mock a network error here because the frontend 
    // detects the empty string and alerts BEFORE sending a request.
    // We removed cy.wait() here to avoid timeout.

    cy.visit('/');
    cy.contains('Summer Disco Night').click();

    // 2. Open Comment Window
    // FIX: Target the first button in the absolute header
    cy.get('.absolute.top-6 button').first().click();

    // 3. Spy on Alert
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    // 4. Click Post (Empty)
    cy.contains('button', 'Post').click();

    // 5. Assert Alert (Frontend Validation)
    cy.wrap(alertStub).should(() => {
      expect(alertStub).to.have.been.calledWith('Comment text is required');
    });

    // 6. Verify Window Still Open
    cy.contains('Write a Comment!').should('be.visible');
  });

  // --- FLOW 7: Happy Path (Host Flow - Edit) ---
  it('Flow 7 (Happy): Event gets edited by its Host', () => {
    
    // 1. Mock the PUT request for ID 101
    cy.intercept('PUT', '**/event/101*', { 
      statusCode: 200,
      body: { success: true, message: "Event Updated" }
    }).as('updateEvent');

    // 2. Mock the Search result for the NEW name
    cy.intercept('GET', '**/search*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          users: [],
          events: [
            {
              id: 101, // Keep ID consistent
              name: "Winter Gala Extravaganza",
              description: "The most fun summer party ever",
              category: ["Party"],
              date: "2026-12-30T19:00",
              price: 20
            }
          ]
        }
      }
    }).as('searchEditedEvent');

    // 3. Mock the Details for the edited event
    cy.intercept('GET', '**/event/101', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 101,
          name: "Winter Gala Extravaganza",
          date: "2026-12-30T19:00",
          price: 20,
          location: [40.6, 22.9],
          description: "The most fun summer party ever",
          category: ["Party"],
          ageGroup: ["Adults"],
          host: "u1",
          interestedIn: [],
          vouchers: [],
          commentsData: []
        }
      }
    }).as('getEditedEventDetails');

    cy.visit('/');
    cy.contains('Summer Disco Night').click();

    // Ideally replace this with data-testid="Button-Options"
    cy.get('.absolute.top-6 button').last().click(); 

    cy.contains('button', 'Edit Event').should('be.visible').click();

    // Fill Form
    cy.get('input[placeholder="Insert Name..."]').clear().type('Winter Gala Extravaganza');
    cy.get('input[type="datetime-local"]').clear().type('2026-12-30T19:00');
    cy.get('textarea[placeholder="Insert Description..."]').clear().type('The most fun summer party ever');

    cy.contains('button', 'Done').click();
    cy.wait('@updateEvent');

    // Verify Search
    cy.visit('/');
    cy.get('[data-testid="Button-To-Search"]').click();
    cy.get('input[placeholder="Search"]').type('Winter Gala Extravaganza{enter}');

    cy.wait('@searchEditedEvent');
    cy.contains('h4', 'Winter Gala Extravaganza').should('be.visible').click();

    cy.wait('@getEditedEventDetails');
    cy.contains('Winter Gala Extravaganza').should('be.visible');
    cy.contains('The most fun summer party ever').should('be.visible');
  });

  // --- FLOW 8: Admin Path (Ban User) ---
  it('Flow 8 (Admin): Admin searches for a user and bans them', () => {
    // 1. Mock Search (Finding 'giannis')
    cy.intercept('GET', '**/search*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          events: [],
          users: [
            { username: "giannis", name: "Papadopoulos Giannis" }
          ]
        }
      }
    }).as('searchUser');

    // 2. Mock User Profile (Giannis)
    cy.intercept('GET', '**/user/giannis', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: "u2",
          username: "giannis",
          name: "Papadopoulos Giannis",
          followers: [],
          following: []
        }
      }
    }).as('getUserProfile');

    // 3. Mock Ban Action
    cy.intercept('PUT', '**/user/giannis/ban', {
      statusCode: 200,
      body: { success: true, message: "User banned" }
    }).as('banUser');

    // 4. Navigate to Search
    cy.visit('/');
    cy.get('[data-testid="Button-To-Search"]').click();

    // 5. Search for Giannis
    cy.get('input[placeholder="Search"]').type('giannis{enter}');
    cy.wait('@searchUser');

    // 6. Click on the User Result
    // Use 'h4' to ensure we click the card title, not the input box
    cy.contains('h4', 'Papadopoulos Giannis').click();
    cy.wait('@getUserProfile');

    // 7. Verify Admin Buttons are Visible
    // (Since the default logged-in user 'spyros' is an Admin, these buttons should appear)
    cy.contains('button', 'Restrict').should('be.visible');
    cy.contains('button', 'Ban').should('be.visible');

    // 8. Spy on the Alert (Your app shows an alert on success)
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    // 9. Click Ban
    cy.contains('button', 'Ban').click();

    // 10. Verify API Call and Alert
    cy.wait('@banUser');
    cy.wrap(alertStub).should(() => {
      expect(alertStub).to.have.been.calledWith('ban successful!');
    });
  });
});