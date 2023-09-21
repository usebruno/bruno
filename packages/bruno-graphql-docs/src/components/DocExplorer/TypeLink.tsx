/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { GraphQLList, GraphQLNonNull, GraphQLType, GraphQLNamedType } from 'graphql';
import { OnClickTypeFunction } from './types';

type Maybe<T> = T | null | undefined;

type TypeLinkProps = {
  type?: Maybe<GraphQLType>;
  onClick?: OnClickTypeFunction;
};

export default function TypeLink(props: TypeLinkProps) {
  const onClick = props.onClick ? props.onClick : () => null;
  return renderType(props.type, onClick);
}

function renderType(type: Maybe<GraphQLType>, onClick: OnClickTypeFunction) {
  if (type instanceof GraphQLNonNull) {
    return (
      <span>
        {renderType(type.ofType, onClick)}
        {'!'}
      </span>
    );
  }
  if (type instanceof GraphQLList) {
    return (
      <span>
        {'['}
        {renderType(type.ofType, onClick)}
        {']'}
      </span>
    );
  }
  return (
    <a
      className="type-name"
      onClick={(event) => {
        event.preventDefault();
        onClick(type as GraphQLNamedType, event);
      }}
      href="#"
    >
      {type?.name}
    </a>
  );
}
