Feature: Lead Lookup in Commercial Panel  
  As a commercial user  
  I want to view lead details efficiently  
  So I can maintain my workflow without interruptions  

  @CT-AI-304 @Funcional  
  Scenario: Successful lead details display for valid identifier  
    Given an authenticated commercial user  
    When searching for a lead with identifier "VALID_LEAD_ID"  
    Then the system should display lead information including:  
      | Field  | Example Value    |  
      | Name   | John Doe         |  
      | Phone  | +5511999999999   |  
      | Status | Qualified        |  
      | Origin | Social Media     |  

  @CT-AI-304 @Funcional  
  Scenario: Clear notification for non-existent lead  
    Given an authenticated commercial user  
    When searching for a lead with identifier "INVALID_LEAD_ID"  
    Then a "No matching records found" message should be displayed  
    And the lead information panel remains in its default state