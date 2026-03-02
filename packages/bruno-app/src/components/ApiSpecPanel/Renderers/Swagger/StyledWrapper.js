import styled from 'styled-components';

const StyledWrapper = styled.div`
  .swagger-root {
    height: calc(100vh - 7rem);
    border-left: solid 1px ${(props) => props.theme.border.border1};
    overflow-y: auto;
    background: ${(props) => props.theme.bg};
    padding-bottom: 20px;

    /* ── Global reset ── */
    .swagger-ui {
      font-family: inherit;
      font-size: ${(props) => props.theme.font.size.base};
      color: ${(props) => props.theme.text};

      * {
        border-color: ${(props) => props.theme.border.border1};
      }

      .auth-container {
        padding: 0;
      }

      select {
        box-shadow: none !important;
      }

      .wrapper {
        padding: 0 20px;
        max-width: none;
      }

      /* ── Info section ── */
      .info {
        margin: 16px 0 12px;

        hgroup.main {
          margin: 0;
        }

        .title {
          font-size: 16px;
          font-weight: 600;
          color: ${(props) => props.theme.text};

          small {
            padding: 2px 6px !important;
            font-size: 10px;
            vertical-align: middle;
            border-radius: 3px;

            pre {
              color: ${(props) => props.theme.text} !important;
              font-size: 10px;
            }
          }
        }

        .base-url {
          font-size: ${(props) => props.theme.font.size.xs};
          color: ${(props) => props.theme.colors.text.muted};
        }

        .description {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.muted};

          p, li {
            font-size: ${(props) => props.theme.font.size.sm};
            color: ${(props) => props.theme.colors.text.muted};
            margin: 3px 0;
            line-height: 1.5;
          }

          h1, h2, h3, h4, h5, h6 {
            color: ${(props) => props.theme.text};
          }

          a {
            color: ${(props) => props.theme.textLink};
          }
        }
      }

      /* Version / OAS badges */
      .version-stamp span.version {
        background: ${(props) => props.theme.border.border1} !important;
        border: 1px solid ${(props) => props.theme.colors.text.muted} !important;
        color: ${(props) => props.theme.text} !important;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 3px;
      }

      .version-pragma {
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.muted};
      }

      /* ── Tag section headings ── */
      .opblock-tag-section {
        .opblock-tag {
          font-size: ${(props) => props.theme.font.size.md};
          color: ${(props) => props.theme.text};
          border-bottom: none;
          padding: 0;

          &:hover {
            background: ${(props) => props.theme.background.mantle};
          }

          a {
            color: ${(props) => props.theme.text} !important;
          }

          small {
            font-size: ${(props) => props.theme.font.size.xs};
            color: ${(props) => props.theme.colors.text.muted};
            padding: 0 10px;
          }
        }
      }

      /* ── Operation blocks (GET, POST, PUT, DELETE, PATCH) ── */
      .opblock {
        margin: 0 0 8px;
        border-radius: 4px;
        border: 1px solid ${(props) => props.theme.border.border1} !important;
        background: ${(props) => props.theme.bg} !important;
        box-shadow: none !important;

        .opblock-summary {
          padding: 6px 10px;
          border: none !important;
          background: transparent !important;

          .opblock-summary-method {
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            min-width: 50px;
            text-align: center;
            border-radius: 3px;
          }

          .opblock-summary-path {
            font-size: ${(props) => props.theme.font.size.sm};

            a, span {
              color: ${(props) => props.theme.text} !important;
            }
          }

          .opblock-summary-description {
            font-size: ${(props) => props.theme.font.size.xs};
            color: ${(props) => props.theme.colors.text.muted};
          }

          .opblock-summary-control {
            svg {
              fill: ${(props) => props.theme.colors.text.muted};
              width: 14px;
              height: 14px;
            }
          }
        }

        .opblock-body {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.text};
          background: ${(props) => props.theme.bg};
          border-top: 1px solid ${(props) => props.theme.border.border1};

          .opblock-description-wrapper,
          .opblock-section {
            p {
              color: ${(props) => props.theme.colors.text.muted};
              font-size: ${(props) => props.theme.font.size.sm};
            }
          }

          .tab-header .tab-item {
            color: ${(props) => props.theme.colors.text.muted};

            &.active {
              color: ${(props) => props.theme.text};
            }
          }

          select {
            color: ${(props) => props.theme.text};
            background: ${(props) => props.theme.bg};
            border: 1px solid ${(props) => props.theme.border.border1};
            border-radius: 3px;
            font-size: ${(props) => props.theme.font.size.xs};
            padding: 2px 6px;
          }

          input[type="text"] {
            color: ${(props) => props.theme.text};
            background: ${(props) => props.theme.bg};
            border: 1px solid ${(props) => props.theme.border.border1};
            border-radius: 3px;
            font-size: ${(props) => props.theme.font.size.sm};
          }
        }
      }

      /* Method badge colors — keep them but tone down */
      .opblock.opblock-get .opblock-summary-method { background: #61affe; color: #fff; }
      .opblock.opblock-post .opblock-summary-method { background: #49cc90; color: #fff; }
      .opblock.opblock-put .opblock-summary-method { background: #fca130; color: #fff; }
      .opblock.opblock-delete .opblock-summary-method { background: #f93e3e; color: #fff; }
      .opblock.opblock-patch .opblock-summary-method { background: #50e3c2; color: #000; }

      /* Lock / authorization icons */
      .authorization__btn {

        svg {
          fill: ${(props) => props.theme.colors.text.muted};
          width: 14px;
          height: 14px;
        }
      }

      /* ── Tables ── */
      table {
        font-size: ${(props) => props.theme.font.size.sm};

        thead {
          tr {
            th {
              font-size: ${(props) => props.theme.font.size.xs} !important;
              color: ${(props) => props.theme.colors.text.muted} !important;
              border-bottom: 1px solid ${(props) => props.theme.border.border1} !important;
              padding: 6px 0;
            }
          }
        }

        td {
          padding: 6px 0;
          border-bottom: 1px solid ${(props) => props.theme.border.border1};
          color: ${(props) => props.theme.text};
        }
      }

      .parameter__name {
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.text};

        &.required::after {
          color: ${(props) => props.theme.colors.text.danger || '#c0392b'};
          font-size: ${(props) => props.theme.font.size.xs};
        }
      }

      .parameter__type {
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.muted};
      }

      .parameter__in {
        font-size: ${(props) => props.theme.font.size.xs};
        color: ${(props) => props.theme.colors.text.muted};
      }

      /* ── Models / Schemas ── */
      section.models {
        border: 1px solid ${(props) => props.theme.border.border1};
        border-radius: 4px;
        background: ${(props) => props.theme.bg};
        padding-bottom: 0px;
        margin-bottom: 40px;
        margin-top: 8px;

        h4 {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.text};
          border-bottom: none;
          padding: 6px 10px;
          margin: 0;

          svg {
            fill: ${(props) => props.theme.colors.text.muted};
            width: 16px;
            height: 16px;
          }
        }

        .model-container {
          background: ${(props) => props.theme.bg} !important;
          margin: 0;
          padding: 4px 8px;
          border-bottom: 1px solid ${(props) => props.theme.border.border1};

          &:last-child {
            border-bottom: none;
          }

          .model-box {
            background: ${(props) => props.theme.bg} !important;
            padding: 2px 0;
          }
        }
      }

      .model {
        font-size: 11px;
        color: ${(props) => props.theme.text};
        line-height: 1.4;

        .prop-type {
          color: ${(props) => props.theme.textLink};
          font-size: 11px;
        }

        .prop-format {
          color: ${(props) => props.theme.colors.text.muted};
          font-size: 10px;
        }

        span.prop-enum {
          display: block;
          color: ${(props) => props.theme.colors.text.muted};
          font-size: 10px;
        }
      }

      .model-example {

        .tab li {
          color: ${(props) => props.theme.colors.text.muted} !important;
        }
      }

      /* Model expand/collapse toggle */
      .model-toggle {
        cursor: pointer;
        font-size: 10px;
        color: ${(props) => props.theme.colors.text.muted};

        &::after {
          color: ${(props) => props.theme.colors.text.muted};
        }
      }

      /* Model box inner styling */
      .model-box {
        background: ${(props) => props.theme.bg} !important;
        color: ${(props) => props.theme.text};
      }

      /* Inner model details */
      .inner-object {
        color: ${(props) => props.theme.text};
      }

      /* Model title (schema name) */
      .model-title {
        color: ${(props) => props.theme.text};
        font-size: 12px;
        font-weight: 600;
      }

      /* ── JSON Schema 2020-12 (OpenAPI 3.1) schema overrides ── */
      .json-schema-2020-12-accordion,
      .json-schema-2020-12-expand-deep-button,
      section.models h4 button,
      .model-box button,
      .models-control,
      .opblock-summary,
      .opblock-summary-control,
      .opblock-tag,
      button {
        outline: none !important;
        box-shadow: none !important;
      }

      .json-schema-2020-12__title {
        font-size: 12px !important;
        font-weight: 600;
        color: ${(props) => props.theme.text} !important;
      }

      .json-schema-2020-12-head {
        padding: 4px 8px !important;
        background: ${(props) => props.theme.bg} !important;

        .json-schema-2020-12-accordion {
          padding: 0 !important;
          color: ${(props) => props.theme.text} !important;
          background: transparent !important;
        }

        /* chevron / arrow icon */
        .json-schema-2020-12-accordion__icon {
          fill: ${(props) => props.theme.colors.text.muted} !important;
        }

        button.json-schema-2020-12-expand-deep-button {
          font-size: 10px !important;
          color: ${(props) => props.theme.colors.text.muted} !important;
          background: transparent !important;
          padding: 0 4px !important;
        }

        strong.json-schema-2020-12__attribute--primary {
          font-size: 11px !important;
          color: ${(props) => props.theme.textLink} !important;
          font-weight: normal;
        }
      }

      .json-schema-2020-12-body {
        font-size: 11px !important;
        margin-left: 16px;
        color: ${(props) => props.theme.text} !important;

        .json-schema-2020-12-property {
          margin-left: 8px;
          color: ${(props) => props.theme.text} !important;
          border-color: ${(props) => props.theme.border.border1} !important;
        }

        /* property names */
        .json-schema-2020-12__title {
          font-size: 11px !important;
          font-weight: normal;
          color: ${(props) => props.theme.text} !important;
        }

        /* type badges inside expanded schema */
        strong.json-schema-2020-12__attribute--primary {
          font-size: 10px !important;
          color: ${(props) => props.theme.textLink} !important;
          font-weight: normal;
        }

        strong.json-schema-2020-12__attribute {
          font-size: 10px !important;
          color: ${(props) => props.theme.colors.text.muted} !important;
          font-weight: normal;
        }
      }

      .json-schema-2020-12 {
        font-size: 11px !important;
        margin: 0 !important;
        width: 100%;
        height: 100%;
        color: ${(props) => props.theme.text} !important;
        background: ${(props) => props.theme.bg} !important;
      }

      /* JSON viewer (Examples section inside schema properties) */
      .json-schema-2020-12-json-viewer {
        background: transparent !important;
        color: ${(props) => props.theme.text} !important;
      }

      .json-schema-2020-12-json-viewer__name {
        color: ${(props) => props.theme.text} !important;
      }

      .json-schema-2020-12-json-viewer__name--secondary {
        color: ${(props) => props.theme.colors.text.muted} !important;
        font-weight: normal !important;
      }

      .json-schema-2020-12-json-viewer__value {
        color: ${(props) => props.theme.text} !important;
      }

      .json-schema-2020-12-json-viewer__value--secondary {
        color: ${(props) => props.theme.colors.text.subtext0} !important;
      }

      .json-schema-2020-12-json-viewer__value--string,
      .json-schema-2020-12-json-viewer__value--string.json-schema-2020-12-json-viewer__value--secondary {
        color: ${(props) => props.theme.colors.text.green} !important;
      }

      .json-schema-2020-12-json-viewer__value--number,
      .json-schema-2020-12-json-viewer__value--bigint,
      .json-schema-2020-12-json-viewer__value--number.json-schema-2020-12-json-viewer__value--secondary,
      .json-schema-2020-12-json-viewer__value--bigint.json-schema-2020-12-json-viewer__value--secondary {
        color: ${(props) => props.theme.textLink} !important;
      }

      .json-schema-2020-12-json-viewer__value--boolean,
      .json-schema-2020-12-json-viewer__value--boolean.json-schema-2020-12-json-viewer__value--secondary {
        color: ${(props) => props.theme.colors.text.warning} !important;
      }

      .json-schema-2020-12-json-viewer__value--null,
      .json-schema-2020-12-json-viewer__value--undefined {
        color: ${(props) => props.theme.colors.text.muted} !important;
      }

      /* enum/keyword example values container */
      .json-schema-2020-12-keyword--examples,
      [data-json-schema-keyword="examples"] {
        color: ${(props) => props.theme.text} !important;
      }

      /* Model collapse/expand all link */
      span.model-toggle {
        color: ${(props) => props.theme.colors.text.muted};
        font-size: 10px;
      }

      /* Brace styling in models */
      .brace-open, .brace-close {
        color: ${(props) => props.theme.colors.text.muted};
        font-size: 11px;
      }

      /* ── Code / Response blocks ── */
      .microlight {
        background: ${(props) => props.theme.codemirror.bg} !important;
        color: ${(props) => props.theme.text} !important;
        font-size: ${(props) => props.theme.font.size.xs};
        border-radius: 4px;
        padding: 8px;
        border: 1px solid ${(props) => props.theme.border.border1};
      }

      .highlight-code {
        background: ${(props) => props.theme.codemirror.bg} !important;

        > .microlight {
          border: none;
        }
      }

      pre {
        color: ${(props) => props.theme.text};
        font-size: ${(props) => props.theme.font.size.xs};
        border-radius: 4px;
      }

      .response-col_status {
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.text};
      }

      .response-col_description {
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.colors.text.muted};
      }

      .responses-inner {
        h4, h5 {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.text};
        }
      }

      /* ── Buttons ── */
      .btn {
        font-size: ${(props) => props.theme.font.size.xs};
        border-radius: 4px;
        box-shadow: none !important;
        color: ${(props) => props.theme.text};
        border-color: ${(props) => props.theme.border.border1};
        background: transparent;
      }

      .btn.authorize {
        color: ${(props) => props.theme.text};
        border-color: ${(props) => props.theme.border.border1};
        background: transparent;

        svg {
          fill: ${(props) => props.theme.text};
        }

        span {
          color: ${(props) => props.theme.text};
        }
      }

      .btn.execute {
        background: ${(props) => props.theme.primary?.solid || props.theme.textLink};
        color: #fff;
        border-color: transparent;
      }

      .btn-group {
        .btn {
          background: ${(props) => props.theme.bg};
          color: ${(props) => props.theme.text};
        }
      }

      /* ── Links ── */
      a {
        color: ${(props) => props.theme.textLink};
      }

      /* ── Servers / Scheme container ── */
      .scheme-container {
        background: ${(props) => props.theme.background.mantle} !important;
        border-top: 1px solid ${(props) => props.theme.border.border1};
        border-bottom: 1px solid ${(props) => props.theme.border.border1};
        padding: 10px;
        box-shadow: none !important;

        .schemes-title {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.muted};
        }

        label {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.muted};
        }

        select {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.text};
          background: ${(props) => props.theme.bg};
          border: 1px solid ${(props) => props.theme.border.border1};
          border-radius: 4px;
          padding: 4px 8px;
        }
      }

      /* ── SVGs / icons ── */
      svg {
        fill: ${(props) => props.theme.colors.text.muted};
      }

      svg.arrow {
        fill: ${(props) => props.theme.text};
        width: 12px;
        height: 12px;
        margin-left: 4px;
      }

      .expand-operation svg {
        fill: ${(props) => props.theme.colors.text.muted};
        width: 14px;
        height: 14px;
      }

      /* ── Misc / catch-all ── */
      .loading-container .loading::after {
        color: ${(props) => props.theme.colors.text.muted};
        font-size: ${(props) => props.theme.font.size.sm};
      }

      .renderedMarkdown p {
        color: ${(props) => props.theme.colors.text.muted};
        font-size: ${(props) => props.theme.font.size.sm};
      }

      .opblock-section-header {
        background: ${(props) => props.theme.background.mantle} !important;
        box-shadow: none !important;
        border-bottom: 1px solid ${(props) => props.theme.border.border1};
        padding: 6px 10px;

        h4 {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.text};
        }

        label {
          font-size: ${(props) => props.theme.font.size.xs};
          color: ${(props) => props.theme.colors.text.muted};
        }
      }

      .copy-to-clipboard {
        button {
          background: ${(props) => props.theme.background.mantle};
          border: 1px solid ${(props) => props.theme.border.border1};
          border-radius: 3px;
        }
      }

      /* Dialog / modal overrides */
      .dialog-ux {
        .modal-ux {
          background: ${(props) => props.theme.bg};
          border: 1px solid ${(props) => props.theme.border.border1};
          border-radius: 6px;
          color: ${(props) => props.theme.text};
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);

          .modal-ux-header {
            border-bottom: 1px solid ${(props) => props.theme.border.border1};
            padding: 12px 0px;

            h3 {
              font-size: ${(props) => props.theme.font.size.md};
              font-weight: 600;
              color: ${(props) => props.theme.text};
            }

            .close-modal {
              opacity: 0.6;
              &:hover { opacity: 1; }
              svg { fill: ${(props) => props.theme.text}; }
            }
          }

          .modal-ux-content {
            color: ${(props) => props.theme.text};
            padding: 12px 16px;

            p {
              font-size: ${(props) => props.theme.font.size.sm};
              color: ${(props) => props.theme.colors.text.muted};
            }

            /* Section headings like "api_key (apiKey)" */
            h4, h5, h6 {
              font-size: ${(props) => props.theme.font.size.sm};
              font-weight: 600;
              color: ${(props) => props.theme.textLink};
              margin: 12px 0 6px;
            }

            /* Labels: "Name:", "In:", "Flow:", "Value:", etc. */
            label {
              font-size: ${(props) => props.theme.font.size.sm};
              color: ${(props) => props.theme.text};

              > span {
                font-size: ${(props) => props.theme.font.size.sm};
                color: ${(props) => props.theme.colors.text.muted};
              }
            }

            /* "Scopes:" heading */
            .scopes h2 {
              font-size: ${(props) => props.theme.font.size.sm} !important;
              font-weight: 500;
              color: ${(props) => props.theme.text} !important;
            }

            /* Scope item name + description */
            .scopes .checkbox {
              p.name {
                font-size: ${(props) => props.theme.font.size.sm} !important;
                color: ${(props) => props.theme.text} !important;
                font-weight: 500;
                margin: 0;
              }

              p.description {
                font-size: ${(props) => props.theme.font.size.xs} !important;
                color: ${(props) => props.theme.colors.text.muted} !important;
                margin: 0;
              }
            }

            /* Text inputs */
            input[type="text"],
            input[type="password"],
            input[type="email"] {
              background: ${(props) => props.theme.background.mantle} !important;
              color: ${(props) => props.theme.text} !important;
              border: 1px solid ${(props) => props.theme.border.border1} !important;
              border-radius: 4px !important;
              font-size: ${(props) => props.theme.font.size.sm} !important;
              padding: 6px 10px !important;
              outline: none !important;
              box-shadow: none !important;

              &:focus {
                border-color: ${(props) => props.theme.textLink} !important;
                outline: none !important;
                box-shadow: none !important;
              }
            }

            /* Checkboxes — custom styled to match theme */
            input[type="checkbox"] {
              appearance: none !important;
              -webkit-appearance: none !important;
              width: 14px !important;
              height: 14px !important;
              min-width: 14px;
              border: 1px solid ${(props) => props.theme.border.border1} !important;
              border-radius: 3px !important;
              background: ${(props) => props.theme.background.mantle} !important;
              cursor: pointer;
              position: relative;
              vertical-align: middle;

              &:checked {
                background: ${(props) => props.theme.textLink} !important;
                border-color: ${(props) => props.theme.textLink} !important;

                &::after {
                  content: '';
                  position: absolute;
                  left: 3px;
                  top: 1px;
                  width: 5px;
                  height: 8px;
                  border: 2px solid #fff;
                  border-top: none;
                  border-left: none;
                  transform: rotate(45deg);
                }
              }
            }

            /* "select all / select none" links */
            a {
              font-size: ${(props) => props.theme.font.size.xs};
              color: ${(props) => props.theme.textLink};
            }

            /* Dividers between auth sections */
            hr {
              border-color: ${(props) => props.theme.border.border1};
              margin: 12px 0;
            }

            /* Authorize / Close buttons */
            .btn-done,
            .auth-btn-wrapper .btn {
              font-size: ${(props) => props.theme.font.size.sm};
              border-radius: 4px;
              padding: 6px 16px;
              border: 1px solid ${(props) => props.theme.border.border1};
              background: transparent;
              color: ${(props) => props.theme.text};
              cursor: pointer;
              outline: none !important;
              box-shadow: none !important;

              &:hover {
                background: ${(props) => props.theme.background.mantle};
              }

              &.modal-btn-operation {
                background: ${(props) => props.theme.textLink};
                color: #fff;
                border-color: transparent;

                &:hover {
                  opacity: 0.9;
                }
              }
            }
          }
        }

        .backdrop-ux {
          background: rgba(0, 0, 0, 0.5);
        }
      }
    }
  }
`;

export default StyledWrapper;
