/**
 * LocalStorage utility for conversation management.
 */

const CONVERSATION_ID_KEY = 'current_conversation_id';

/**
 * Get the current conversation ID from localStorage.
 * @returns {string|null} The conversation UUID or null
 */
export const getCurrentConversationId = () => {
  try {
    return localStorage.getItem(CONVERSATION_ID_KEY);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

/**
 * Save the current conversation ID to localStorage.
 * @param {string} conversationId - The conversation UUID
 */
export const setCurrentConversationId = (conversationId) => {
  try {
    if (conversationId) {
      localStorage.setItem(CONVERSATION_ID_KEY, conversationId);
    }
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

/**
 * Remove the current conversation ID from localStorage.
 */
export const clearCurrentConversationId = () => {
  try {
    localStorage.removeItem(CONVERSATION_ID_KEY);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};
