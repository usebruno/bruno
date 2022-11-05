import { MouseEvent } from 'react';
import {
  GraphQLField,
  GraphQLInputField,
  GraphQLArgument,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLType,
  GraphQLNamedType,
} from 'graphql';

export type FieldType =
  | GraphQLField<{}, {}, {}>
  | GraphQLInputField
  | GraphQLArgument;

export type OnClickFieldFunction = (
  field: FieldType,
  type?:
    | GraphQLObjectType
    | GraphQLInterfaceType
    | GraphQLInputObjectType
    | GraphQLType,
  event?: MouseEvent,
) => void;

export type OnClickTypeFunction = (
  type: GraphQLNamedType,
  event?: MouseEvent<HTMLAnchorElement>,
) => void;

export type OnClickFieldOrTypeFunction =
  | OnClickFieldFunction
  | OnClickTypeFunction;
