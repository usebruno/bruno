import toast from "react-hot-toast";
import {toastError} from "utils/common/error";
import {useDispatch} from "react-redux";
import {importEnvironment} from "providers/ReduxStore/slices/collections/actions";
import importPostmanEnvironment from "utils/importers/postman-environment";
import React from "react";

const ImportEnvironment = ({title, collectionUid}) => {
    const dispatch = useDispatch();

    const handleImportPostmanEnvironment = () => {
        importPostmanEnvironment()
            .then((environment) => {
                dispatch(importEnvironment(environment.name, environment.variables, collectionUid))
                    .then(() => {
                        toast.success('Environment imported successfully');
                    })
                    .catch(() => toast.error('An error occurred while importing the environment'));
            })
            .catch((err) => toastError(err, 'Postman Import environment failed'));
    };

    return(
        <button
            className="btn-create-environment text-link pr-2 py-2 mt-2 select-none"
            onClick={handleImportPostmanEnvironment}
        >
            + <span>{title}</span>
        </button>
    );
};

export default ImportEnvironment;