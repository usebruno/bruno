const darkTheme = {
  brand: '#546de5',
  text: '#d4d4d4',
  textLink: '#569cd6',
  bg: '#1e1e1e',

  colors: {
    text: {
      green: 'rgb(11 178 126)',
      danger: '#f06f57',
      muted: '#9d9d9d',
      purple: '#cd56d6',
      yellow: '#f59e0b'
    },
    bg: {
      danger: '#d03544'
    }
  },

  input: {
    bg: 'rgb(65, 65, 65)',
    border: 'rgb(65, 65, 65)',
    focusBorder: 'rgb(65, 65, 65)',
    placeholder: {
      color: '#a2a2a2',
      opacity: 0.75
    }
  },

  variables: {
    bg: 'rgb(48, 48, 49)',
    name: { color: '#569cd6' }
  },

  menubar: { bg: '#333333' },

  sidebar: {
    color: '#ccc',
    muted: '#9d9d9d',
    bg: '#252526',
    dragbar: '#666666',

    badge: { bg: '#3D3D3D' },

    search: { border: '1px solid transparent', bg: '#3D3D3D' },

    collection: {
      item: {
        bg: '#37373D',
        hoverBg: '#2A2D2F',
        indentBorder: 'solid 1px #585858',
        active: { indentBorder: 'solid 1px #4c4c4c' }
      }
    },

    dropdownIcon: { color: '#ccc' }
  },

  welcome: {
    heading: '#569cd6',
    muted: '#9d9d9d'
  },

  dropdown: {
    color: 'rgb(204, 204, 204)',
    iconColor: 'rgb(204, 204, 204)',
    bg: 'rgb(48, 48, 49)',
    hoverBg: '#6A6A6A29',
    shadow: 'rgb(0 0 0 / 36%) 0px 2px 8px',
    separator: '#444',
    labelBg: '#4a4949',
    selectedBg: '#F59E0B14',
    selectedColor: '#F59E0B',
    mutedText: '#9B9B9B',
    primaryText: '#D4D4D4',
    secondaryText: '#9CA3AF',
    headingText: '#FFFFFF'
  },

  request: {
    methods: {
      get: '#8cd656',
      post: '#cd56d6',
      put: '#d69956',
      delete: '#f06f57',
      patch: '#d69956',
      options: '#d69956',
      head: '#d69956'
    },
    grpc: '#6366f1',
    ws: '#f59e0b',
    gql: '#e535ab'
  },

  requestTabPanel: {
    url: { bg: '#3D3D3D', icon: 'rgb(204, 204, 204)' },
    dragbar: { border: '#444', activeBorder: '#8a8a8a' },
    bodyModeSelect: { color: 'transparent' },
    responseSendIcon: '#555',
    responseStatus: '#ccc',
    responseOk: '#8cd656',
    responseError: '#f06f57',
    responsePending: '#569cd6',
    responseOverlayBg: 'rgba(30, 30, 30, 0.6)',

    card: { bg: '#252526', border: 'transparent', borderDark: '#8cd656', hr: '#424242' },

    cardTable: {
      border: '#333',
      bg: '#252526',
      table: {
        thead: { bg: '#3D3D3D', color: '#ccc' }
      }
    },
    graphqlDocsExplorer: { bg: '#1e1e1e', color: '#d4d4d4' }
  },

  collection: {
    environment: {
      bg: '#3D3D3D',
      settings: {
        bg: '#3D3D3D',
        sidebar: { bg: '#3D3D3D', borderRight: '#4f4f4f' },
        item: {
          border: '#569cd6',
          hoverBg: 'transparent',
          active: { bg: 'transparent', hoverBg: 'transparent' }
        },
        gridBorder: '#4f4f4f'
      }
    }
  },

  notifications: {
    bg: '#3D3D3D',
    list: {
      bg: '3D3D3D',
      borderRight: '#4f4f4f',
      borderBottom: '#545454',
      hoverBg: '#434343',
      active: { border: '#569cd6', bg: '#4f4f4f', hoverBg: '#4f4f4f' }
    }
  },

  modal: {
    title: { color: '#ccc', bg: 'rgb(38, 38, 39)', iconColor: '#ccc' },
    body: { color: '#ccc', bg: 'rgb(48, 48, 49)' },
    input: { bg: 'rgb(65, 65, 65)', border: 'rgb(65, 65, 65)', focusBorder: 'rgb(65, 65, 65)' },
    backdrop: { opacity: 0.2 }
  },

  button: {
    secondary: {
      color: 'rgb(204, 204, 204)',
      bg: '#185387',
      border: '#185387',
      hoverBorder: '#696969'
    },
    close: { color: '#ccc', bg: 'transparent', border: 'transparent', hoverBorder: '' },
    disabled: { color: '#a5a5a5', bg: '#626262', border: '#626262' },
    danger: { color: '#fff', bg: '#dc3545', border: '#dc3545' }
  },

  tabs: { active: { color: '#CCCCCC', border: '#F59E0B' } },

  requestTabs: {
    color: '#ccc',
    bg: '#2A2D2F',
    bottomBorder: '#444',
    icon: { color: '#9f9f9f', hoverColor: 'rgb(204, 204, 204)', hoverBg: '#1e1e1e' },
    active: { bg: '#3D3D3D' },
    shortTab: { color: '#ccc', bg: 'transparent', hoverColor: '#ccc', hoverBg: '#3D3D3D' }
  },

  codemirror: {
    bg: '#1e1e1e',
    border: '#373737',
    placeholder: { color: '#a2a2a2', opacity: 0.50 },
    gutter: { bg: '#262626' },

    // Hardcoded default CodeMirror syntax colors for dark
    syntax: {
      property: '#9cdcfe',
      string: '#ce9178',
      number: '#b5cea8',
      boolean: '#569cd6'
    },

    variable: {
      valid: 'rgb(11 178 126)',
      invalid: '#f06f57',
      info: {
        color: '#ce9178',
        bg: 'rgb(48,48,49)',
        boxShadow: 'rgb(0 0 0 / 36%) 0px 2px 8px'
      }
    },
    searchLineHighlightCurrent: 'rgba(120,120,120,0.18)',
    searchMatch: '#FFD700',
    searchMatchActive: '#FFFF00'
  },

  table: {
    border: '#333',
    thead: { color: 'rgb(204, 204, 204)' },
    striped: '#2A2D2F',
    input: { color: '#ccc' }
  },

  plainGrid: { hoverBg: '#3D3D3D' },

  scrollbar: { color: 'rgb(52 51 49)' },

  dragAndDrop: {
    border: '#666666',
    borderStyle: '2px solid',
    hoverBg: 'rgba(102, 102, 102, 0.08)',
    transition: 'all 0.1s ease'
  },

  infoTip: { bg: '#1f1f1f', border: '#333333', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)' },

  statusBar: { border: '#323233', color: 'rgb(169, 169, 169)' },

  console: {
    bg: '#1e1e1e',
    headerBg: '#2d2d30',
    contentBg: '#1e1e1e',
    border: '#3c3c3c',
    titleColor: '#cccccc',
    countColor: '#858585',
    buttonColor: '#cccccc',
    buttonHoverBg: 'rgba(255, 255, 255, 0.1)',
    buttonHoverColor: '#ffffff',
    messageColor: '#cccccc',
    timestampColor: '#858585',
    emptyColor: '#858585',
    logHoverBg: 'rgba(255, 255, 255, 0.05)',
    resizeHandleHover: '#0078d4',
    resizeHandleActive: '#0078d4',
    dropdownBg: '#2d2d30',
    dropdownHeaderBg: '#3c3c3c',
    optionHoverBg: 'rgba(255, 255, 255, 0.05)',
    optionLabelColor: '#cccccc',
    optionCountColor: '#858585',
    checkboxColor: '#0078d4',
    scrollbarTrack: '#2d2d30',
    scrollbarThumb: '#5a5a5a',
    scrollbarThumbHover: '#6a6a6a'
  },

  grpc: {
    tabNav: {
      container: {
        bg: '#262626'
      },
      button: {
        active: {
          bg: '#404040',
          color: '#ffffff'
        },
        inactive: {
          bg: 'transparent',
          color: '#a3a3a3'
        }
      }
    },
    importPaths: {
      header: {
        text: '#9d9d9d',
        button: {
          color: '#9d9d9d',
          hoverColor: '#d4d4d4'
        }
      },
      error: {
        bg: 'transparent',
        text: '#f06f57',
        link: {
          color: '#f06f57',
          hoverColor: '#ff8a7a'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        text: '#d4d4d4',
        icon: '#9d9d9d',
        checkbox: {
          color: '#d4d4d4'
        },
        invalid: {
          opacity: 0.6,
          text: '#f06f57'
        }
      },
      empty: {
        text: '#9d9d9d'
      },
      button: {
        bg: '#185387',
        color: '#d4d4d4',
        border: '#185387',
        hoverBorder: '#696969'
      }
    },
    protoFiles: {
      header: {
        text: '#9d9d9d',
        button: {
          color: '#9d9d9d',
          hoverColor: '#d4d4d4'
        }
      },
      error: {
        bg: 'transparent',
        text: '#f06f57',
        link: {
          color: '#f06f57',
          hoverColor: '#ff8a7a'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        selected: {
          bg: 'rgba(245, 158, 11, 0.2)',
          border: '#f59e0b'
        },
        text: '#d4d4d4',
        secondaryText: '#9d9d9d',
        icon: '#9d9d9d',
        invalid: {
          opacity: 0.6,
          text: '#f06f57'
        }
      },
      empty: {
        text: '#9d9d9d'
      },
      button: {
        bg: '#185387',
        color: '#d4d4d4',
        border: '#185387',
        hoverBorder: '#696969'
      }
    }
  }
};

export default darkTheme;
