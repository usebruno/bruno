// NOTE: do not import from components/Devtools here — this util is used by the
// eagerly-loaded Sidebar/Hotkeys, and a static import would pull @xterm (~280 kB)
// into the initial bundle.
import { openConsole, setActiveTab } from 'providers/ReduxStore/slices/logs';

/**
 * Opens the devtools console and switches to the terminal tab
 * Optionally opens/switches to a terminal session at a specific CWD
 * @param {Function} dispatch - Redux dispatch function
 * @param {string} [cwd] - Optional CWD path. If provided, checks for existing session at that CWD or creates new one
 */
export const openDevtoolsAndSwitchToTerminal = async (dispatch, cwd = null) => {
  // Open console if closed
  dispatch(openConsole());

  // Switch to terminal tab
  dispatch(setActiveTab('terminal'));

  // If CWD is provided, dispatch event to TerminalTab to handle session selection/creation
  if (cwd) {
    // Small delay to ensure terminal tab is mounted
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('terminal:open-at-cwd', { detail: { cwd } }));
    }, 100);
  }
};
