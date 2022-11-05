/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { astFromValue, print, ValueNode } from 'graphql';
import { FieldType } from './types';

const printDefault = (ast?: ValueNode | null): string => {
  if (!ast) {
    return '';
  }
  return print(ast);
};

type DefaultValueProps = {
  field: FieldType;
};

export default function DefaultValue({ field }: DefaultValueProps) {
  // field.defaultValue could be null or false, so be careful here!
  if ('defaultValue' in field && field.defaultValue !== undefined) {
    return (
      <span>
        {' = '}
        <span className="arg-default-value">
          {printDefault(astFromValue(field.defaultValue, field.type))}
        </span>
      </span>
    );
  }

  return null;
}
