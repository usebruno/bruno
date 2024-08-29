import React from 'react';
import StyledWrapper from './StyledWrapper';
import { getTotalRequestCountInCollection } from 'utils/collections/';

const Info = ({ collection }) => {
  const totalRequestsInCollection = getTotalRequestCountInCollection(collection);

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">General information about the collection.</div>
      <table className="w-full border-collapse">
        <tbody>
          <tr className="">
            <td className="py-2 px-2 text-right">Name&nbsp;:</td>
            <td className="py-2 px-2">{collection.name}</td>
          </tr>
          <tr className="">
            <td className="py-2 px-2 text-right">Location&nbsp;:</td>
            <td className="py-2 px-2 break-all">{collection.pathname}</td>
          </tr>
          <tr className="">
            <td className="py-2 px-2 text-right">Ignored files&nbsp;:</td>
            <td className="py-2 px-2 break-all">{collection.brunoConfig?.ignore?.map((x) => `'${x}'`).join(', ')}</td>
          </tr>
          <tr className="">
            <td className="py-2 px-2 text-right">Environments&nbsp;:</td>
            <td className="py-2 px-2">{collection.environments?.length || 0}</td>
          </tr>
          <tr className="">
            <td className="py-2 px-2 text-right">Requests&nbsp;:</td>
            <td className="py-2 px-2">{totalRequestsInCollection}</td>
          </tr>
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default Info;
