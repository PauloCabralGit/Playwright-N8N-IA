@CT-AI-596 @lead @functional
Feature: Consult Lead in Commercial Panel

  As a commercial team member
  As a commercial team member
  I want to quickly view lead information without leaving the main service flow
  So that I can efficiently access lead data during customer interactions

  Scenario: Search for an existing lead by identifier
    Given I am logged into the commercial panel
    And I have a valid lead identifier
    When I search for the lead by identifier
    Then the system should display the lead's name
    And the system should display the lead's phone number
    And the system should display the lead's status
    And the system should display the lead's origin

  Scenario: Search for a non-existent lead by identifier
    Given I am logged into the commercial panel
    And I have an invalid lead identifier
    When I search for the lead by identifier
    Then the system should display a clear message indicating the lead was not found
    And the commercial panel should remain functional