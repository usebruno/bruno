import StyledWrapper from './StyledWrapper';

const PaneContent = ({ children, head, codeMirrorFull, inResponse }) => {
  return (
    <StyledWrapper className={inResponse ? 'pl-3 pr-4' : 'pl-4 pr-3'}>
      <div className={`head text-xs ${inResponse ? 'justify-end' : 'justify-start'}`}>{head}</div>
      <div className={`content ${codeMirrorFull ? 'code-mirror-full' : ''}`}>
        <div className="content-inner">{children}</div>
      </div>
    </StyledWrapper>
  );
};

export default PaneContent;
