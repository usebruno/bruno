const lightTheme = {
  brand: '#546de5',
  text: 'rgb(52, 52, 52)',
  textLink: '#1663bb',
  bg: '#fff',

  colors: {
    text: {
      green: '#047857',
      danger: '#B91C1C',
      muted: '#838383',
      purple: '#8e44ad',
      yellow: '#d97706'
    },
    bg: {
      danger: '#dc3545'
    }
  },

  input: {
    bg: 'white',
    border: '#ccc',
    focusBorder: '#8b8b8b',
    placeholder: {
      color: '#a2a2a2',
      opacity: 0.8
    }
  },

  menubar: {
    bg: 'rgb(44, 44, 44)'
  },

  variables: {
    bg: '#fff',

    name: {
      color: '#546de5'
    }
  },

  sidebar: {
    color: 'rgb(52, 52, 52)',
    muted: '#4b5563',
    bg: '#F3F3F3',
    dragbar: 'rgb(200, 200, 200)',

    badge: {
      bg: '#e1e1e1'
    },

    search: {
      border: '1px solid rgb(211 211 211)',
      bg: '#fff'
    },

    collection: {
      item: {
        bg: '#e1e1e1',
        hoverBg: '#e7e7e7',
        indentBorder: 'solid 1px #e1e1e1',
        active: {
          indentBorder: 'solid 1px #d0d0d0'
        }
      }
    },

    dropdownIcon: {
      color: 'rgb(110 110 110)'
    }
  },

  welcome: {
    heading: '#737373',
    muted: '#4b5563'
  },

  dropdown: {
    color: 'rgb(48 48 48)',
    iconColor: 'rgb(75, 85, 99)',
    bg: '#fff',
    hoverBg: '#e9e9e9',
    shadow: 'rgb(50 50 93 / 25%) 0px 6px 12px -2px, rgb(0 0 0 / 30%) 0px 3px 7px -3px',
    separator: '#e7e7e7',
    labelBg: '#f3f3f3'
  },

  request: {
    methods: {
      get: 'rgb(5, 150, 105)',
      post: '#8e44ad',
      put: '#ca7811',
      delete: 'rgb(185, 28, 28)',
      // customize these colors if needed
      patch: '#ca7811',
      options: '#ca7811',
      head: '#ca7811'
    },
    grpc: '#6366f1',
    ws: '#f59e0b'
  },

  requestTabPanel: {
    url: {
      bg: '#f3f3f3',
      border: '#efefef',
      icon: '#515151',
      hoverBg: '#f9fafb',
      errorHoverBg: '#fef2f2'
    },
    body: {
      bg: '#ffffff',
      border: '#e5e7eb',
      headerBg: '#f9fafb',
      footerBg: '#f9fafb',
      addBtnBg: '#6366f1',
      addBtnColor: '#ffffff',
      addBtnBorder: '#6366f1',
      addBtnHoverBg: '#4f46e5',
      addBtnHoverBorder: '#4f46e5',
      messageBorder: '#d1d5db',
      messageHeaderBg: '#f9fafb',
      inputColor: '#374151',
      placeholderColor: '#9ca3af',
      textareaBg: '#f9fafb',
      textareaColor: '#374151',
      removeBtnColor: '#6b7280',
      removeBtnHoverBg: '#fef2f2',
      removeBtnHoverColor: '#dc2626',
      statusColor: '#6b7280',
      shortcutBg: '#e5e7eb'
    },
    dragbar: {
      border: '#efefef',
      activeBorder: 'rgb(200, 200, 200)'
    },
    bodyModeSelect: {
      color: '#efefef'
    },
    responseSendIcon: 'rgb(209, 213, 219)',
    responseStatus: 'rgb(117 117 117)',
    responseOk: '#047857',
    responseError: 'rgb(185, 28, 28)',
    responsePending: '#1663bb',
    responseOverlayBg: 'rgba(255, 255, 255, 0.6)',
    card: {
      bg: '#fff',
      border: '#f4f4f4',
      hr: '#f4f4f4'
    },
    cardTable: {
      border: '#efefef',
      bg: '#fff',
      table: {
        thead: {
          bg: 'rgb(249, 250, 251)',
          color: 'rgb(75 85 99)'
        }
      }
    }
  },

  collection: {
    environment: {
      bg: '#efefef',

      settings: {
        bg: 'white',
        sidebar: {
          bg: '#eaeaea',
          borderRight: 'transparent'
        },
        item: {
          border: '#546de5',
          hoverBg: '#e4e4e4',
          active: {
            bg: '#dcdcdc',
            hoverBg: '#dcdcdc'
          }
        },
        gridBorder: '#f4f4f4'
      }
    },

    sidebar: {
      bg: '#eaeaea'
    }
  },

  notifications: {
    bg: 'white',
    list: {
      bg: '#eaeaea',
      borderRight: 'transparent',
      borderBottom: '#d3d3d3',
      hoverBg: '#e4e4e4',
      active: {
        border: '#546de5',
        bg: '#dcdcdc',
        hoverBg: '#dcdcdc'
      }
    }
  },

  modal: {
    title: {
      color: 'rgb(86 86 86)',
      bg: '#f1f1f1',
      iconColor: 'black'
    },
    body: {
      color: 'rgb(52, 52, 52)',
      bg: 'white'
    },
    input: {
      bg: 'white',
      border: '#ccc',
      focusBorder: '#8b8b8b'
    },
    backdrop: {
      opacity: 0.4
    }
  },

  button: {
    secondary: {
      color: '#212529',
      bg: '#e2e6ea',
      border: '#dae0e5',
      hoverBorder: '#696969'
    },
    close: {
      color: '212529',
      bg: 'white',
      border: 'white',
      hoverBorder: ''
    },
    disabled: {
      color: '#9f9f9f',
      bg: '#efefef',
      border: 'rgb(234, 234, 234)'
    },
    danger: {
      color: '#fff',
      bg: '#dc3545',
      border: '#dc3545'
    }
  },

  tabs: {
    active: {
      color: 'rgb(50, 46, 44)',
      border: '#546de5'
    }
  },

  requestTabs: {
    color: 'rgb(52, 52, 52)',
    bg: '#f7f7f7',
    bottomBorder: '#efefef',
    icon: {
      color: '#9f9f9f',
      hoverColor: 'rgb(76 76 76)',
      hoverBg: 'rgb(234, 234, 234)'
    },
    active: {
      bg: '#e7e7e7'
    },
    shortTab: {
      color: 'rgb(117 117 117)',
      bg: 'white',
      hoverColor: 'rgb(76 76 76)',
      hoverBg: '#eaeaea'
    }
  },

  codemirror: {
    bg: 'white',
    border: '#efefef',
    placeholder: {
      color: '#a2a2a2',
      opacity: 0.75
    },
    gutter: {
      bg: '#f3f3f3'
    },
    variable: {
      valid: '#047857',
      invalid: 'rgb(185, 28, 28)',
      info: {
        color: 'rgb(52, 52, 52)',
        bg: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.45)'
      }
    }
  },

  table: {
    border: '#efefef',
    thead: {
      color: '#616161'
    },
    striped: '#f3f3f3',
    input: {
      color: '#000000'
    }
  },

  plainGrid: {
    hoverBg: '#f4f4f4'
  },

  scrollbar: {
    color: 'rgb(152 151 149)'
  },

  dragAndDrop: {
    border: '#8b8b8b', // Using the same gray as focusBorder from input
    borderStyle: '2px solid',
    hoverBg: 'rgba(139, 139, 139, 0.05)', // Matching the border color with reduced opacity
    transition: 'all 0.1s ease'
  },

  tooltip: {
    bg: '#374151',
    color: '#ffffff',
    shortcutColor: '#f59e0b'
  },

  infoTip: {
    bg: 'white',
    border: '#e0e0e0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },

  responseTabPanel: {
    bg: '#ffffff',
    border: '#e5e7eb',
    headerBg: '#f9fafb',
    sectionBorder: '#e5e7eb',
    labelColor: '#6b7280',
    messageBorder: '#d1d5db',
    messageHeaderBg: '#f9fafb',
    messageTextColor: '#374151',
    copyBtnColor: '#6b7280',
    copyBtnHoverBg: '#f3f4f6',
    copyBtnHoverColor: '#dc2626',
    errorBg: '#fef2f2',
    errorBorder: '#fecaca',
    errorColor: '#dc2626'
  },

  statusBar: {
    border: '#E9E9E9',
    color: 'rgb(100, 100, 100)'
  },
  console: {
    bg: '#f8f9fa',
    headerBg: '#f8f9fa',
    contentBg: '#ffffff',
    border: '#dee2e6',
    titleColor: '#212529',
    countColor: '#6c757d',
    buttonColor: '#495057',
    buttonHoverBg: '#e9ecef',
    buttonHoverColor: '#212529',
    messageColor: '#212529',
    timestampColor: '#6c757d',
    emptyColor: '#6c757d',
    logHoverBg: 'rgba(0, 0, 0, 0.03)',
    resizeHandleHover: '#0d6efd',
    resizeHandleActive: '#0d6efd',
    dropdownBg: '#ffffff',
    dropdownHeaderBg: '#f8f9fa',
    optionHoverBg: '#f8f9fa',
    optionLabelColor: '#212529',
    optionCountColor: '#6c757d',
    checkboxColor: '#0d6efd',
    scrollbarTrack: '#f8f9fa',
    scrollbarThumb: '#ced4da',
    scrollbarThumbHover: '#adb5bd'
  }
};

export default lightTheme;
