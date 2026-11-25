// The CodeMirror editor, kept in its own module so the ~450 kB of editor code is only downloaded when a query box is about to
// be seen (MongoQueryPromptAuto imports this lazily). Everything else on the page works without it.
import {
  EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars,
  drawSelection, highlightActiveLine, keymap,
} from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { javascript } from '@codemirror/lang-javascript'
import { mongoCompletions } from '../utils/mongoUtils'

/** Creates the query editor inside `parent`. `label` names the text field for assistive technology and agents. */
export function createEditor({ parent, doc, label, onRun }) {
  return new EditorView({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      keymap.of([
        { key: 'Mod-Enter', run: () => { onRun(); return true } },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
      ]),
      javascript(),
      // Custom MongoDB autocompletion
      autocompletion({ override: [mongoCompletions], activateOnTyping: true }),
      // The editable area is a text box with no visible <label>: give it a name (accessibility tree, agents)
      EditorView.contentAttributes.of({ 'aria-label': label, 'aria-multiline': 'true' }),
      // Light green selection highlighting
      EditorView.theme({
        '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#d8f0cf !important' },
        '.cm-selectionBackground': { backgroundColor: '#d8f0cf !important' },
      }),
    ],
    parent,
  })
}
