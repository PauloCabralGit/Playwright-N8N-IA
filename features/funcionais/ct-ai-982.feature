```gherkin
@CT-AI-982 @Funcional
Feature: Consult Lead in Commercial Panel
  As a commercial team member
  I want to quickly view lead data without leaving the main attendance flow
  So that I can efficiently handle customer interactions

  Scenario: Search for existing lead by identifier
    Given the user is authenticated
    And is on the commercial panel
    When the user searches for a lead by identifier
    Then the system displays the lead's name
    And the lead's phone number
    And the lead's status
    And the lead's origin

  Scenario: Handle lead not found gracefully
    Given the user is authenticated
    And is on the commercial panel
    When the user searches for a non-existent lead by identifier
    Then the system shows a clear message indicating the lead was not found
    And the interface remains functional without breaking the flow
```