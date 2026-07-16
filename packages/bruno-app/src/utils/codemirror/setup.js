/**
 * CodeMirror setup — modes, addons, themes.
 *
 * This module is imported by CodeEditor so it only loads when an editor first
 * mounts, not at app startup. Keeping it here (rather than in Bruno/index.js)
 * means it stays out of the initial bundle and doesn't block first paint.
 */

// Base + Themes
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/theme/monokai.css';

// Addon CSS
import 'codemirror/addon/dialog/dialog.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/addon/scroll/simplescrollbars.css';

// Modes
require('codemirror/mode/javascript/javascript');
require('codemirror/mode/xml/xml');
require('codemirror/mode/css/css');
require('codemirror/mode/htmlmixed/htmlmixed');
require('codemirror/mode/sparql/sparql');

// Addons
require('codemirror/addon/comment/comment');
require('codemirror/addon/dialog/dialog');
require('codemirror/addon/edit/closebrackets');
require('codemirror/addon/edit/matchbrackets');
require('codemirror/addon/fold/brace-fold');
require('codemirror/addon/fold/foldgutter');
require('codemirror/addon/fold/xml-fold');
require('codemirror/addon/hint/javascript-hint');
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/lint/lint');
require('codemirror/addon/lint/json-lint');
require('codemirror/addon/mode/overlay');
require('codemirror/addon/scroll/simplescrollbars');
require('codemirror/addon/search/jump-to-line');
require('codemirror/addon/search/search');
require('codemirror/addon/search/searchcursor');
require('codemirror/addon/display/placeholder');
require('codemirror/keymap/sublime');

// GraphQL
require('codemirror-graphql/hint');
require('codemirror-graphql/info');
require('codemirror-graphql/jump');
require('codemirror-graphql/lint');
require('codemirror-graphql/mode');

// Bruno-specific utilities
require('utils/codemirror/brunoVarInfo');
require('utils/codemirror/javascript-lint');
require('utils/codemirror/autocomplete');
