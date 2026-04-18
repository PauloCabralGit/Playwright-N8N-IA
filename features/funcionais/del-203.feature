```feature
Feature: User Authentication
  As a registered user
  I want to securely authenticate
  So I can access protected system features

  @DEL-203 @Funcional
  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When they enter valid credentials and submit the form
    Then they should be redirected to the dashboard
    And the user session should be recorded in the system
```