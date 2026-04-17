const OVERVIEW_FOLDER_NAME = 'Overview';

const getDocsContent = (docs) => {
  if (!docs) {
    return '';
  }

  if (typeof docs === 'string') {
    return docs;
  }

  if (typeof docs === 'object' && typeof docs.content === 'string') {
    return docs.content;
  }

  return '';
};

const hasTopLevelOverviewFolderWithDocs = (items = []) => {
  return items.some((item) => {
    if (item?.info?.type !== 'folder' || item?.info?.name !== OVERVIEW_FOLDER_NAME) {
      return false;
    }

    return getDocsContent(item.docs).trim().length > 0;
  });
};

export const resolveCollectionForHtmlDocumentation = (openCollection) => {
  if (!openCollection || typeof openCollection !== 'object') {
    return openCollection;
  }

  const docsContent = getDocsContent(openCollection.docs).trim();
  if (!docsContent.length) {
    return openCollection;
  }

  const items = Array.isArray(openCollection.items) ? openCollection.items : [];
  if (hasTopLevelOverviewFolderWithDocs(items)) {
    return openCollection;
  }

  const overviewItem = {
    info: {
      name: OVERVIEW_FOLDER_NAME,
      type: 'folder'
    },
    docs: {
      content: docsContent,
      type: 'text/markdown'
    }
  };

  return {
    ...openCollection,
    docs: undefined,
    items: [overviewItem, ...items]
  };
};
