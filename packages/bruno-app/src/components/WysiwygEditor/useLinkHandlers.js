import { useCallback } from 'react';

const useLinkHandlers = (editor) => {
  const handleLinkSubmit = useCallback(({ text, url }) => {
    if (!editor) return;

    const parsedUrl = url.trim().toLowerCase();
    if (parsedUrl.startsWith('javascript:')) return;

    const chain = editor.chain().focus();
    if (editor.isActive('link')) {
      chain.extendMarkRange('link');
    }

    chain
      .insertContent({
        type: 'text',
        text: text || url,
        marks: [{ type: 'link', attrs: { href: url } }]
      })
      .run();
  }, [editor]);

  const handleUnlink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  }, [editor]);

  return { handleLinkSubmit, handleUnlink };
};

export default useLinkHandlers;
