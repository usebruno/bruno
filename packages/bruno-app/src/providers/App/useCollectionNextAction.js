const useCollectionNextAction = () => {
  // const collections = useSelector((state) => state.collections.collections);
  // const tabs = useSelector((state) => state.tabs.tabs);
  // const dispatch = useDispatch();
  // useEffect(() => {
  //   each(collections, (collection) => {
  //     if (collection.nextAction && collection.nextAction.type === 'OPEN_REQUEST') {
  //       const item = findItemInCollectionByPathname(collection, get(collection, 'nextAction.payload.pathname'));
  //       if (item) {
  //         dispatch(updateNextAction({ collectionUid: collection.uid, nextAction: null }));
  //         if (tabs.some((t) => t.uid === item.uid)) {
  //           dispatch(focusTab({ uid: item.uid }));
  //         } else {
  //           dispatch(
  //             addTab({
  //               uid: item.uid,
  //               collectionUid: collection.uid,
  //               requestPaneTab: getDefaultRequestPaneTab(item)
  //             })
  //           );
  //           dispatch(hideHomePage());
  //         }
  //       }
  //     }
  //   });
  // }, [collections, each, dispatch, updateNextAction, hideHomePage, addTab]);
};

export default useCollectionNextAction;
