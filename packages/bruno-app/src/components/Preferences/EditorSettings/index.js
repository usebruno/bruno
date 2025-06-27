import React, { useRef } from 'react';
import get from 'lodash/get';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

const EditorSettings = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const preferencesSchema = Yup.object().shape({
	lineWrapping: Yup.boolean(),
	lineNumbers: Yup.boolean()
  });

  const formik = useFormik({
	initialValues: {
	  lineWrapping: get(preferences, 'request.lineWrapping', true),
	  lineNumbers: get(preferences, 'request.lineNumbers', true)
	},
	validationSchema: preferencesSchema,
	onSubmit: async (values) => {
	  try {
		const newPreferences = await preferencesSchema.validate(values, { abortEarly: true });
		handleSave(newPreferences);
	  } catch (error) {
		console.error('Preferences validation error:', error.message);
	  }
	}
  });

  const handleSave = (newPreferences) => {
	dispatch(
	  savePreferences({
		...preferences,
		request: {
		  lineWrapping: newPreferences.lineWrapping,
		  lineNumbers: newPreferences.lineNumbers
		}
	  })
	)
	  .then(() => {
		close();
	  })
	  .catch((err) => console.log(err) && toast.error('Failed to update preferences'));
  };

  return (
	<StyledWrapper>
	  <form className="bruno-form" onSubmit={formik.handleSubmit}>
		<div className="flex items-center mt-2">
		  <input
			id="lineWrapping"
			type="checkbox"
			name="lineWrapping"
			checked={formik.values.lineWrapping}
			onChange={formik.handleChange}
			className="mousetrap mr-0"
		  />
		  <label className="block ml-2 select-none" htmlFor="lineWrapping">
			Line Wrapping
		  </label>
		</div>
		<div className="flex items-center mt-2">
		  <input
			id="lineNumbers"
			type="checkbox"
			name="lineNumbers"
			checked={formik.values.lineNumbers}
			onChange={formik.handleChange}
			className="mousetrap mr-0"
		  />
		  <label className="block ml-2 select-none" htmlFor="lineNumbers">
			Line Numbers
		  </label>
		</div>
		<div className="flex items-center mt-2">
		  <input
			id="autoCloseBrackets"
			type="checkbox"
			name="autoCloseBrackets"
			checked={formik.values.autoCloseBrackets}
			onChange={formik.handleChange}
			className="mousetrap mr-0"
		  />
		  <label className="block ml-2 select-none" htmlFor="lineNumbers">
			Auto Close Brackets
		  </label>
		</div>
		<div className="mt-10">
		  <button type="submit" className="submit btn btn-sm btn-secondary">
			Save
		  </button>
		</div>
	  </form>
	</StyledWrapper>
  );
};

export default EditorSettings;
