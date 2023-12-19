import styled from 'styled-components';
import { twi } from 'tw-to-css';

export const StyledWrapper = styled.div`
    .cm-editor {
      ${twi('rounded-md border')};
      ${(props) => (props.theme.bg === '#fff' ? twi('bg-white border-zinc-200') : twi('bg-zinc-900 border-zinc-700'))}};
    };
    .cm-focused {
      ${(props) =>
        twi(
          'outline-2',
          props.theme.bg === '#fff' ? 'outline outline-zinc-100 rounded-md' : 'outline outline-zinc-600 rounded-md'
        )}
    }
    .cm-gutters {
      ${(props) => twi('rounded-l-md px-4', props.theme.bg === '#fff' ? 'bg-zinc-100' : 'bg-zinc-800')}
    }
    .cm-lineNumbers .cm-gutterElement {
      ${twi('font-medium')}
    }
    .cm-foldGutter .cm-gutterElement {
      ${twi('pl-1')};
    }
    .cm-foldGutter .cm-gutterElement span {
      ${(props) => twi('pr-1', props.theme.bg === '#fff' ? 'text-red-500' : 'text-indigo-500')}
    }
    .cm-lineNumbers .cm-activeLineGutter {
      ${(props) => twi('rounded-l-md', props.theme.bg === '#fff' ? 'bg-zinc-200' : 'bg-zinc-600')}
    }
    .cm-foldGutter .cm-activeLineGutter {
      ${(props) => twi('rounded-r-md', props.theme.bg === '#fff' ? 'bg-zinc-200' : 'bg-zinc-600')}
    }
  `;
