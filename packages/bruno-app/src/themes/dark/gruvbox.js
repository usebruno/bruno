import { rgba, lighten } from 'polished';

// Official Gruvbox Dark palette
export const palette = {
  primary: {
    SOLID: '#d79921', // yellow
    TEXT: '#fabd2f', // bright yellow
    STRONG: '#fabd2f',
    SUBTLE: '#b57614' // yellow dark
  },
  hues: {
    RED: '#cc241d', // red
    RED_BRIGHT: '#fb4934', // bright red
    ROSE: '#fb4934',
    BROWN: '#d65d0e', // orange
    ORANGE: '#fe8019', // bright orange
    YELLOW: '#fabd2f', // bright yellow
    GREEN: '#98971a', // green
    GREEN_BRIGHT: '#b8bb26', // bright green
    GREEN_DARK: '#79740e',
    TEAL: '#689d6a', // aqua
    CYAN: '#8ec07c', // bright aqua
    BLUE: '#458588', // blue
    BLUE_BRIGHT: '#83a598', // bright blue
    INDIGO: '#83a598',
    VIOLET: '#b16286', // purple
    PURPLE: '#d3869b', // bright purple
    PINK: '#d3869b'
  },
  system: {
    CONTROL_ACCENT: '#d79921'
  },
  background: {
    BASE: '#282828', // bg0
    MANTLE: '#1d2021', // bg0_h (hard contrast)
    CRUST: '#1d2021',
    SURFACE0: '#32302f', // bg1
    SURFACE1: '#3c3836', // bg2
    SURFACE2: '#504945' // bg3
  },
  text: {
    BASE: '#ebdbb2', // fg
    SUBTEXT2: '#d5c4a1', // fg1
    SUBTEXT1: '#bdae93', // fg2
    SUBTEXT0: '#a89984' // fg3
  },
  overlay: {
    OVERLAY2: '#7c6f64', // gray
    OVERLAY1: '#665c54', // gray dark
    OVERLAY0: '#504945' // bg3
  },
  border: {
    BORDER2: '#504945', // bg3
    BORDER1: '#3c3836', // bg2
    BORDER0: '#32302f' // bg1
  },
  utility: {
    WHITE: '#fbf1c7', // fg0
    BLACK: '#1d2021' // bg0_h
  }
};

palette.intent = {
  INFO: palette.hues.BLUE_BRIGHT,
  SUCCESS: palette.hues.GREEN_BRIGHT,
  WARNING: palette.hues.ORANGE,
  DANGER: palette.hues.RED_BRIGHT
};

palette.syntax = {
  // Core language structure
  KEYWORD: '#fb4934', // bright red
  TAG: '#fb4934',

  // Identifiers & properties
  VARIABLE: '#ebdbb2', // fg
  PROPERTY: '#83a598', // bright blue
  DEFINITION: '#fabd2f', // bright yellow

  // Literals
  STRING: '#b8bb26', // bright green
  NUMBER: '#d3869b', // bright purple
  ATOM: '#d3869b',

  // Operators & punctuation
  OPERATOR: '#fe8019', // bright orange
  TAG_BRACKET: '#a89984', // fg3

  // Comments
  COMMENT: '#928374' // gray
};

const gruvboxDarkTheme = {
  mode: 'dark',
  brand: palette.primary.SOLID,
  text: palette.text.BASE,
  textLink: palette.hues.BLUE_BRIGHT,
  draftColor: palette.primary.SOLID,
  bg: palette.background.BASE,

  primary: {
    solid: palette.primary.SOLID,
    text: palette.primary.TEXT,
    strong: palette.primary.STRONG,
    subtle: palette.primary.SUBTLE
  },

  accents: {
    primary: palette.primary.SOLID
  },

  background: {
    base: palette.background.BASE,
    mantle: palette.background.MANTLE,
    crust: palette.background.CRUST,
    surface0: palette.background.SURFACE0,
    surface1: palette.background.SURFACE1,
    surface2: palette.background.SURFACE2
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
    overlay2: palette.overlay.OVERLAY2,
    overlay1: palette.overlay.OVERLAY1,
    overlay0: palette.overlay.OVERLAY0
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
    border2: palette.border.BORDER2,
    border1: palette.border.BORDER1,
    border0: palette.border.BORDER0
  },

  colors: {
    text: {
      white: palette.text.BASE,
      green: palette.intent.SUCCESS,
      danger: palette.intent.DANGER,
      warning: palette.intent.WARNING,
      muted: palette.text.SUBTEXT1,
      purple: palette.hues.PURPLE,
      yellow: palette.hues.YELLOW,
      subtext2: palette.text.SUBTEXT2,
      subtext1: palette.text.SUBTEXT1,
      subtext0: palette.text.SUBTEXT0
    },
    bg: {
      danger: palette.hues.RED_BRIGHT
    },
    accent: palette.system.CONTROL_ACCENT
  },

  input: {
    bg: 'transparent',
    border: palette.border.BORDER2,
    focusBorder: rgba(palette.primary.SOLID, 0.8),
    placeholder: {
      color: palette.text.SUBTEXT1,
      opacity: 0.6
    }
  },

  sidebar: {
    color: palette.text.BASE,
    muted: palette.text.SUBTEXT1,
    bg: palette.background.BASE,
    dragbar: {
      border: palette.border.BORDER1,
      activeBorder: palette.border.BORDER2
    },

    collection: {
      item: {
        bg: palette.background.SURFACE0,
        hoverBg: palette.background.SURFACE1,
        focusBorder: palette.border.BORDER2,
        indentBorder: palette.background.SURFACE0,
        active: {
          indentBorder: palette.primary.SOLID
        },
        example: {
          iconColor: palette.text.BASE
        }
      }
    },

    dropdownIcon: {
      color: palette.text.BASE
    }
  },

  dropdown: {
    color: palette.text.BASE,
    iconColor: palette.text.SUBTEXT2,
    bg: palette.background.MANTLE,
    hoverBg: palette.background.SURFACE0,
    shadow: 'none',
    border: palette.border.BORDER1,
    separator: palette.border.BORDER1,
    selectedColor: palette.primary.TEXT,
    mutedText: palette.text.SUBTEXT1
  },

  workspace: {
    accent: palette.primary.SOLID,
    border: palette.border.BORDER2,
    button: {
      bg: palette.background.SURFACE0
    }
  },

  request: {
    methods: {
      get: palette.hues.GREEN_BRIGHT,
      post: palette.hues.BLUE_BRIGHT,
      put: palette.hues.ORANGE,
      delete: palette.hues.RED_BRIGHT,
      patch: palette.hues.YELLOW,
      options: palette.hues.CYAN,
      head: palette.hues.TEAL
    },

    grpc: palette.hues.CYAN,
    ws: palette.hues.ORANGE,
    gql: palette.hues.PINK
  },

  requestTabPanel: {
    url: {
      bg: palette.background.BASE,
      icon: palette.text.SUBTEXT2,
      iconDanger: palette.hues.RED_BRIGHT,
      border: `solid 1px ${palette.border.BORDER1}`
    },
    dragbar: {
      border: palette.border.BORDER1,
      activeBorder: palette.border.BORDER2
    },
    responseStatus: palette.text.SUBTEXT2,
    responseOk: palette.hues.GREEN_BRIGHT,
    responseError: palette.hues.RED_BRIGHT,
    responsePending: palette.hues.BLUE_BRIGHT,
    responseOverlayBg: rgba(palette.background.BASE, 0.8),

    card: {
      bg: palette.background.SURFACE0,
      border: 'transparent',
      hr: palette.border.BORDER1
    },

    graphqlDocsExplorer: {
      bg: palette.background.MANTLE,
      color: palette.text.BASE
    }
  },

  notifications: {
    bg: palette.background.SURFACE1,
    list: {
      bg: palette.background.SURFACE0,
      borderRight: palette.border.BORDER2,
      borderBottom: palette.border.BORDER2,
      hoverBg: palette.background.SURFACE1,
      active: {
        border: palette.hues.BLUE_BRIGHT,
        bg: palette.background.SURFACE2,
        hoverBg: palette.background.SURFACE2
      }
    }
  },

  modal: {
    title: {
      color: palette.text.BASE,
      bg: palette.background.BASE
    },
    body: {
      color: palette.text.BASE,
      bg: palette.background.MANTLE
    },
    input: {
      bg: 'transparent',
      border: palette.border.BORDER2,
      focusBorder: rgba(palette.primary.SOLID, 0.8)
    },
    backdrop: {
      opacity: 0.2
    }
  },

  button: {
    secondary: {
      color: palette.text.BASE,
      bg: palette.hues.BLUE,
      border: palette.hues.BLUE,
      hoverBorder: palette.hues.BLUE_BRIGHT
    },
    close: {
      color: palette.text.SUBTEXT2,
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: 'transparent'
    },
    disabled: {
      color: palette.text.SUBTEXT0,
      bg: palette.background.SURFACE2,
      border: palette.background.SURFACE2
    },
    danger: {
      color: palette.utility.WHITE,
      bg: palette.hues.RED,
      border: palette.hues.RED
    }
  },

  button2: {
    color: {
      primary: {
        bg: palette.primary.SOLID,
        text: palette.background.MANTLE,
        border: palette.primary.SOLID
      },
      light: {
        bg: rgba(palette.primary.SOLID, 0.15),
        text: palette.primary.TEXT,
        border: rgba(palette.primary.SOLID, 0.3)
      },
      secondary: {
        bg: palette.background.SURFACE0,
        text: palette.text.BASE,
        border: palette.border.BORDER1
      },
      success: {
        bg: palette.hues.GREEN,
        text: palette.background.MANTLE,
        border: palette.hues.GREEN
      },
      warning: {
        bg: palette.hues.ORANGE,
        text: palette.background.MANTLE,
        border: palette.hues.ORANGE
      },
      danger: {
        bg: palette.hues.RED,
        text: palette.utility.WHITE,
        border: palette.hues.RED
      }
    }
  },

  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: palette.text.BASE,
      border: palette.primary.STRONG
    },
    secondary: {
      active: {
        bg: palette.background.SURFACE0,
        color: palette.text.BASE
      },
      inactive: {
        bg: 'transparent',
        color: palette.text.SUBTEXT1
      }
    }
  },

  requestTabs: {
    color: palette.text.BASE,
    bg: palette.background.SURFACE0,
    bottomBorder: palette.border.BORDER2,
    icon: {
      color: palette.text.SUBTEXT1,
      hoverColor: palette.text.BASE,
      hoverBg: palette.background.SURFACE1
    },
    example: {
      iconColor: palette.text.SUBTEXT2
    }
  },

  codemirror: {
    bg: palette.background.BASE,
    border: palette.background.BASE,
    placeholder: {
      color: palette.text.SUBTEXT0,
      opacity: 0.5
    },
    gutter: {
      bg: palette.background.BASE
    },
    variable: {
      valid: palette.hues.GREEN,
      invalid: palette.hues.RED_BRIGHT,
      prompt: palette.hues.BLUE_BRIGHT
    },
    tokens: {
      definition: palette.syntax.DEFINITION,
      property: palette.syntax.PROPERTY,
      string: palette.syntax.STRING,
      number: palette.syntax.NUMBER,
      atom: palette.syntax.ATOM,
      variable: palette.syntax.VARIABLE,
      keyword: palette.syntax.KEYWORD,
      comment: palette.syntax.COMMENT,
      operator: palette.syntax.OPERATOR,
      tag: palette.syntax.TAG,
      tagBracket: palette.syntax.TAG_BRACKET
    },
    searchLineHighlightCurrent: rgba(palette.primary.SOLID, 0.15),
    searchMatch: palette.hues.YELLOW,
    searchMatchActive: palette.hues.ORANGE
  },

  table: {
    border: palette.border.BORDER1,
    thead: {
      color: palette.text.SUBTEXT2
    },
    striped: palette.background.SURFACE0,
    input: {
      color: palette.text.BASE
    }
  },

  plainGrid: {
    hoverBg: palette.background.SURFACE1
  },

  scrollbar: {
    color: palette.background.SURFACE2
  },

  dragAndDrop: {
    border: palette.border.BORDER2,
    borderStyle: '2px solid',
    hoverBg: rgba(palette.background.SURFACE2, 0.5),
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: palette.background.MANTLE,
    border: palette.border.BORDER1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
  },

  statusBar: {
    border: palette.border.BORDER1,
    color: palette.text.SUBTEXT1
  },

  console: {
    bg: palette.background.MANTLE,
    headerBg: palette.background.CRUST,
    contentBg: palette.background.MANTLE,
    border: palette.border.BORDER2,
    titleColor: palette.text.BASE,
    countColor: palette.text.SUBTEXT1,
    buttonColor: palette.text.BASE,
    buttonHoverBg: rgba(palette.background.SURFACE2, 0.5),
    buttonHoverColor: palette.primary.TEXT,
    messageColor: palette.text.BASE,
    timestampColor: palette.text.SUBTEXT1,
    emptyColor: palette.text.SUBTEXT1,
    logHoverBg: rgba(palette.background.SURFACE2, 0.3),
    resizeHandleHover: palette.hues.BLUE_BRIGHT,
    resizeHandleActive: palette.hues.BLUE_BRIGHT,
    dropdownBg: palette.background.SURFACE0,
    dropdownHeaderBg: palette.background.SURFACE1,
    optionHoverBg: rgba(palette.background.SURFACE2, 0.3),
    optionLabelColor: palette.text.BASE,
    optionCountColor: palette.text.SUBTEXT1,
    checkboxColor: palette.primary.SOLID,
    scrollbarTrack: palette.background.SURFACE0,
    scrollbarThumb: palette.background.SURFACE2,
    scrollbarThumbHover: palette.overlay.OVERLAY0
  },

  grpc: {
    tabNav: {
      container: {
        bg: palette.background.SURFACE0
      },
      button: {
        active: {
          bg: palette.background.SURFACE1,
          color: palette.text.BASE
        },
        inactive: {
          bg: 'transparent',
          color: palette.text.SUBTEXT1
        }
      }
    },
    importPaths: {
      header: {
        text: palette.text.SUBTEXT1,
        button: {
          color: palette.text.SUBTEXT1,
          hoverColor: palette.text.BASE
        }
      },
      error: {
        bg: 'transparent',
        text: palette.hues.RED_BRIGHT,
        link: {
          color: palette.hues.RED_BRIGHT,
          hoverColor: lighten(0.1, palette.hues.RED_BRIGHT)
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(palette.background.SURFACE2, 0.3),
        text: palette.text.BASE,
        icon: palette.text.SUBTEXT1,
        checkbox: {
          color: palette.text.BASE
        },
        invalid: {
          opacity: 0.6,
          text: palette.hues.RED_BRIGHT
        }
      },
      empty: {
        text: palette.text.SUBTEXT1
      },
      button: {
        bg: palette.hues.BLUE,
        color: palette.text.BASE,
        border: palette.hues.BLUE,
        hoverBorder: palette.hues.BLUE_BRIGHT
      }
    },
    protoFiles: {
      header: {
        text: palette.text.SUBTEXT1,
        button: {
          color: palette.text.SUBTEXT1,
          hoverColor: palette.text.BASE
        }
      },
      error: {
        bg: 'transparent',
        text: palette.hues.RED_BRIGHT,
        link: {
          color: palette.hues.RED_BRIGHT,
          hoverColor: lighten(0.1, palette.hues.RED_BRIGHT)
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(palette.background.SURFACE2, 0.3),
        selected: {
          bg: rgba(palette.primary.SOLID, 0.2),
          border: palette.primary.SOLID
        },
        text: palette.text.BASE,
        secondaryText: palette.text.SUBTEXT1,
        icon: palette.text.SUBTEXT1,
        invalid: {
          opacity: 0.6,
          text: palette.hues.RED_BRIGHT
        }
      },
      empty: {
        text: palette.text.SUBTEXT1
      },
      button: {
        bg: palette.hues.BLUE,
        color: palette.text.BASE,
        border: palette.hues.BLUE,
        hoverBorder: palette.hues.BLUE_BRIGHT
      }
    }
  },

  deprecationWarning: {
    bg: rgba(palette.hues.RED_BRIGHT, 0.1),
    border: rgba(palette.hues.RED_BRIGHT, 0.3),
    icon: palette.hues.RED_BRIGHT,
    text: palette.text.BASE
  },

  examples: {
    buttonBg: rgba(palette.primary.SOLID, 0.15),
    buttonColor: palette.primary.SOLID,
    buttonText: palette.text.BASE,
    buttonIconColor: palette.text.BASE,
    border: palette.border.BORDER2,
    urlBar: {
      border: palette.border.BORDER1,
      bg: palette.background.SURFACE0
    },
    table: {
      thead: {
        bg: palette.background.SURFACE0,
        color: palette.text.SUBTEXT1
      }
    },
    checkbox: {
      color: palette.background.MANTLE
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: palette.background.BASE,
          border: palette.border.BORDER1,
          icon: palette.primary.TEXT,
          text: palette.text.BASE,
          caret: palette.text.SUBTEXT1,
          separator: palette.border.BORDER1,
          hoverBg: palette.background.SURFACE0,
          hoverBorder: palette.border.BORDER2,

          noEnvironment: {
            text: palette.text.SUBTEXT1,
            bg: palette.background.BASE,
            border: palette.border.BORDER1,
            hoverBg: palette.background.SURFACE0,
            hoverBorder: palette.border.BORDER2
          }
        },
        sandboxMode: {
          safeMode: {
            bg: rgba(palette.hues.GREEN_BRIGHT, 0.15),
            color: palette.hues.GREEN_BRIGHT
          },
          developerMode: {
            bg: rgba(palette.hues.YELLOW, 0.15),
            color: palette.hues.YELLOW
          }
        }
      }
    }
  }
};

export default gruvboxDarkTheme;
