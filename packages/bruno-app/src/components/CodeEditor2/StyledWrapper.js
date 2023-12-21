import styled from 'styled-components';
import { twi } from 'tw-to-css';

export const StyledWrapper = styled.div`
    .cm-editor {
      ${twi('rounded-lg border')};
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
    .cm-textfield {
       ${twi(
         'flex items-center leading-4 w-1/2 rounded border-0 py-[5px] text-gray-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-gray-400 focus:ring-1 '
       )}
    } 
    .cm-panels {
      ${(props) =>
        twi(
          'm-1 absolute rounded-md !border-[1px] ',
          props.theme.bg === '#fff' ? '!border-zinc-200 bg-white' : '!border-zinc-700 !bg-zinc-900'
        )}
    }
    .cm-search {
      ${twi('flex flex-wrap items-center m-1')}
    }
    .cm-panels button[name="close"] {
      ${(props) =>
        twi(
          'h-4 w-4 flex justify-center items-center !mt-1 rounded-full !border !border-[1px]',
          props.theme.bg === '#fff' ? '!bg-red-100 !text-red-800' : '!bg-red-400/10 !text-red-400 !border-red-400/20'
        )}
    }
    .cm-panels button {
       ${(props) =>
         twi(
           'rounded bg-none border-[1px] px-2 py-1 h-7 text-xs font-base !bg-transparent',
           props.theme.bg === '#fff' ? 'text-zinc-900' : ' text-white'
         )}
    }
    .cm-panels label {
        ${(props) => twi('flex items-center pr-4')}
    }
  `;
