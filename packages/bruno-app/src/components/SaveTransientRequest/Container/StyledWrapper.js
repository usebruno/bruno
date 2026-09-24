import styled from 'styled-components';

const StyledWrapper = styled.div`
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 0.75rem; 
    padding-right: 0.75rem; 
    background: ${({ theme }) => theme.background.crust};
    border: 1px solid ${({ theme }) => theme.border.border0};
    border-radius: ${({ theme }) => theme.border.radius.sm};

    .request-name { 
        color: ${({ theme }) => theme.text};
    }

    .collection-name{
        color: ${({ theme }) => theme.colors.text.subtext1};
    }
`;

export default StyledWrapper;
