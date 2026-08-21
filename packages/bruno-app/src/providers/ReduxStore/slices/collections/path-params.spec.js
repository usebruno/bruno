jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import reducer, { updatePathParam, setPathParams, requestUrlChanged } from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'item-1';
const URL = '{{baseUrl}}/v1/images/:kind';

const makeState = (params) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      items: [
        {
          uid: ITEM_UID,
          type: 'http-request',
          name: 'Upload image',
          request: { url: URL, method: 'PUT', params }
        }
      ],
      environments: []
    }
  ]
});

const pathParamsOf = (state) => state.collections[0].items[0].draft.request.params.filter((p) => p.type === 'path');

const candidates = () => [
  { uid: 'p1', name: 'kind', value: 'Logo', type: 'path', enabled: true },
  { uid: 'p2', name: 'kind', value: 'Signature', type: 'path', enabled: false }
];

describe('path params with several candidate values per name', () => {
  it('updatePathParam disables the sibling sharing the enabled row name', () => {
    const state = reducer(
      makeState(candidates()),
      updatePathParam({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        pathParam: { uid: 'p2', name: 'kind', value: 'Signature', enabled: true }
      })
    );

    expect(pathParamsOf(state).map((p) => [p.uid, p.enabled])).toEqual([
      ['p1', false],
      ['p2', true]
    ]);
  });

  it('updatePathParam leaves a different name untouched', () => {
    const params = [...candidates(), { uid: 'p3', name: 'id', value: '7', type: 'path', enabled: true }];

    const state = reducer(
      makeState(params),
      updatePathParam({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        pathParam: { uid: 'p2', name: 'kind', value: 'Signature', enabled: true }
      })
    );

    expect(pathParamsOf(state).find((p) => p.uid === 'p3').enabled).toBe(true);
  });

  it('editing the url keeps disabled candidates instead of dropping them', () => {
    const state = reducer(
      makeState(candidates()),
      requestUrlChanged({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        url: `${URL}?page=1`
      })
    );

    expect(pathParamsOf(state).map((p) => p.value)).toEqual(['Logo', 'Signature']);
  });

  it('editing the url does not duplicate a name that only has disabled rows', () => {
    const params = candidates().map((p) => ({ ...p, enabled: false }));

    const state = reducer(
      makeState(params),
      requestUrlChanged({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, url: `${URL}?page=1` })
    );

    expect(pathParamsOf(state)).toHaveLength(2);
  });

  it('editing the url promotes a candidate when every row of a name is disabled', () => {
    const params = candidates().map((p) => ({ ...p, enabled: false }));

    const state = reducer(
      makeState(params),
      requestUrlChanged({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, url: `${URL}?page=1` })
    );

    expect(pathParamsOf(state).map((p) => p.enabled)).toEqual([true, false]);
  });

  it('setPathParams promotes a remaining candidate when the selected row is deleted', () => {
    const state = reducer(
      makeState(candidates()),
      setPathParams({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        params: [{ uid: 'p2', name: 'kind', value: 'Signature', type: 'path', enabled: false }]
      })
    );

    expect(pathParamsOf(state)).toEqual([
      expect.objectContaining({ uid: 'p2', name: 'kind', value: 'Signature', enabled: true })
    ]);
  });

  it('setPathParams keeps the current selection when an alternate is added', () => {
    const state = reducer(
      makeState(candidates()),
      setPathParams({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        params: [...candidates(), { name: 'kind', value: '', type: 'path', enabled: false }]
      })
    );

    expect(pathParamsOf(state).map((p) => p.enabled)).toEqual([true, false, false]);
  });

  it('setPathParams keeps only the first enabled row of a name', () => {
    const params = candidates().map((p) => ({ ...p, enabled: true }));

    const state = reducer(
      makeState(params),
      setPathParams({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, params })
    );

    expect(pathParamsOf(state).map((p) => p.enabled)).toEqual([true, false]);
  });

  it('setPathParams leaves query params alone', () => {
    const params = [...candidates(), { uid: 'q1', name: 'page', value: '1', type: 'query', enabled: true }];

    const state = reducer(
      makeState(params),
      setPathParams({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, params: candidates() })
    );

    const queryParams = state.collections[0].items[0].draft.request.params.filter((p) => p.type === 'query');
    expect(queryParams).toEqual([expect.objectContaining({ uid: 'q1', name: 'page', enabled: true })]);
  });
});
