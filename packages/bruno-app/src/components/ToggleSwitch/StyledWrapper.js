import styled from 'styled-components';

const switchSizes = {
  '2xs': { width: 32, height: 16, buttonSize: 14 },
  xs: { width: 40, height: 20, buttonSize: 18 },
  s: { width: 44, height: 22, buttonSize: 20 },
  m: { width: 50, height: 24, buttonSize: 22 }, // default size
  l: { width: 56, height: 28, buttonSize: 26 },
  xl: { width: 64, height: 32, buttonSize: 30 },
  '2xl': { width: 72, height: 36, buttonSize: 34 }
};

const getSizeValues = (size = 'm') => switchSizes[size] || switchSizes.m;

export const Switch = styled.div`
  position: relative;
  display: inline-block;
  width: ${(props) => getSizeValues(props.size).width}px;
  height: ${(props) => getSizeValues(props.size).height}px;
  border-radius: ${(props) => getSizeValues(props.size).height}px;
`;

export const Checkbox = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + label div {
    background-color: ${(props) => props.theme.textLink};
  }

  &:checked + label div:before {
    transform: translateX(${(props) => getSizeValues(props.size).width - getSizeValues(props.size).buttonSize - 2}px);
  }
`;

export const Label = styled.label`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  background-color: ${(props) => props.theme.input.bg};
  border-radius: 24px;

  div {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: ${(props) => props.theme.colors.text.muted};
    border-radius: 24px;
    transition: transform 0.2s;
  }
`;

export const Inner = styled.div`
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background-color: #fafafa;
  transition: 0.4s;
  border-radius: ${(props) => getSizeValues(props.size).height - 2}px;
`;

export const SwitchButton = styled.div`
  position: absolute;
  height: ${(props) => getSizeValues(props.size).buttonSize}px;
  width: ${(props) => getSizeValues(props.size).buttonSize}px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;

  &:before {
    content: '';
    position: absolute;
    height: ${(props) => getSizeValues(props.size).buttonSize - 2}px;
    width: ${(props) => getSizeValues(props.size).buttonSize - 2}px;
    background-color: white;
    top: 2px;
    left: 2px;
    transition: 0.4s;
    border-radius: 50%;
  }
`;
