```feature
Feature: Lead Lookup in Commercial Panel
  As a commercial user
  I want to quickly view lead details
  So I can maintain workflow efficiency

  @DEL-201 @Funcional
  Scenario: View lead details with valid identifier
    Given an authenticated commercial user
    When they search for a lead with identifier "valid_lead_id"
    Then the lead details panel should display:
      | name   |
      | phone  |
      | status |
      | origin |

  @DEL-201 @Funcional
  Scenario: Handle non-existent lead lookup
    Given an authenticated commercial user
    When they search for a lead with identifier "invalid_lead_id"
    Then a clear error message should be displayed
    And the lead details panel remains empty
```