/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { GraphQLArgument } from 'graphql';
import TypeLink from './TypeLink';
import DefaultValue from './DefaultValue';
import { OnClickTypeFunction } from './types';

type ArgumentProps = {
  arg: GraphQLArgument;
  onClickType: OnClickTypeFunction;
  showDefaultValue?: boolean;
};

export default function Argument({
  arg,
  onClickType,
  showDefaultValue,
}: ArgumentProps) {
  return (
    <span className="arg">
      <span className="arg-name">{arg.name}</span>
      {': '}
      <TypeLink type={arg.type} onClick={onClickType} />
      {showDefaultValue !== false && <DefaultValue field={arg} />}
    </span>
  );
}
