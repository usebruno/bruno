import { rgba } from 'polished';

const colors = {
  BRAND: '#a3a3a3',
  TEXT: '#d4d4d4',
  TEXT_MUTED: '#858585',
  TEXT_LINK: '#b0b0b0',
  BG: '#1e1e1e',

  GREEN: '#a3a3a3',
  YELLOW: '#a3a3a3',
  WHITE: '#fff',
  BLACK: '#000',

  GRAY_1: '#252526',
  GRAY_2: '#3D3D3D',
  GRAY_3: '#444444',
  GRAY_4: '#666666',
  GRAY_5: '#b0b0b0',
  GRAY_6: '#cbcbcb',
  GRAY_7: '#e5e5e5',
  GRAY_8: '#eaeaea',
  GRAY_9: '#f3f3f3',
  GRAY_10: '#f8f8f8',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#b0b0b0',
    PROPERTY: '#a3a3a3',
    STRING: '#c0c0c0',
    NUMBER: '#b0b0b0',
    ATOM: '#a3a3a3',
    VARIABLE: '#b0b0b0',
    KEYWORD: '#d4d4d4',
    COMMENT: '#6a6a6a',
    OPERATOR: '#d4d4d4',
    TAG: '#d4d4d4',
    TAG_BRACKET: '#6a6a6a'
  }
};

export const palette = {};

palette.intent = {
  INFO: '#8a8a8a',
  SUCCESS: '#a3a3a3',
  WARNING: '#b0b0b0',
  DANGER: '#c0c0c0'
};

const darkMonochromeTheme = {
  mode: 'dark',
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  draftColor: '#8a8a8a',
  bg: colors.BG,

  primary: {
    solid: colors.BRAND,
    text: colors.BRAND,
    strong: colors.BRAND,
    subtle: colors.BRAND
  },

  accents: {
    primary: colors.BRAND
  },

  background: {
    base: colors.BG,
    mantle: colors.GRAY_1,
    crust: '#333333',
    surface0: colors.GRAY_2,
    surface1: colors.GRAY_3,
    surface2: colors.GRAY_4
  },

  status: {
    info: {
      background: rgba(palette.intent.INFO, 0.15),
      text: palette.intent.INFO,
      border: palette.intent.INFO
    },
    success: {
      background: rgba(palette.intent.SUCCESS, 0.15),
      text: palette.intent.SUCCESS,
      border: palette.intent.SUCCESS
    },
    warning: {
      background: rgba(palette.intent.WARNING, 0.15),
      text: palette.intent.WARNING,
      border: palette.intent.WARNING
    },
    danger: {
      background: rgba(palette.intent.DANGER, 0.15),
      text: palette.intent.DANGER,
      border: palette.intent.DANGER
    }
  },

  overlay: {
    overlay2: '#666666',
    overlay1: '#555555',
    overlay0: '#444444'
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
    sm: '0 1px 3px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.3)',
    md: '0 2px 8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.4)',
    lg: '0 2px 12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 0, 0, 0.4)'
  },

  border: {
    radius: {
      sm: '4px',
      base: '6px',
      md: '8px',
      lg: '10px',
      xl: '12px'
    },
    border2: colors.GRAY_4,
    border1: colors.GRAY_3,
    border0: colors.GRAY_2
  },

  colors: {
    text: {
      white: colors.WHITE,
      green: '#a3a3a3',
      danger: '#b0b0b0',
      warning: '#a3a3a3',
      muted: colors.TEXT_MUTED,
      purple: '#a3a3a3',
      yellow: colors.YELLOW,
      subtext2: colors.GRAY_6,
      subtext1: colors.GRAY_5,
      subtext0: colors.GRAY_4
    },
    bg: {
      danger: '#666666'
    },
    accent: colors.BRAND
  },

  input: {
    bg: 'transparent',
    border: colors.GRAY_3,
    focusBorder: colors.BRAND,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.6
    }
  },

  sidebar: {
    color: '#ccc',
    muted: '#9d9d9d',
    bg: colors.GRAY_1,
    dragbar: {
      border: 'transparent',
      activeBorder: colors.GRAY_4
    },

    collection: {
      item: {
        bg: '#37373D',
        hoverBg: '#2A2D2F',
        focusBorder: '#4e4e4e',
        indentBorder: 'solid 1px #585858',
        active: {
          indentBorder: 'solid 1px #4c4c4c'
        },
        example: {
          iconColor: colors.GRAY_5
        }
      }
    },

    dropdownIcon: {
      color: '#ccc'
    }
  },

  dropdown: {
    color: 'rgb(204, 204, 204)',
    iconColor: 'rgb(204, 204, 204)',
    bg: 'rgb(48, 48, 49)',
    hoverBg: '#6A6A6A29',
    shadow: 'none',
    border: '#444',
    separator: '#444',
    selectedColor: '#a3a3a3',
    mutedText: '#9B9B9B'
  },

  workspace: {
    accent: '#a3a3a3',
    border: '#444',
    button: {
      bg: colors.GRAY_2
    }
  },

  request: {
    methods: {
      get: '#a3a3a3',
      post: '#b0b0b0',
      put: '#9a9a9a',
      delete: '#c0c0c0',
      patch: '#9a9a9a',
      options: '#8a8a8a',
      head: '#9da5b4'
    },

    grpc: '#a3a3a3',
    ws: '#b0b0b0',
    gql: '#9a9a9a'
  },

  requestTabPanel: {
    url: {
      bg: colors.BG,
      icon: 'rgb(204, 204, 204)',
      iconDanger: '#b0b0b0',
      border: `solid 1px ${colors.GRAY_3}`
    },
    dragbar: {
      border: '#444',
      activeBorder: '#8a8a8a'
    },
    responseStatus: '#ccc',
    responseOk: '#a3a3a3',
    responseError: '#b0b0b0',
    responsePending: '#a3a3a3',
    responseOverlayBg: 'rgba(30, 30, 30, 0.6)',

    card: {
      bg: '#252526',
      border: 'transparent',
      hr: '#424242'
    },

    graphqlDocsExplorer: {
      bg: '#1e1e1e',
      color: '#d4d4d4'
    }
  },

  notifications: {
    bg: colors.GRAY_3,
    list: {
      bg: '3D3D3D',
      borderRight: '#4f4f4f',
      borderBottom: '#545454',
      hoverBg: '#434343',
      active: {
        border: '#a3a3a3',
        bg: '#4f4f4f',
        hoverBg: '#4f4f4f'
      }
    }
  },

  modal: {
    title: {
      color: '#ccc',
      bg: 'rgb(38, 38, 39)'
    },
    body: {
      color: '#ccc',
      bg: 'rgb(48, 48, 49)'
    },
    input: {
      bg: 'transparent',
      border: colors.GRAY_3,
      focusBorder: colors.BRAND
    },
    backdrop: {
      opacity: 0.2
    }
  },

  button: {
    secondary: {
      color: 'rgb(204, 204, 204)',
      bg: '#525252',
      border: '#525252',
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
      bg: '#666666',
      border: '#666666'
    }
  },
  button2: {
    color: {
      primary: {
        bg: colors.BRAND,
        text: colors.BLACK,
        border: colors.BRAND
      },
      light: {
        bg: rgba(colors.TEXT, 0.08),
        text: colors.TEXT,
        border: rgba(colors.TEXT, 0.06)
      },
      secondary: {
        bg: colors.BG,
        text: colors.TEXT,
        border: colors.GRAY_5
      },
      success: {
        bg: '#666666',
        text: '#fff',
        border: '#666666'
      },
      warning: {
        bg: '#858585',
        text: '#1e1e1e',
        border: '#858585'
      },
      danger: {
        bg: '#737373',
        text: '#fff',
        border: '#737373'
      }
    }
  },

  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: '#CCCCCC',
      border: '#a3a3a3'
    },
    secondary: {
      active: {
        bg: '#3F3F3F',
        color: '#CCCCCC'
      },
      inactive: {
        bg: '#3F3F3F',
        color: '#999999'
      }
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
    example: {
      iconColor: colors.GRAY_5
    }
  },

  codemirror: {
    bg: colors.BG,
    border: colors.BG,
    placeholder: {
      color: '#a2a2a2',
      opacity: 0.5
    },
    gutter: {
      bg: colors.BG
    },
    variable: {
      valid: '#a3a3a3',
      invalid: '#b0b0b0',
      prompt: '#a3a3a3'
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
      operator: colors.CODEMIRROR_TOKENS.OPERATOR,
      tag: colors.CODEMIRROR_TOKENS.TAG,
      tagBracket: colors.CODEMIRROR_TOKENS.TAG_BRACKET
    },
    searchLineHighlightCurrent: 'rgba(120,120,120,0.18)',
    searchMatch: '#a3a3a3',
    searchMatchActive: '#d4d4d4'
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
    hoverBg: colors.GRAY_3
  },

  scrollbar: {
    color: 'rgb(52 51 49)'
  },

  dragAndDrop: {
    border: '#666666',
    borderStyle: '2px solid',
    hoverBg: 'rgba(102, 102, 102, 0.08)',
    transition: 'all 0.1s ease'
  },
  infoTip: {
    bg: '#1f1f1f',
    border: '#333333',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
  },

  statusBar: {
    border: '#323233',
    color: 'rgb(169, 169, 169)'
  },

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
    resizeHandleHover: '#a3a3a3',
    resizeHandleActive: '#a3a3a3',
    dropdownBg: '#2d2d30',
    dropdownHeaderBg: '#3c3c3c',
    optionHoverBg: 'rgba(255, 255, 255, 0.05)',
    optionLabelColor: '#cccccc',
    optionCountColor: '#858585',
    checkboxColor: colors.BRAND,
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
        text: '#b0b0b0',
        link: {
          color: '#b0b0b0',
          hoverColor: '#c0c0c0'
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
          text: '#b0b0b0'
        }
      },
      empty: {
        text: '#9d9d9d'
      },
      button: {
        bg: '#525252',
        color: '#d4d4d4',
        border: '#525252',
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
        text: '#b0b0b0',
        link: {
          color: '#b0b0b0',
          hoverColor: '#c0c0c0'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        selected: {
          bg: 'rgba(163, 163, 163, 0.2)',
          border: '#a3a3a3'
        },
        text: '#d4d4d4',
        secondaryText: '#9d9d9d',
        icon: '#9d9d9d',
        invalid: {
          opacity: 0.6,
          text: '#b0b0b0'
        }
      },
      empty: {
        text: '#9d9d9d'
      },
      button: {
        bg: '#525252',
        color: '#d4d4d4',
        border: '#525252',
        hoverBorder: '#696969'
      }
    }
  },
  deprecationWarning: {
    bg: 'rgba(176, 176, 176, 0.1)',
    border: 'rgba(176, 176, 176, 0.1)',
    icon: '#b0b0b0',
    text: '#B8B8B8'
  },

  examples: {
    buttonBg: '#a3a3a31A',
    buttonColor: '#a3a3a3',
    buttonText: '#fff',
    buttonIconColor: '#fff',
    border: '#444',
    urlBar: {
      border: colors.GRAY_3,
      bg: '#292929'
    },
    table: {
      thead: {
        bg: '#292929',
        color: '#969696'
      }
    },
    checkbox: {
      color: '#000'
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.BG,
          border: colors.GRAY_3,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.TEXT_MUTED,
          separator: colors.GRAY_3,
          hoverBg: colors.BG,
          hoverBorder: colors.GRAY_4,

          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.BG,
            border: colors.GRAY_3,
            hoverBg: colors.BG,
            hoverBorder: colors.GRAY_4
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(163, 163, 163, 0.12)',
            color: '#a3a3a3'
          },
          developerMode: {
            bg: 'rgba(163, 163, 163, 0.11)',
            color: '#a3a3a3'
          }
        }
      }
    }
  }
};

export default darkMonochromeTheme;
