Feature: General Functional Test

  This feature covers the basic functional test scenario for the application.

  @CT-FUNC-26 @Funcional
  Scenario: Verify test functionality
    Given the application is launched and the user is on the main page
    When the user performs the test action
    Then the expected result is displayed on the screen