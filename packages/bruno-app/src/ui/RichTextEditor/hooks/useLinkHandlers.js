import { useCallback } from 'react';

const useLinkHandlers = (editor) => {
  const handleLinkSubmit = useCallback(({ text, url }) => {
    if (!editor) return;

    const trimmedUrl = url.trim();
    const parsedUrl = trimmedUrl.toLowerCase();

    if (
      parsedUrl.startsWith('javascript:')
      || parsedUrl.startsWith('vbscript:')
      || parsedUrl.startsWith('data:')
      || parsedUrl.startsWith('file:')
    ) {
      return;
    }

    const chain = editor.chain().focus();
    if (editor.isActive('link')) {
      chain.extendMarkRange('link');
    }

    chain
      .insertContent({
        type: 'text',
        text: text || trimmedUrl,
        marks: [{ type: 'link', attrs: { href: trimmedUrl } }]
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
