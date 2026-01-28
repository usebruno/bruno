import React from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { saveEnvironmentColor } from 'providers/ReduxStore/slices/collections/actions';
import { Circle } from '@uiw/react-color';

const EnvironmentColor = ({ environment, collectionUid }) => {
  const dispatch = useDispatch();

  const onColorChange = useCallback(
    (color) => {
      if (color == environment.color) return;
      dispatch(saveEnvironmentColor(color, environment.uid, collectionUid))
        .then(() => toast.success('Environment color changed successfully'))
        .catch(() => toast.error('An error occurred while changing the environment color'));
    },
    [dispatch, environment.uid, environment.color, collectionUid]
  );

  return (
    <Circle
      id="environment-color"
      style={{ gap: 3 }}
      pointProps={{ style: { width: 14, height: 14, borderRadius: 10 } }}
      colors={['#000000','#9c27b0','#3f51b5','#03a9f4','#009688','#8bc34a','#ffeb3b','#ff9800','#ff5722','#795548','#607d8b']}
      color={environment.color}
      onChange={(color) => onColorChange(color.hex)}
    />
  );
};
export default EnvironmentColor;
