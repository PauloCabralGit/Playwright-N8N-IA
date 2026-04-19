Feature: Lead lookup in commercial panel
  As a sales team member
  I want to quickly view lead data without leaving the main service flow
  So that I can efficiently handle customer interactions

  @CT-AI-184 @functional @happy-path
  Scenario: Successfully retrieve lead information by identifier
    Given I am authenticated in the commercial panel
    And a lead with identifier "12345" exists in the system
    When I search for the lead using identifier "12345"
    Then the system displays the lead's information including:
      | Field    | Value               |
      | Name     | John Doe            |
      | Phone    | (11) 98765-4321     |
      | Status   | New                 |
      | Origin   | Website             |

  @CT-AI-184 @functional @negative-path
  Scenario: Handle non-existent lead lookup gracefully
    Given I am authenticated in the commercial panel
    And no lead exists with identifier "99999"
    When I search for the lead using identifier "99999"
    Then the system displays a clear message indicating the lead was not found
    And the commercial panel flow remains uninterrupted