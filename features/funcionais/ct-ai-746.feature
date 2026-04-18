```feature
@CT-AI-746 @Funcional
Feature: Lead Information Display
  As a commercial user
  I want to view lead details
  So I can quickly access customer information during interactions

  Scenario: View lead details in commercial panel
    Given an authenticated commercial user
    When the user searches for a lead with identifier "<identifier>"
    Then the system displays the lead information including:
      | Field  | Value    |
      | Name   | <name>   |
      | Phone  | <phone>  |
      | Status | <status> |
      | Origin | <origin> |

  Scenario: Valid lead identifier
    Given an authenticated commercial user
    When searching for an existing lead
    Then the lead details panel appears with complete information

  Scenario: Non-existent lead handling
    Given an authenticated commercial user
    When searching for lead identifier "INVALID_123"
    Then the system displays "No lead found" notification
    And maintains the commercial workflow stability
```