// Catppuccin Macchiato - Dark Theme
// Based on https://catppuccin.com/palette/

const { rgba } = require('polished');

const colors = {
  // Catppuccin Macchiato Palette
  ROSEWATER: '#f4dbd6',
  FLAMINGO: '#f0c6c6',
  PINK: '#f5bde6',
  MAUVE: '#c6a0f6',
  RED: '#ed8796',
  MAROON: '#ee99a0',
  PEACH: '#f5a97f',
  YELLOW: '#eed49f',
  GREEN: '#a6da95',
  TEAL: '#8bd5ca',
  SKY: '#91d7e3',
  SAPPHIRE: '#7dc4e4',
  BLUE: '#8aadf4',
  LAVENDER: '#b7bdf8',

  TEXT: '#cad3f5',
  SUBTEXT1: '#b8c0e0',
  SUBTEXT0: '#a5adcb',
  OVERLAY2: '#939ab7',
  OVERLAY1: '#8087a2',
  OVERLAY0: '#6e738d',
  SURFACE2: '#5b6078',
  SURFACE1: '#494d64',
  SURFACE0: '#363a4f',
  BASE: '#24273a',
  MANTLE: '#1e2030',
  CRUST: '#181926',

  WHITE: '#fff',
  BLACK: '#000',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#a6da95',
    PROPERTY: '#8aadf4',
    STRING: '#eed49f',
    NUMBER: '#f5a97f',
    ATOM: '#f5bde6',
    VARIABLE: '#7dc4e4',
    KEYWORD: '#ed8796',
    COMMENT: '#6e738d',
    OPERATOR: '#8bd5ca',
    TAG: '#8aadf4',
    TAG_BRACKET: '#6e738d'
  }
};

const catppuccinMacchiatoTheme = {
  mode: 'dark',
  brand: colors.MAUVE,
  text: colors.TEXT,
  textLink: colors.BLUE,
  bg: colors.BASE,

  primary: {
    solid: colors.MAUVE,
    text: colors.MAUVE,
    strong: colors.MAUVE,
    subtle: colors.MAUVE
  },

  accents: {
    primary: colors.MAUVE
  },

  background: {
    base: colors.BASE,
    mantle: colors.MANTLE,
    crust: colors.CRUST,
    surface0: colors.SURFACE0,
    surface1: colors.SURFACE1,
    surface2: colors.SURFACE2
  },

  overlay: {
    overlay2: colors.OVERLAY2,
    overlay1: colors.OVERLAY1,
    overlay0: colors.OVERLAY0
  },

  font: {
    size: {
      xs: '0.6875rem', // 11px
      sm: '0.75rem', // 12px
      base: '0.8125rem', // 13px
      md: '0.875rem', // 14px
      lg: '1rem', // 16px
      xl: '1.125rem' // 18px
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
    border2: colors.SURFACE2,
    border1: colors.SURFACE1,
    border0: colors.SURFACE0
  },

  colors: {
    text: {
      white: colors.WHITE,
      green: colors.GREEN,
      danger: colors.RED,
      warning: colors.PEACH,
      muted: colors.SUBTEXT0,
      purple: colors.MAUVE,
      yellow: colors.YELLOW,
      subtext2: colors.TEXT,
      subtext1: colors.SUBTEXT1,
      subtext0: colors.SUBTEXT0
    },
    bg: {
      danger: colors.MAROON
    },
    accent: colors.MAUVE
  },

  input: {
    bg: 'transparent',
    border: colors.SURFACE1,
    focusBorder: colors.LAVENDER,
    placeholder: {
      color: colors.OVERLAY0,
      opacity: 0.75
    }
  },

  sidebar: {
    color: colors.TEXT,
    muted: colors.SUBTEXT0,
    bg: colors.BASE,
    dragbar: {
      border: colors.SURFACE0,
      activeBorder: colors.OVERLAY0
    },

    collection: {
      item: {
        bg: colors.SURFACE0,
        hoverBg: colors.SURFACE0,
        focusBorder: colors.SURFACE1,
        indentBorder: `solid 1px ${colors.SURFACE2}`,
        active: {
          indentBorder: `solid 1px ${colors.MAUVE}`
        },
        example: {
          iconColor: colors.OVERLAY1
        }
      }
    },

    dropdownIcon: {
      color: colors.TEXT
    }
  },

  dropdown: {
    color: colors.TEXT,
    iconColor: colors.SUBTEXT1,
    bg: colors.SURFACE0,
    hoverBg: 'rgba(110, 115, 141, 0.16)',
    shadow: 'none',
    border: rgba(colors.SURFACE1, 0.5),
    separator: colors.SURFACE1,
    selectedColor: colors.MAUVE,
    mutedText: colors.SUBTEXT0
  },

  workspace: {
    accent: colors.MAUVE,
    border: colors.SURFACE1,
    button: {
      bg: colors.SURFACE0
    }
  },

  request: {
    methods: {
      get: colors.GREEN,
      post: colors.BLUE,
      put: colors.YELLOW,
      delete: colors.RED,
      patch: colors.PEACH,
      options: colors.TEAL,
      head: colors.SAPPHIRE
    },

    grpc: colors.SKY,
    ws: colors.MAUVE,
    gql: colors.PINK
  },

  requestTabPanel: {
    url: {
      bg: colors.BASE,
      icon: colors.TEXT,
      iconDanger: colors.RED,
      border: `solid 1px ${colors.SURFACE0}`
    },
    dragbar: {
      border: colors.SURFACE0,
      activeBorder: colors.OVERLAY0
    },
    responseStatus: colors.TEXT,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.BLUE,
    responseOverlayBg: 'rgba(36, 39, 58, 0.6)',

    card: {
      bg: colors.MANTLE,
      border: 'transparent',
      hr: colors.SURFACE0
    },

    graphqlDocsExplorer: {
      bg: colors.BASE,
      color: colors.TEXT
    }
  },

  notifications: {
    bg: colors.SURFACE0,
    list: {
      bg: colors.SURFACE0,
      borderRight: colors.SURFACE2,
      borderBottom: colors.SURFACE1,
      hoverBg: colors.SURFACE1,
      active: {
        border: colors.BLUE,
        bg: colors.SURFACE2,
        hoverBg: colors.SURFACE2
      }
    }
  },

  modal: {
    title: {
      color: colors.TEXT,
      bg: colors.MANTLE
    },
    body: {
      color: colors.TEXT,
      bg: colors.BASE
    },
    input: {
      bg: 'transparent',
      border: colors.SURFACE1,
      focusBorder: colors.LAVENDER
    },
    backdrop: {
      opacity: 0.2
    }
  },

  button: {
    secondary: {
      color: colors.TEXT,
      bg: colors.SURFACE0,
      border: colors.SURFACE0,
      hoverBorder: colors.OVERLAY0
    },
    close: {
      color: colors.TEXT,
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: ''
    },
    disabled: {
      color: colors.OVERLAY0,
      bg: colors.SURFACE1,
      border: colors.SURFACE1
    },
    danger: {
      color: colors.CRUST,
      bg: colors.RED,
      border: colors.RED
    }
  },
  button2: {
    color: {
      primary: {
        bg: colors.MAUVE,
        text: colors.CRUST,
        border: colors.MAUVE
      },
      secondary: {
        bg: rgba(colors.MAUVE, 0.08),
        text: colors.MAUVE,
        border: rgba(colors.MAUVE, 0.06)
      },
      success: {
        bg: colors.GREEN,
        text: colors.CRUST,
        border: colors.GREEN
      },
      warning: {
        bg: colors.PEACH,
        text: colors.CRUST,
        border: colors.PEACH
      },
      danger: {
        bg: colors.RED,
        text: colors.CRUST,
        border: colors.RED
      }
    }
  },

  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: colors.TEXT,
      border: colors.MAUVE
    },
    secondary: {
      active: {
        bg: colors.SURFACE0,
        color: colors.TEXT
      },
      inactive: {
        bg: colors.SURFACE1,
        color: colors.SUBTEXT0
      }
    }
  },

  requestTabs: {
    color: colors.TEXT,
    bg: colors.SURFACE0,
    bottomBorder: colors.SURFACE1,
    icon: {
      color: colors.OVERLAY0,
      hoverColor: colors.TEXT,
      hoverBg: colors.BASE
    },
    example: {
      iconColor: colors.OVERLAY1
    }
  },

  codemirror: {
    bg: colors.BASE,
    border: colors.BASE,
    placeholder: {
      color: colors.OVERLAY0,
      opacity: 0.5
    },
    gutter: {
      bg: colors.BASE
    },
    variable: {
      valid: colors.GREEN,
      invalid: colors.RED,
      prompt: colors.BLUE
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
    searchLineHighlightCurrent: 'rgba(110, 115, 141, 0.18)',
    searchMatch: colors.YELLOW,
    searchMatchActive: colors.PEACH
  },

  table: {
    border: colors.SURFACE0,
    thead: {
      color: colors.TEXT
    },
    striped: colors.SURFACE0,
    input: {
      color: colors.TEXT
    }
  },

  plainGrid: {
    hoverBg: colors.SURFACE0
  },

  scrollbar: {
    color: colors.SURFACE0
  },

  dragAndDrop: {
    border: colors.LAVENDER,
    borderStyle: '2px solid',
    hoverBg: 'rgba(183, 189, 248, 0.08)',
    transition: 'all 0.1s ease'
  },
  infoTip: {
    bg: colors.SURFACE0,
    border: colors.SURFACE1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
  },

  statusBar: {
    border: colors.SURFACE0,
    color: colors.SUBTEXT0
  },

  console: {
    bg: colors.BASE,
    headerBg: colors.MANTLE,
    contentBg: colors.BASE,
    border: colors.SURFACE0,
    titleColor: colors.TEXT,
    countColor: colors.SUBTEXT0,
    buttonColor: colors.TEXT,
    buttonHoverBg: 'rgba(202, 211, 245, 0.1)',
    buttonHoverColor: colors.TEXT,
    messageColor: colors.TEXT,
    timestampColor: colors.SUBTEXT0,
    emptyColor: colors.SUBTEXT0,
    logHoverBg: 'rgba(202, 211, 245, 0.05)',
    resizeHandleHover: colors.BLUE,
    resizeHandleActive: colors.BLUE,
    dropdownBg: colors.MANTLE,
    dropdownHeaderBg: colors.SURFACE0,
    optionHoverBg: 'rgba(202, 211, 245, 0.05)',
    optionLabelColor: colors.TEXT,
    optionCountColor: colors.SUBTEXT0,
    checkboxColor: colors.MAUVE,
    scrollbarTrack: colors.MANTLE,
    scrollbarThumb: colors.SURFACE2,
    scrollbarThumbHover: colors.OVERLAY0
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.CRUST
      },
      button: {
        active: {
          bg: colors.SURFACE0,
          color: colors.TEXT
        },
        inactive: {
          bg: 'transparent',
          color: colors.SUBTEXT0
        }
      }
    },
    importPaths: {
      header: {
        text: colors.SUBTEXT0,
        button: {
          color: colors.SUBTEXT0,
          hoverColor: colors.TEXT
        }
      },
      error: {
        bg: 'transparent',
        text: colors.RED,
        link: {
          color: colors.RED,
          hoverColor: colors.MAROON
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(202, 211, 245, 0.05)',
        text: colors.TEXT,
        icon: colors.SUBTEXT0,
        checkbox: {
          color: colors.TEXT
        },
        invalid: {
          opacity: 0.6,
          text: colors.RED
        }
      },
      empty: {
        text: colors.SUBTEXT0
      },
      button: {
        bg: colors.SURFACE0,
        color: colors.TEXT,
        border: colors.SURFACE0,
        hoverBorder: colors.OVERLAY0
      }
    },
    protoFiles: {
      header: {
        text: colors.SUBTEXT0,
        button: {
          color: colors.SUBTEXT0,
          hoverColor: colors.TEXT
        }
      },
      error: {
        bg: 'transparent',
        text: colors.RED,
        link: {
          color: colors.RED,
          hoverColor: colors.MAROON
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(202, 211, 245, 0.05)',
        selected: {
          bg: 'rgba(198, 160, 246, 0.2)',
          border: colors.MAUVE
        },
        text: colors.TEXT,
        secondaryText: colors.SUBTEXT0,
        icon: colors.SUBTEXT0,
        invalid: {
          opacity: 0.6,
          text: colors.RED
        }
      },
      empty: {
        text: colors.SUBTEXT0
      },
      button: {
        bg: colors.SURFACE0,
        color: colors.TEXT,
        border: colors.SURFACE0,
        hoverBorder: colors.OVERLAY0
      }
    }
  },
  deprecationWarning: {
    bg: 'rgba(237, 135, 150, 0.1)',
    border: 'rgba(237, 135, 150, 0.1)',
    icon: colors.RED,
    text: colors.SUBTEXT1
  },

  examples: {
    buttonBg: 'rgba(198, 160, 246, 0.1)',
    buttonColor: colors.MAUVE,
    buttonText: colors.TEXT,
    buttonIconColor: colors.TEXT,
    border: colors.SURFACE1,
    urlBar: {
      border: colors.SURFACE0,
      bg: colors.MANTLE
    },
    table: {
      thead: {
        bg: colors.MANTLE,
        color: colors.SUBTEXT0
      }
    },
    checkbox: {
      color: colors.CRUST
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.BASE,
          border: colors.SURFACE0,
          icon: colors.MAUVE,
          text: colors.TEXT,
          caret: colors.SUBTEXT0,
          separator: colors.SURFACE0,
          hoverBg: colors.BASE,
          hoverBorder: colors.SURFACE1,

          noEnvironment: {
            text: colors.SUBTEXT0,
            bg: colors.BASE,
            border: colors.SURFACE0,
            hoverBg: colors.BASE,
            hoverBorder: colors.SURFACE1
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(166, 218, 149, 0.12)',
            color: colors.GREEN
          },
          developerMode: {
            bg: 'rgba(238, 212, 159, 0.11)',
            color: colors.YELLOW
          }
        }
      }
    }
  }
};

export default catppuccinMacchiatoTheme;
