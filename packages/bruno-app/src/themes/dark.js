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

    name: {
      color: '#569cd6'
    }
  },

  menubar: {
    bg: '#333333'
  },

  sidebar: {
    color: '#ccc',
    muted: '#9d9d9d',
    bg: '#252526',
    dragbar: '#666666',

    badge: {
      bg: '#3D3D3D'
    },

    search: {
      border: '1px solid transparent',
      bg: '#3D3D3D'
    },

    collection: {
      item: {
        bg: '#37373D',
        hoverBg: '#2A2D2F',
        indentBorder: 'solid 1px #585858',
        active: {
          indentBorder: 'solid 1px #4c4c4c'
        }
      }
    },

    dropdownIcon: {
      color: '#ccc'
    }
  },

  welcome: {
    heading: '#569cd6',
    muted: '#9d9d9d'
  },

  dropdown: {
    color: 'rgb(204, 204, 204)',
    iconColor: 'rgb(204, 204, 204)',
    bg: 'rgb(48, 48, 49)',
    hoverBg: '#185387',
    shadow: 'rgb(0 0 0 / 36%) 0px 2px 8px',
    separator: '#444',
    labelBg: '#4a4949'
  },

  request: {
    methods: {
      get: '#8cd656',
      post: '#cd56d6',
      put: '#d69956',
      delete: '#f06f57',
      // customize these colors if needed
      patch: '#d69956',
      options: '#d69956',
      head: '#d69956'
    }
  },

  requestTabPanel: {
    url: {
      bg: '#3D3D3D',
      icon: 'rgb(204, 204, 204)'
    },
    dragbar: {
      border: '#444',
      activeBorder: '#8a8a8a'
    },
    bodyModeSelect: {
      color: 'transparent'
    },
    responseSendIcon: '#555',
    responseStatus: '#ccc',
    responseOk: '#8cd656',
    responseError: '#f06f57',
    responseOverlayBg: 'rgba(30, 30, 30, 0.6)'
  },

  collection: {
    environment: {
      bg: '#3D3D3D',

      settings: {
        bg: '#3D3D3D',
        sidebar: {
          bg: '#3D3D3D',
          borderRight: '#4f4f4f'
        },
        item: {
          border: '#569cd6',
          hoverBg: 'transparent',
          active: {
            bg: 'transparent',
            hoverBg: 'transparent'
          }
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
      active: {
        border: '#569cd6',
        bg: '#4f4f4f',
        hoverBg: '#4f4f4f'
      }
    }
  },

  markDownEditor: {
    hoverBg: '#2A2A2A',
    hr: {
      border: '1px solid #d3d3d3'
    }
  },

  modal: {
    title: {
      color: '#ccc',
      bg: 'rgb(38, 38, 39)',
      iconColor: '#ccc'
    },
    body: {
      color: '#ccc',
      bg: 'rgb(48, 48, 49)'
    },
    input: {
      bg: 'rgb(65, 65, 65)',
      border: 'rgb(65, 65, 65)',
      focusBorder: 'rgb(65, 65, 65)'
    },
    backdrop: {
      opacity: 0.2
    }
  },

  button: {
    secondary: {
      color: 'rgb(204, 204, 204)',
      bg: '#185387',
      border: '#185387',
      hoverBorder: '#696969'
    },
    close: {
      color: '#ccc',
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: ''
    },
    disabled: {
      color: '#a5a5a5',
      bg: '#626262',
      border: '#626262'
    },
    danger: {
      color: '#fff',
      bg: '#dc3545',
      border: '#dc3545'
    }
  },

  tabs: {
    active: {
      color: '#ccc',
      border: '#569cd6'
    }
  },

  requestTabs: {
    color: '#ccc',
    bg: '#2A2D2F',
    bottomBorder: '#444',
    icon: {
      color: '#9f9f9f',
      hoverColor: 'rgb(204, 204, 204)',
      hoverBg: '#1e1e1e'
    },
    active: {
      bg: '#3D3D3D'
    },
    shortTab: {
      color: '#ccc',
      bg: 'transparent',
      hoverColor: '#ccc',
      hoverBg: '#3D3D3D'
    }
  },

  codemirror: {
    bg: '#1e1e1e',
    border: '#373737',
    gutter: {
      bg: '#262626'
    },
    variable: {
      valid: 'rgb(11 178 126)',
      invalid: '#f06f57',
      info: {
        color: '#ce9178',
        bg: 'rgb(48,48,49)',
        boxShadow: 'rgb(0 0 0 / 36%) 0px 2px 8px'
      }
    }
  },

  table: {
    border: '#333',
    thead: {
      color: 'rgb(204, 204, 204)'
    },
    striped: '#2A2D2F',
    input: {
      color: '#ccc'
    }
  },

  plainGrid: {
    hoverBg: '#3D3D3D'
  },

  scrollbar: {
    color: 'rgb(52 51 49)'
  }
};

export default darkTheme;
