```gherkin
@DEL-202 @Funcional
Feature: Campaign list performance under high volume
  As a user with high operational volume
  I want the campaign list to perform efficiently
  So I can work without interface disruptions

  Scenario: Load and sort campaigns with high volume data
    Given the system contains more than 10,000 active campaigns
    When I access the campaign listing page
    Then the list should load within 2 seconds
    
    When I sort the campaign list by "Creation Date"
    Then the sorting operation should complete within 1 second
    And the interface remains responsive during interaction
```