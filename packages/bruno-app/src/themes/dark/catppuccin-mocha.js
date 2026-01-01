// Catppuccin Mocha - Dark Theme (Original)
// Based on https://catppuccin.com/palette/

import { rgba } from 'polished';

const colors = {
  // Catppuccin Mocha Palette
  ROSEWATER: '#f5e0dc',
  FLAMINGO: '#f2cdcd',
  PINK: '#f5c2e7',
  MAUVE: '#cba6f7',
  RED: '#f38ba8',
  MAROON: '#eba0ac',
  PEACH: '#fab387',
  YELLOW: '#f9e2af',
  GREEN: '#a6e3a1',
  TEAL: '#94e2d5',
  SKY: '#89dceb',
  SAPPHIRE: '#74c7ec',
  BLUE: '#89b4fa',
  LAVENDER: '#b4befe',

  TEXT: '#cdd6f4',
  SUBTEXT1: '#bac2de',
  SUBTEXT0: '#a6adc8',
  OVERLAY2: '#9399b2',
  OVERLAY1: '#7f849c',
  OVERLAY0: '#6c7086',
  SURFACE2: '#585b70',
  SURFACE1: '#45475a',
  SURFACE0: '#313244',
  BASE: '#1e1e2e',
  MANTLE: '#181825',
  CRUST: '#11111b',

  WHITE: '#fff',
  BLACK: '#000',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#a6e3a1',
    PROPERTY: '#89b4fa',
    STRING: '#f9e2af',
    NUMBER: '#fab387',
    ATOM: '#f5c2e7',
    VARIABLE: '#74c7ec',
    KEYWORD: '#f38ba8',
    COMMENT: '#6c7086',
    OPERATOR: '#94e2d5',
    TAG: '#89b4fa',
    TAG_BRACKET: '#6c7086'
  }
};

colors.intent = {
  INFO: colors.BLUE,
  SUCCESS: colors.GREEN,
  WARNING: colors.PEACH,
  DANGER: colors.RED
};

const catppuccinMochaTheme = {
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

  status: {
    info: {
      background: rgba(colors.intent.INFO, 0.15),
      text: colors.intent.INFO,
      border: colors.intent.INFO
    },
    success: {
      background: rgba(colors.intent.SUCCESS, 0.15),
      text: colors.intent.SUCCESS,
      border: colors.intent.SUCCESS
    },
    warning: {
      background: rgba(colors.intent.WARNING, 0.15),
      text: colors.intent.WARNING,
      border: colors.intent.WARNING
    },
    danger: {
      background: rgba(colors.intent.DANGER, 0.15),
      text: colors.intent.DANGER,
      border: colors.intent.DANGER
    }
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
    hoverBg: 'rgba(108, 112, 134, 0.16)',
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
    responseOverlayBg: 'rgba(30, 30, 46, 0.6)',

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
    searchLineHighlightCurrent: 'rgba(108, 112, 134, 0.18)',
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
    hoverBg: 'rgba(180, 190, 254, 0.08)',
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
    buttonHoverBg: 'rgba(205, 214, 244, 0.1)',
    buttonHoverColor: colors.TEXT,
    messageColor: colors.TEXT,
    timestampColor: colors.SUBTEXT0,
    emptyColor: colors.SUBTEXT0,
    logHoverBg: 'rgba(205, 214, 244, 0.05)',
    resizeHandleHover: colors.BLUE,
    resizeHandleActive: colors.BLUE,
    dropdownBg: colors.MANTLE,
    dropdownHeaderBg: colors.SURFACE0,
    optionHoverBg: 'rgba(205, 214, 244, 0.05)',
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
        hoverBg: 'rgba(205, 214, 244, 0.05)',
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
        hoverBg: 'rgba(205, 214, 244, 0.05)',
        selected: {
          bg: 'rgba(203, 166, 247, 0.2)',
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
    bg: 'rgba(243, 139, 168, 0.1)',
    border: 'rgba(243, 139, 168, 0.1)',
    icon: colors.RED,
    text: colors.SUBTEXT1
  },

  examples: {
    buttonBg: 'rgba(203, 166, 247, 0.1)',
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
            bg: 'rgba(166, 227, 161, 0.12)',
            color: colors.GREEN
          },
          developerMode: {
            bg: 'rgba(249, 226, 175, 0.11)',
            color: colors.YELLOW
          }
        }
      }
    }
  }
};

export default catppuccinMochaTheme;
