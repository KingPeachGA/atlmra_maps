/**
 * Calculates the number of days since a given date.
 * If the date is in the future, it returns a negative number.
 *
 * @param {string} dateString - The start date in "YYYY-MM-DD" format.
 * @returns {number} The number of days that have passed.
 */
function calculateDaysSince(dateString) {
  const startDate = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

  const differenceInTime = today.getTime() - startDate.getTime();
  const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));

  return differenceInDays;
}

/**
 * Counts the number of unique states with a "visited" status.
 *
 * @param {Array<object>} visitedStatesData - The array of state data objects.
 * @returns {number} The count of visited states.
 */
function countVisitedStates(visitedStatesData) {
  if (!visitedStatesData) {
    return 0;
  }
  // This is the updated line: it now checks the correct column.
  return visitedStatesData.filter(state => state.visited_status === 'true').length;
}

/**
 * Updates the text content of a DOM element.
 *
 * @param {string} elementId - The ID of the element to update.
 * @param {string} text - The new text content.
 */
function updateElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  } else {
    console.warn(`Element with ID "${elementId}" not found.`);
  }
}

/**
 * Main function to update all sidebar cards.
 * It's exposed globally so it can be called from other scripts.
 *
 * @param {Array<object>} [statesData=window.visitedStatesData] - The states data array.
 */
window.updateSidebarCards = function(statesData = window.visitedStatesData) {
  // Update "Days Since" Card
  const daysSince = calculateDaysSince('2025-02-05');
  updateElementText('days-since-counter', daysSince);

  // Update "States Visited" Card
  const visitedCount = countVisitedStates(statesData);
  updateElementText('states-visited-counter', visitedCount);
};