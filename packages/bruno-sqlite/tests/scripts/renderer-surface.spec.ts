import { statementTypes } from '../../src/generated/web/statements';
import { statements } from '../../src/generated/node/statements';

// `:main` is opt-out, so a new statement reaches the renderer unless someone remembers the flag.
// Pinning both sets here turns that silent grant into a failing test.
const MAIN_ONLY: string[] = [];

const RENDERER_CALLABLE = [
  'delete_runner_responses_for_collection',
  'file_index_clear',
  'file_index_clear_collection',
  'file_index_content_for_collection',
  'file_index_delete_entry',
  'file_index_metadata_for_collection',
  'file_index_size',
  'file_index_upsert',
  'get_runner_response',
  'upsert_runner_response'
];

describe('main-only statements', () => {
  it('stay off the renderer while remaining registered on the main side', () => {
    for (const name of MAIN_ONLY) {
      expect(statementTypes).not.toHaveProperty(name);

      const def = statements.find((statement) => statement.name === name);
      expect(def).toBeDefined();
      expect(def!.main).toBe(true);
    }
  });
});

describe('generated statement surface', () => {
  it('exposes exactly the renderer-callable statements to the web artifact', () => {
    expect(Object.keys(statementTypes).sort()).toEqual([...RENDERER_CALLABLE].sort());
  });

  it('accounts for every generated statement in one of the two sets', () => {
    const generated = statements.map((statement) => statement.name).sort();

    expect(generated).toEqual([...MAIN_ONLY, ...RENDERER_CALLABLE].sort());
  });
});
