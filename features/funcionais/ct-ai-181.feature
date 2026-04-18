```gherkin
@CT-AI-181 @Funcional
Feature: User Authentication
  As a registered user
  I want to securely authenticate
  So I can access protected system features

  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When the user submits valid credentials:
      | username | password |
      | testuser | ValidPass123! |
    Then the user should be redirected to the dashboard
    And the user session should be recorded in the system
```