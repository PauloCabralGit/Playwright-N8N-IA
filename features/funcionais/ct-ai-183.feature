```gherkin
@CT-AI-183 @Lead @Funcional
Feature: Consult Lead in Commercial Panel
  As a sales team member
  I want to quickly view lead data without leaving the main service flow
  So that I can efficiently handle customer interactions

  Scenario: Search for an existing lead
    Given I am logged into the commercial panel
    When I search for a lead by identifier
    Then the system displays the lead's name, phone, status and origin

  Scenario: Search for a non-existent lead
    Given I am logged into the commercial panel
    When I search for a lead by identifier that does not exist
    Then the interface shows a clear message without breaking the flow
```