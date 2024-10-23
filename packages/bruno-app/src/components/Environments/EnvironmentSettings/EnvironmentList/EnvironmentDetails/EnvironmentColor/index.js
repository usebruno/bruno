import React from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { saveEnvironmentColor } from 'providers/ReduxStore/slices/collections/actions';
import { CirclePicker } from 'react-color';

const EnvironmentColor = ({ environment, collectionUid }) => {
  const dispatch = useDispatch();

  const onColorChange = useCallback(
                          (color) => (
                            dispatch(saveEnvironmentColor(color, environment.uid, collectionUid))
                            .then(() => toast.success('Environment color changed successfully'))
                            .catch((e) => toast.error('An error occurred while changing the environment color'))
                          )
                        );

  return (
    <CirclePicker
      id="environment-color"
      circleSize={14}
      circleSpacing={3}
      colors={['#000000','#9c27b0','#3f51b5','#03a9f4','#009688','#8bc34a','#ffeb3b','#ff9800','#ff5722','#795548','#607d8b']}
      color={environment.color}
      onChangeComplete={(color) => onColorChange(color.hex)}
    />
  );
};
export default EnvironmentColor;
