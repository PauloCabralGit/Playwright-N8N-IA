@CT-AI-142 @Lead @Funcional
Feature: Consult Lead in Commercial Panel
  As a commercial team member
  I want to quickly view lead data without leaving the main service flow
  So that I can efficiently handle customer interactions

  Scenario: Search for existing lead by identifier
    Given I am authenticated in the commercial panel
    And I have a valid lead identifier
    When I search for the lead by identifier
    Then the system should display the lead's name
    And the system should display the lead's phone
    And the system should display the lead's status
    And the system should display the lead's origin

  Scenario: Search for non-existent lead
    Given I am authenticated in the commercial panel
    And I have an invalid lead identifier
    When I search for the lead by identifier
    Then the system should display a clear message indicating the lead was not found
    And the interface should remain functional