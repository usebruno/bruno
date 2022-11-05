/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import TypeLink from './TypeLink';
import MarkdownContent from './MarkdownContent';
import { GraphQLSchema } from 'graphql';
import { OnClickTypeFunction } from './types';

type SchemaDocProps = {
  schema: GraphQLSchema;
  onClickType: OnClickTypeFunction;
};

// Render the top level Schema
export default function SchemaDoc({ schema, onClickType }: SchemaDocProps) {
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType && schema.getMutationType();
  const subscriptionType =
    schema.getSubscriptionType && schema.getSubscriptionType();

  return (
    <div>
      <MarkdownContent
        className="doc-type-description"
        markdown={
          schema.description ||
          'A GraphQL schema provides a root type for each kind of operation.'
        }
      />
      <div className="doc-category">
        <div className="doc-category-title">{'root types'}</div>
        <div className="doc-category-item">
          <span className="keyword">{'query'}</span>
          {': '}
          <TypeLink type={queryType} onClick={onClickType} />
        </div>
        {mutationType && (
          <div className="doc-category-item">
            <span className="keyword">{'mutation'}</span>
            {': '}
            <TypeLink type={mutationType} onClick={onClickType} />
          </div>
        )}
        {subscriptionType && (
          <div className="doc-category-item">
            <span className="keyword">{'subscription'}</span>
            {': '}
            <TypeLink type={subscriptionType} onClick={onClickType} />
          </div>
        )}
      </div>
    </div>
  );
}
