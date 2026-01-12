// Catppuccin Latte - Light Theme
// Based on https://catppuccin.com/palette/

import { rgba } from 'polished';

const colors = {
  // Catppuccin Latte Palette
  ROSEWATER: '#dc8a78',
  FLAMINGO: '#dd7878',
  PINK: '#ea76cb',
  MAUVE: '#8839ef',
  RED: '#d20f39',
  MAROON: '#e64553',
  PEACH: '#fe640b',
  YELLOW: '#df8e1d',
  GREEN: '#40a02b',
  TEAL: '#179299',
  SKY: '#04a5e5',
  SAPPHIRE: '#209fb5',
  BLUE: '#1e66f5',
  LAVENDER: '#7287fd',

  TEXT: '#4c4f69',
  SUBTEXT1: '#5c5f77',
  SUBTEXT0: '#6c6f85',
  OVERLAY2: '#7c7f93',
  OVERLAY1: '#8c8fa1',
  OVERLAY0: '#9ca0b0',
  SURFACE2: '#acb0be',
  SURFACE1: '#bcc0cc',
  SURFACE0: '#ccd0da',
  BASE: '#eff1f5',
  MANTLE: '#e6e9ef',
  CRUST: '#dce0e8',

  WHITE: '#fff',
  BLACK: '#000',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#40a02b',
    PROPERTY: '#1e66f5',
    STRING: '#df8e1d',
    NUMBER: '#fe640b',
    ATOM: '#ea76cb',
    VARIABLE: '#209fb5',
    KEYWORD: '#d20f39',
    COMMENT: '#6c6f85',
    OPERATOR: '#179299',
    TAG: '#1e66f5',
    TAG_BRACKET: '#6c6f85'
  }
};

export const palette = {};

palette.intent = {
  INFO: colors.BLUE,
  SUCCESS: colors.GREEN,
  WARNING: colors.PEACH,
  DANGER: colors.RED
};

const catppuccinLatteTheme = {
  mode: 'light',
  brand: colors.MAUVE,
  text: colors.TEXT,
  textLink: colors.BLUE,
  draftColor: '#cc7b1b',
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
    sm: '0 1px 3px rgba(76, 79, 105, 0.12), 0 0 0 1px rgba(76, 79, 105, 0.05)',
    md: '0 2px 8px rgba(76, 79, 105, 0.14), 0 0 0 1px rgba(76, 79, 105, 0.06)',
    lg: '0 2px 12px rgba(76, 79, 105, 0.15), 0 0 0 1px rgba(76, 79, 105, 0.05)'
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
    bg: rgba(colors.SURFACE0, 0.2),
    border: colors.SURFACE1,
    focusBorder: colors.LAVENDER,
    placeholder: {
      color: colors.OVERLAY0,
      opacity: 0.8
    }
  },

  sidebar: {
    color: colors.TEXT,
    muted: colors.SUBTEXT0,
    bg: colors.MANTLE,
    dragbar: {
      border: colors.SURFACE0,
      activeBorder: colors.SURFACE2
    },

    collection: {
      item: {
        bg: rgba(colors.SURFACE0, 0.5),
        hoverBg: rgba(colors.SURFACE0, 0.7),
        focusBorder: colors.LAVENDER,
        indentBorder: colors.SURFACE0,
        active: {
          indentBorder: colors.SURFACE0
        },
        example: {
          iconColor: colors.OVERLAY1
        }
      }
    },

    dropdownIcon: {
      color: colors.SUBTEXT1
    }
  },

  dropdown: {
    color: colors.TEXT,
    iconColor: colors.SUBTEXT1,
    bg: colors.BASE,
    hoverBg: rgba(colors.SURFACE0, 0.5),
    shadow: 'rgba(76, 79, 105, 0.25) 0px 6px 12px -2px, rgba(76, 79, 105, 0.3) 0px 3px 7px -3px',
    border: 'none',
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
      icon: colors.SUBTEXT1,
      iconDanger: colors.RED,
      border: `solid 1px ${colors.SURFACE1}`
    },
    dragbar: {
      border: colors.SURFACE1,
      activeBorder: colors.OVERLAY0
    },
    responseStatus: colors.SUBTEXT1,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.BLUE,
    responseOverlayBg: 'rgba(239, 241, 245, 0.6)',
    card: {
      bg: colors.BASE,
      border: colors.MANTLE,
      hr: colors.SURFACE0
    },
    graphqlDocsExplorer: {
      bg: colors.BASE,
      color: colors.TEXT
    }
  },

  notifications: {
    bg: colors.BASE,
    list: {
      bg: colors.MANTLE,
      borderRight: colors.SURFACE1,
      borderBottom: colors.SURFACE1,
      hoverBg: colors.SURFACE0,
      active: {
        border: colors.BLUE,
        bg: colors.SURFACE1,
        hoverBg: colors.SURFACE1
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
      bg: colors.SURFACE0,
      border: colors.SURFACE1,
      focusBorder: colors.LAVENDER
    },
    backdrop: {
      opacity: 0.4
    }
  },

  button: {
    secondary: {
      color: colors.TEXT,
      bg: colors.SURFACE0,
      border: colors.SURFACE1,
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
      color: colors.WHITE,
      bg: colors.RED,
      border: colors.RED
    }
  },
  button2: {
    color: {
      primary: {
        bg: colors.MAUVE,
        text: colors.BASE,
        border: colors.MAUVE
      },
      light: {
        bg: rgba(colors.MAUVE, 0.08),
        text: colors.MAUVE,
        border: rgba(colors.MAUVE, 0.06)
      },
      secondary: {
        bg: colors.SURFACE1,
        text: colors.TEXT,
        border: colors.SURFACE2
      },
      success: {
        bg: colors.GREEN,
        text: colors.BASE,
        border: colors.GREEN
      },
      warning: {
        bg: colors.PEACH,
        text: colors.BASE,
        border: colors.PEACH
      },
      danger: {
        bg: colors.RED,
        text: colors.BASE,
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
        bg: colors.SURFACE0,
        color: colors.SUBTEXT0
      }
    }
  },

  requestTabs: {
    color: colors.TEXT,
    bg: '#E4E7EC',
    bottomBorder: colors.SURFACE1,
    icon: {
      color: colors.OVERLAY0,
      hoverColor: colors.SUBTEXT1,
      hoverBg: colors.SURFACE1
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
      opacity: 0.75
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
    searchLineHighlightCurrent: 'rgba(124, 127, 147, 0.10)',
    searchMatch: colors.YELLOW,
    searchMatchActive: colors.PEACH
  },

  table: {
    border: colors.SURFACE1,
    thead: {
      color: colors.SUBTEXT1,
      bg: colors.MANTLE
    },
    striped: colors.MANTLE,
    input: {
      color: colors.TEXT
    }
  },

  plainGrid: {
    hoverBg: colors.SURFACE0
  },

  scrollbar: {
    color: colors.OVERLAY0
  },

  dragAndDrop: {
    border: colors.LAVENDER,
    borderStyle: '2px solid',
    hoverBg: 'rgba(114, 135, 253, 0.05)',
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: colors.BASE,
    border: colors.SURFACE1,
    boxShadow: '0 4px 12px rgba(76, 79, 105, 0.15)'
  },

  statusBar: {
    border: colors.SURFACE1,
    color: colors.SUBTEXT0
  },

  console: {
    bg: colors.BASE,
    headerBg: colors.MANTLE,
    contentBg: colors.BASE,
    border: colors.SURFACE1,
    titleColor: colors.TEXT,
    countColor: colors.SUBTEXT0,
    buttonColor: colors.SUBTEXT1,
    buttonHoverBg: colors.SURFACE0,
    buttonHoverColor: colors.TEXT,
    messageColor: colors.TEXT,
    timestampColor: colors.SUBTEXT0,
    emptyColor: colors.SUBTEXT0,
    logHoverBg: 'rgba(76, 79, 105, 0.03)',
    resizeHandleHover: colors.BLUE,
    resizeHandleActive: colors.BLUE,
    dropdownBg: colors.BASE,
    dropdownHeaderBg: colors.MANTLE,
    optionHoverBg: colors.SURFACE0,
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
        bg: colors.MANTLE
      },
      button: {
        active: {
          bg: colors.BASE,
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
        hoverBg: 'rgba(76, 79, 105, 0.05)',
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
        border: colors.SURFACE1,
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
        hoverBg: 'rgba(76, 79, 105, 0.05)',
        selected: {
          bg: 'rgba(136, 57, 239, 0.2)',
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
        border: colors.SURFACE1,
        hoverBorder: colors.OVERLAY0
      }
    }
  },
  deprecationWarning: {
    bg: 'rgba(210, 15, 57, 0.1)',
    border: 'rgba(210, 15, 57, 0.1)',
    icon: colors.RED,
    text: colors.TEXT
  },

  examples: {
    buttonBg: 'rgba(136, 57, 239, 0.1)',
    buttonColor: colors.MAUVE,
    buttonText: colors.BASE,
    buttonIconColor: colors.TEXT,
    border: colors.SURFACE1,
    urlBar: {
      border: colors.SURFACE1,
      bg: colors.MANTLE
    },
    table: {
      thead: {
        bg: colors.MANTLE,
        color: colors.SUBTEXT1
      }
    },
    checkbox: {
      color: colors.BASE
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.BASE,
          border: colors.SURFACE1,
          icon: colors.MAUVE,
          text: colors.TEXT,
          caret: colors.OVERLAY0,
          separator: colors.SURFACE1,
          hoverBg: colors.BASE,
          hoverBorder: colors.SURFACE2,

          noEnvironment: {
            text: colors.SUBTEXT0,
            bg: colors.BASE,
            border: colors.SURFACE1,
            hoverBg: colors.BASE,
            hoverBorder: colors.SURFACE2
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(64, 160, 43, 0.12)',
            color: colors.GREEN
          },
          developerMode: {
            bg: 'rgba(223, 142, 29, 0.15)',
            color: colors.YELLOW
          }
        }
      }
    }
  }
};

export default catppuccinLatteTheme;
