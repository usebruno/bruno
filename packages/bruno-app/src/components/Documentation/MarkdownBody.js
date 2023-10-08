import StyledMarkdownBodyWrapper from './StyledMarkdownBodyWrapper';

const MarkdownBody = (props) => {
  const handleOnDoubleClick = () => {
    switch (event.detail) {
      case 2: {
        props.OnDoubleClick();
        break;
      }
      case 1:
      default: {
        break;
      }
    }
  };

  return (
    <StyledMarkdownBodyWrapper theme={props.theme}>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: props.children }}
        onClick={handleOnDoubleClick}
      />
    </StyledMarkdownBodyWrapper>
  );
};

export default MarkdownBody;
