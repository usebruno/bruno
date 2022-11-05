/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React, { ChangeEventHandler } from 'react';

import debounce from '../../utility/debounce';

type OnSearchFn = (value: string) => void;

type SearchBoxProps = {
  value?: string;
  placeholder: string;
  onSearch: OnSearchFn;
};

type SearchBoxState = {
  value: string;
};

export default class SearchBox extends React.Component<
  SearchBoxProps,
  SearchBoxState
> {
  debouncedOnSearch: OnSearchFn;

  constructor(props: SearchBoxProps) {
    super(props);
    this.state = { value: props.value || '' };
    this.debouncedOnSearch = debounce(200, this.props.onSearch);
  }

  render() {
    return (
      <label className="search-box">
        <div className="search-box-icon" aria-hidden="true">
          {'\u26b2'}
        </div>
        <input
          value={this.state.value}
          onChange={this.handleChange}
          type="text"
          placeholder={this.props.placeholder}
          aria-label={this.props.placeholder}
        />
        {this.state.value && (
          <button
            className="search-box-clear"
            onClick={this.handleClear}
            aria-label="Clear search input">
            {'\u2715'}
          </button>
        )}
      </label>
    );
  }

  handleChange: ChangeEventHandler<HTMLInputElement> = event => {
    const value = event.currentTarget.value;
    this.setState({ value });
    this.debouncedOnSearch(value);
  };

  handleClear = () => {
    this.setState({ value: '' });
    this.props.onSearch('');
  };
}
