import Bruno from 'components/Bruno/index';
import { useDispatch } from 'react-redux';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const TitleBar = () => {
  const dispatch = useDispatch();

  const handleTitleClick = () => dispatch(showHomePage());

  return (
    <StyledWrapper className="px-2 py-2">
      <div className="flex items-center">
        <div className="flex items-center cursor-pointer" onClick={handleTitleClick}>
          <Bruno width={30} />
        </div>
        <div
          onClick={handleTitleClick}
          className="flex items-center font-medium select-none cursor-pointer"
          style={{ fontSize: 14, paddingLeft: 6, position: 'relative', top: -1 }}
        >
          bruno
        </div>
      </div>
    </StyledWrapper>
  );
};

export default TitleBar;
