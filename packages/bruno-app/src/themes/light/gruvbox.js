import { rgba, darken } from 'polished';

// Official Gruvbox Light palette
export const palette = {
  primary: {
    SOLID: '#d79921', // yellow
    TEXT: '#b57614', // yellow dark
    STRONG: '#b57614',
    SUBTLE: '#fabd2f' // bright yellow
  },
  hues: {
    RED: '#cc241d', // red
    RED_BRIGHT: '#9d0006', // red dark
    ROSE: '#9d0006',
    BROWN: '#d65d0e', // orange
    ORANGE: '#af3a03', // orange dark
    YELLOW: '#b57614', // yellow dark
    GREEN: '#98971a', // green
    GREEN_BRIGHT: '#79740e', // green dark
    GREEN_DARK: '#427b58',
    TEAL: '#427b58', // aqua dark
    CYAN: '#689d6a', // aqua
    BLUE: '#458588', // blue
    BLUE_BRIGHT: '#076678', // blue dark
    INDIGO: '#076678',
    VIOLET: '#b16286', // purple
    PURPLE: '#8f3f71', // purple dark
    PINK: '#8f3f71'
  },
  system: {
    CONTROL_ACCENT: '#d79921'
  },
  background: {
    BASE: '#fbf1c7', // bg0
    MANTLE: '#fbf1c7', // bg0_s (soft contrast)
    CRUST: '#f2e5bc', // bg0_h (hard contrast)
    SURFACE0: '#ebdbb2', // bg1
    SURFACE1: '#d5c4a1', // bg2
    SURFACE2: '#bdae93' // bg3
  },
  text: {
    BASE: '#3c3836', // fg
    SUBTEXT2: '#504945', // fg1
    SUBTEXT1: '#665c54', // fg2
    SUBTEXT0: '#7c6f64' // fg3
  },
  overlay: {
    OVERLAY2: '#a89984', // gray
    OVERLAY1: '#928374', // gray dark
    OVERLAY0: '#7c6f64' // fg3
  },
  border: {
    BORDER2: '#bdae93', // bg3
    BORDER1: '#d5c4a1', // bg2
    BORDER0: '#ebdbb2' // bg1
  },
  utility: {
    WHITE: '#fbf1c7', // bg0
    BLACK: '#282828' // dark bg
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
  KEYWORD: '#9d0006', // red dark
  TAG: '#9d0006',

  // Identifiers & properties
  VARIABLE: '#3c3836', // fg
  PROPERTY: '#076678', // blue dark
  DEFINITION: '#b57614', // yellow dark

  // Literals
  STRING: '#79740e', // green dark
  NUMBER: '#8f3f71', // purple dark
  ATOM: '#8f3f71',

  // Operators & punctuation
  OPERATOR: '#af3a03', // orange dark
  TAG_BRACKET: '#7c6f64', // fg3

  // Comments
  COMMENT: '#928374' // gray dark
};

const gruvboxLightTheme = {
  mode: 'light',
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
      background: rgba(palette.intent.INFO, 0.1),
      text: palette.intent.INFO,
      border: palette.intent.INFO
    },
    success: {
      background: rgba(palette.intent.SUCCESS, 0.1),
      text: palette.intent.SUCCESS,
      border: palette.intent.SUCCESS
    },
    warning: {
      background: rgba(palette.intent.WARNING, 0.1),
      text: palette.intent.WARNING,
      border: palette.intent.WARNING
    },
    danger: {
      background: rgba(palette.intent.DANGER, 0.1),
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
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)',
    lg: '0 2px 12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.1)'
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
      opacity: 0.7
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
    shadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
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
      opacity: 0.3
    }
  },

  button: {
    secondary: {
      color: palette.background.BASE,
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
        text: palette.utility.BLACK,
        border: palette.primary.SOLID
      },
      light: {
        bg: rgba(palette.primary.SOLID, 0.1),
        text: palette.primary.TEXT,
        border: rgba(palette.primary.SOLID, 0.2)
      },
      secondary: {
        bg: palette.background.SURFACE0,
        text: palette.text.BASE,
        border: palette.border.BORDER1
      },
      success: {
        bg: palette.hues.GREEN,
        text: palette.utility.WHITE,
        border: palette.hues.GREEN
      },
      warning: {
        bg: palette.hues.ORANGE,
        text: palette.utility.WHITE,
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
    bg: palette.background.MANTLE,
    border: palette.border.BORDER1,
    placeholder: {
      color: palette.text.SUBTEXT0,
      opacity: 0.6
    },
    gutter: {
      bg: palette.background.MANTLE
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
    searchLineHighlightCurrent: rgba(palette.primary.SOLID, 0.2),
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
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
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
    buttonHoverBg: rgba(palette.background.SURFACE2, 0.3),
    buttonHoverColor: palette.primary.TEXT,
    messageColor: palette.text.BASE,
    timestampColor: palette.text.SUBTEXT1,
    emptyColor: palette.text.SUBTEXT1,
    logHoverBg: rgba(palette.background.SURFACE2, 0.2),
    resizeHandleHover: palette.hues.BLUE_BRIGHT,
    resizeHandleActive: palette.hues.BLUE_BRIGHT,
    dropdownBg: palette.background.SURFACE0,
    dropdownHeaderBg: palette.background.SURFACE1,
    optionHoverBg: rgba(palette.background.SURFACE2, 0.2),
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
          hoverColor: darken(0.1, palette.hues.RED_BRIGHT)
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(palette.background.SURFACE2, 0.2),
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
        color: palette.background.BASE,
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
          hoverColor: darken(0.1, palette.hues.RED_BRIGHT)
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(palette.background.SURFACE2, 0.2),
        selected: {
          bg: rgba(palette.primary.SOLID, 0.15),
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
        color: palette.background.BASE,
        border: palette.hues.BLUE,
        hoverBorder: palette.hues.BLUE_BRIGHT
      }
    }
  },

  deprecationWarning: {
    bg: rgba(palette.hues.RED_BRIGHT, 0.08),
    border: rgba(palette.hues.RED_BRIGHT, 0.2),
    icon: palette.hues.RED_BRIGHT,
    text: palette.text.BASE
  },

  examples: {
    buttonBg: rgba(palette.primary.SOLID, 0.1),
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
      color: palette.utility.BLACK
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
            bg: rgba(palette.hues.GREEN_BRIGHT, 0.12),
            color: palette.hues.GREEN_BRIGHT
          },
          developerMode: {
            bg: rgba(palette.hues.YELLOW, 0.12),
            color: palette.hues.YELLOW
          }
        }
      }
    }
  }
};

export default gruvboxLightTheme;
