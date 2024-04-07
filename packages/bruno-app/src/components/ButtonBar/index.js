import StyledWrapper from './StyledWrapper';

const ButtonBar = ({ text, handleClick, children }) => {
  return (
    <StyledWrapper>
      <button onClick={() => handleClick()}>
        <span className="flex items-center">
          {typeof text === 'object' ? JSON.stringify(text) : text}
          {children}
        </span>
      </button>
    </StyledWrapper>
  );
};

export default ButtonBar;
