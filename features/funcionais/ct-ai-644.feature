```gherkin
@CT-AI-644 @Funcional
Feature: Lead Lookup in Commercial Panel
  As a sales team member
  I want to view lead details quickly
  To maintain workflow efficiency during customer interactions

  Scenario: Valid lead details display
    Given an authenticated user on the commercial panel
    When the user searches for a lead with identifier "<valid_identifier>"
    Then the system displays the lead details including:
      | Field   | Example Value  |
      | Name    | John Doe       |
      | Phone   | +5511987654321 |
      | Status  | New            |
      | Origin  | Website        |

  Scenario: Non-existent lead handling
    Given an authenticated user on the commercial panel
    When the user searches for a lead with identifier "<invalid_identifier>"
    Then the system displays a clear "Lead not found" message
    And maintains the current workflow context
```