import styled from 'styled-components';

export const Switch = styled.div`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  border-radius: 24px;
`;

export const Checkbox = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + label div {
    background-color: ${(props) => props.theme.textLink};
  }

  &:checked + label div:before {
    transform: translateX(26px);
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
  border-radius: 22px;
`;

export const SwitchButton = styled.div`
  position: absolute;
  height: 22px;
  width: 22px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;

  &:before {
    content: '';
    position: absolute;
    height: 20px;
    width: 20px;
    background-color: white;
    top: 2px;
    left: 2px;
    transition: 0.4s;
    border-radius: 50%;
  }
`;
