import React from 'react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { saveEnvironmentColor } from 'providers/ReduxStore/slices/collections/actions';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { CirclePicker } from 'react-color';
import { selectEnvironment as _selectEnvironment } from 'providers/ReduxStore/slices/collections';

const EnvironmentColor = ({ environment, collectionUid }) => {
  const dispatch = useDispatch();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      color: environment.color || ''
    },
    validationSchema: Yup.object({
      color: Yup.string().optional()
    }),
    onSubmit: (values) => {
      if (!formik.dirty) {
        toast.error('Nothing to save');
        return;
      }
      dispatch(saveEnvironmentColor(values.color, environment.uid, collectionUid))
        .then(() => {
          toast.success('Environment color changed successfully');
        })
        .catch((e) => {
          console.log(e);
          toast.error('An error occurred while changing the environment color');
        });
    }
  });

  useEffect(() => {
    if (formik.dirty) {
      formik.handleSubmit();
    }
  }, [formik.values.color]);

  return (
    <CirclePicker
      id="environment-color"
      circleSize={12}
      circleSpacing={5}
      colors={[
        '#9c27b0',
        '#3f51b5',
        '#03a9f4',
        '#009688',
        '#8bc34a',
        '#ffeb3b',
        '#ff9800',
        '#ff5722',
        '#795548',
        '#607d8b'
      ]}
      color={environment.color}
      onChangeComplete={(color) => formik.setFieldValue('color', color.hex)}
      value={formik.values.color || ''}
    />
  );
};
export default EnvironmentColor;
