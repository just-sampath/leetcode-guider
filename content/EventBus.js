/**
 * EventBus - Simple pub/sub for component communication
 * 
 * SOLID: Single Responsibility - only handles event communication
 */

const EventBus = (function () {
    const listeners = {};

    return {
        /**
         * Subscribe to an event
         * @param {string} event
         * @param {Function} callback
         * @returns {Function} Unsubscribe function
         */
        on(event, callback) {
            if (!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(callback);

            // Return unsubscribe function
            return () => {
                listeners[event] = listeners[event].filter(cb => cb !== callback);
            };
        },

        /**
         * Emit an event
         * @param {string} event
         * @param {*} data
         */
        emit(event, data) {
            if (listeners[event]) {
                listeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`[EventBus] Error in listener for ${event}:`, error);
                    }
                });
            }
        },

        /**
         * Subscribe to an event once
         * @param {string} event
         * @param {Function} callback
         */
        once(event, callback) {
            const unsubscribe = this.on(event, (data) => {
                unsubscribe();
                callback(data);
            });
        },

        /**
         * Remove all listeners for an event
         * @param {string} event
         */
        off(event) {
            delete listeners[event];
        }
    };
})();

// Event constants
const EVENTS = {
    PROBLEM_CONTEXT_UPDATED: 'problem_context_updated',
    CODE_UPDATED: 'code_updated',
    RUN_RESULT_UPDATED: 'run_result_updated',
    AI_RESPONSE_RECEIVED: 'ai_response_received',
    AI_REQUEST_STARTED: 'ai_request_started',
    AI_REQUEST_ERROR: 'ai_request_error',
    PANEL_TOGGLE: 'panel_toggle',
    SETTINGS_UPDATED: 'settings_updated'
};

// Make available globally for content scripts
window.EventBus = EventBus;
window.EVENTS = EVENTS;
