const colors = {
  BRAND: '#525252',
  TEXT: 'rgb(52, 52, 52)',
  TEXT_MUTED: '#737373',
  TEXT_LINK: '#404040',
  BACKGROUND: '#fff',

  WHITE: '#fff',
  BLACK: '#000',
  SLATE_BLACK: '#343434',
  GREEN: '#525252',
  YELLOW: '#525252',

  GRAY_1: '#f8f8f8',
  GRAY_2: '#f3f3f3',
  GRAY_3: '#eaeaea',
  GRAY_4: '#e5e5e5',
  GRAY_5: '#cbcbcb',
  GRAY_6: '#b0b0b0',
  GRAY_7: '#666666',
  GRAY_8: '#444444',
  GRAY_9: '#3D3D3D',
  GRAY_10: '#252526',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#525252',
    PROPERTY: '#666666',
    STRING: '#737373',
    NUMBER: '#525252',
    ATOM: '#666666',
    VARIABLE: '#525252',
    KEYWORD: '#404040',
    COMMENT: '#a3a3a3',
    OPERATOR: '#737373'
  }
};

const lightMonochromeTheme = {
  mode: 'light',
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  bg: colors.BACKGROUND,

  accents: {
    primary: colors.BRAND
  },

  background: {
    base: colors.BACKGROUND,
    mantle: colors.GRAY_1,
    crust: colors.GRAY_2,
    surface0: colors.GRAY_3,
    surface1: colors.GRAY_4,
    surface2: colors.GRAY_5
  },

  overlay: {
    overlay2: colors.GRAY_6,
    overlay1: '#c0c0c0',
    overlay0: '#d0d0d0'
  },

  font: {
    size: {
      xs: '0.6875rem',
      sm: '0.75rem',
      base: '0.8125rem',
      md: '0.875rem',
      lg: '1rem',
      xl: '1.125rem'
    }
  },

  shadow: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.06)',
    lg: '0 2px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
  },

  border: {
    radius: {
      sm: '4px',
      base: '6px',
      md: '8px',
      lg: '10px',
      xl: '12px'
    },
    border2: colors.GRAY_5,
    border1: colors.GRAY_4,
    border0: colors.GRAY_3
  },

  colors: {
    text: {
      white: '#fff',
      green: '#525252',
      danger: '#525252',
      warning: '#525252',
      muted: '#838383',
      purple: '#525252',
      yellow: colors.YELLOW,
      subtext2: colors.GRAY_7,
      subtext1: '#838383',
      subtext0: '#9B9B9B'
    },
    bg: {
      danger: '#525252'
    },
    accent: '#525252'
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

  sidebar: {
    color: 'rgb(52, 52, 52)',
    muted: '#4b5563',
    bg: colors.GRAY_1,
    dragbar: {
      border: colors.GRAY_4,
      activeBorder: colors.GRAY_5
    },

    collection: {
      item: {
        bg: colors.GRAY_3,
        hoverBg: colors.GRAY_3,
        focusBorder: colors.GRAY_5,
        indentBorder: `solid 1px ${colors.GRAY_4}`,
        active: {
          indentBorder: `solid 1px ${colors.GRAY_4}`
        },
        example: {
          iconColor: colors.GRAY_7
        }
      }
    },

    dropdownIcon: {
      color: 'rgb(110 110 110)'
    }
  },

  dropdown: {
    color: 'rgb(48 48 48)',
    iconColor: 'rgb(75, 85, 99)',
    bg: '#fff',
    hoverBg: '#e9ecef',
    shadow: 'rgb(50 50 93 / 25%) 0px 6px 12px -2px, rgb(0 0 0 / 30%) 0px 3px 7px -3px',
    border: 'none',
    separator: '#e7e7e7',
    selectedColor: '#525252',
    mutedText: '#9B9B9B'
  },

  workspace: {
    accent: '#525252',
    border: '#e7e7e7',
    button: {
      bg: colors.GRAY_3
    }
  },

  request: {
    methods: {
      get: '#525252',
      post: '#525252',
      put: '#737373',
      delete: '#404040',
      patch: '#737373',
      options: '#8a8a8a',
      head: '#6b6b6b'
    },

    grpc: '#525252',
    ws: '#737373',
    gql: '#404040'
  },

  requestTabPanel: {
    url: {
      bg: colors.WHITE,
      icon: '#515151',
      iconDanger: '#404040',
      border: `solid 1px ${colors.GRAY_4}`
    },
    dragbar: {
      border: '#efefef',
      activeBorder: 'rgb(200, 200, 200)'
    },
    responseStatus: 'rgb(117 117 117)',
    responseOk: '#525252',
    responseError: '#404040',
    responsePending: '#525252',
    responseOverlayBg: 'rgba(255, 255, 255, 0.6)',
    card: {
      bg: '#fff',
      border: '#f4f4f4',
      hr: '#f4f4f4'
    },
    graphqlDocsExplorer: {
      bg: '#fff',
      color: 'rgb(52, 52, 52)'
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
        border: '#525252',
        bg: '#dcdcdc',
        hoverBg: '#dcdcdc'
      }
    }
  },

  modal: {
    title: {
      color: 'rgb(86 86 86)',
      bg: '#f1f1f1'
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
      color: '#212529',
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
      bg: '#525252',
      border: '#525252'
    }
  },
  button2: {
    color: {
      primary: {
        bg: colors.BRAND,
        text: '#fff',
        border: colors.BRAND
      },
      secondary: {
        bg: '#e5e7eb',
        text: colors.TEXT,
        border: '#d1d5db'
      },
      success: {
        bg: '#525252',
        text: '#fff',
        border: '#525252'
      },
      warning: {
        bg: '#737373',
        text: '#fff',
        border: '#737373'
      },
      danger: {
        bg: '#404040',
        text: '#fff',
        border: '#404040'
      }
    }
  },
  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: colors.SLATE_BLACK,
      border: '#525252'
    },
    secondary: {
      active: {
        bg: '#FFFFFF',
        color: '#343434'
      },
      inactive: {
        bg: '#ECECEE',
        color: '#989898'
      }
    }
  },

  requestTabs: {
    color: 'rgb(52, 52, 52)',
    bg: '#f6f6f6',
    bottomBorder: '#efefef',
    icon: {
      color: '#9f9f9f',
      hoverColor: 'rgb(76 76 76)',
      hoverBg: 'rgb(234, 234, 234)'
    },
    example: {
      iconColor: colors.GRAY_7
    },
    shortTab: {
      color: 'rgb(117 117 117)',
      bg: 'white',
      hoverColor: 'rgb(76 76 76)',
      hoverBg: '#eaeaea'
    }
  },

  codemirror: {
    bg: colors.WHITE,
    border: colors.WHITE,
    placeholder: {
      color: '#a2a2a2',
      opacity: 0.75
    },
    gutter: {
      bg: colors.WHITE
    },
    variable: {
      valid: '#525252',
      invalid: '#404040',
      prompt: '#525252',
      info: {
        color: '#343434',
        bg: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.45)',
        editorBg: '#F7F7F7',
        iconColor: '#989898',
        editorBorder: '#EFEFEF',
        editorFocusBorder: '#989898',
        editableDisplayHoverBg: 'rgba(0,0,0,0.02)',
        border: '#EFEFEF'
      }
    },
    tokens: {
      definition: colors.CODEMIRROR_TOKENS.DEFINITION,
      property: colors.CODEMIRROR_TOKENS.PROPERTY,
      string: colors.CODEMIRROR_TOKENS.STRING,
      number: colors.CODEMIRROR_TOKENS.NUMBER,
      atom: colors.CODEMIRROR_TOKENS.ATOM,
      variable: colors.CODEMIRROR_TOKENS.VARIABLE,
      keyword: colors.CODEMIRROR_TOKENS.KEYWORD,
      comment: colors.CODEMIRROR_TOKENS.COMMENT,
      operator: colors.CODEMIRROR_TOKENS.OPERATOR
    },
    searchLineHighlightCurrent: 'rgba(120,120,120,0.10)',
    searchMatch: '#737373',
    searchMatchActive: '#525252'
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
    border: '#8b8b8b',
    borderStyle: '2px solid',
    hoverBg: 'rgba(139, 139, 139, 0.05)',
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: 'white',
    border: '#e0e0e0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
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
    resizeHandleHover: '#525252',
    resizeHandleActive: '#525252',
    dropdownBg: '#ffffff',
    dropdownHeaderBg: '#f8f9fa',
    optionHoverBg: '#f8f9fa',
    optionLabelColor: '#212529',
    optionCountColor: '#6c757d',
    checkboxColor: colors.BRAND,
    scrollbarTrack: '#f8f9fa',
    scrollbarThumb: '#ced4da',
    scrollbarThumbHover: '#adb5bd'
  },

  grpc: {
    tabNav: {
      container: {
        bg: '#f5f5f5'
      },
      button: {
        active: {
          bg: '#ffffff',
          color: '#000000'
        },
        inactive: {
          bg: 'transparent',
          color: '#525252'
        }
      }
    },
    importPaths: {
      header: {
        text: '#838383',
        button: {
          color: '#838383',
          hoverColor: '#343434'
        }
      },
      error: {
        bg: 'transparent',
        text: '#404040',
        link: {
          color: '#404040',
          hoverColor: '#525252'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(0, 0, 0, 0.05)',
        text: '#343434',
        icon: '#838383',
        checkbox: {
          color: '#343434'
        },
        invalid: {
          opacity: 0.6,
          text: '#404040'
        }
      },
      empty: {
        text: '#838383'
      },
      button: {
        bg: '#e2e6ea',
        color: '#212529',
        border: '#dae0e5',
        hoverBorder: '#696969'
      }
    },
    protoFiles: {
      header: {
        text: '#838383',
        button: {
          color: '#838383',
          hoverColor: '#343434'
        }
      },
      error: {
        bg: 'transparent',
        text: '#404040',
        link: {
          color: '#404040',
          hoverColor: '#525252'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(0, 0, 0, 0.05)',
        selected: {
          bg: 'rgba(82, 82, 82, 0.2)',
          border: '#525252'
        },
        text: '#343434',
        secondaryText: '#838383',
        icon: '#838383',
        invalid: {
          opacity: 0.6,
          text: '#404040'
        }
      },
      empty: {
        text: '#838383'
      },
      button: {
        bg: '#e2e6ea',
        color: '#212529',
        border: '#dae0e5',
        hoverBorder: '#696969'
      }
    }
  },
  deprecationWarning: {
    bg: 'rgba(64, 64, 64, 0.1)',
    border: 'rgba(64, 64, 64, 0.1)',
    icon: '#404040',
    text: '#343434'
  },

  examples: {
    buttonBg: '#5252521A',
    buttonColor: '#525252',
    buttonText: '#fff',
    buttonIconColor: '#000',
    border: '#efefef',
    urlBar: {
      border: '#efefef',
      bg: '#F5F5F5'
    },
    table: {
      thead: {
        bg: '#f8f9fa',
        color: '#212529'
      }
    },
    checkbox: {
      color: '#fff'
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.WHITE,
          border: colors.GRAY_4,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.GRAY_6,
          separator: colors.GRAY_4,
          hoverBg: colors.WHITE,
          hoverBorder: colors.GRAY_5,

          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.WHITE,
            border: colors.GRAY_5,
            hoverBg: colors.WHITE,
            hoverBorder: colors.GRAY_6
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(82, 82, 82, 0.12)',
            color: '#525252'
          },
          developerMode: {
            bg: 'rgba(115, 115, 115, 0.15)',
            color: '#737373'
          }
        }
      }
    }
  }
};

export default lightMonochromeTheme;
