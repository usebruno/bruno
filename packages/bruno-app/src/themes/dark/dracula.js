// Dracula Theme for Bruno
// https://draculatheme.com/
//
// Color Palette:
// Background:    #282A36
// Current Line:  #44475A
// Selection:     #44475A
// Foreground:    #F8F8F2
// Comment:       #6272A4
// Red:           #FF5555
// Orange:        #FFB86C
// Yellow:        #F1FA8C
// Green:         #50FA7B
// Cyan:          #8BE9FD
// Purple:        #BD93F9
// Pink:          #FF79C6

import { rgba } from 'polished';

const colors = {
  BACKGROUND: '#282A36',
  CURRENT_LINE: '#44475A',
  SELECTION: '#44475A',
  FOREGROUND: '#F8F8F2',
  COMMENT: '#6272A4',

  RED: '#FF5555',
  ORANGE: '#FFB86C',
  YELLOW: '#F1FA8C',
  GREEN: '#50FA7B',
  CYAN: '#8BE9FD',
  PURPLE: '#BD93F9',
  PINK: '#FF79C6',

  // Derived surface levels
  SURFACE0: '#21222C',
  SURFACE1: '#343746',
  SURFACE2: '#44475A',

  // Semantic aliases
  BRAND: '#BD93F9',
  TEXT: '#F8F8F2',
  TEXT_MUTED: '#6272A4',
  TEXT_LINK: '#8BE9FD',
  BG: '#282A36',

  WHITE: '#F8F8F2',
  BLACK: '#21222C',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#50FA7B',
    PROPERTY: '#8BE9FD',
    STRING: '#F1FA8C',
    NUMBER: '#BD93F9',
    ATOM: '#BD93F9',
    VARIABLE: '#F8F8F2',
    KEYWORD: '#FF79C6',
    COMMENT: '#6272A4',
    OPERATOR: '#FF79C6',
    TAG: '#FF79C6',
    TAG_BRACKET: '#6272A4'
  }
};

export const palette = {};

palette.intent = {
  INFO: colors.CYAN,
  SUCCESS: colors.GREEN,
  WARNING: colors.ORANGE,
  DANGER: colors.RED
};

const draculaTheme = {
  mode: 'dark',
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  draftColor: colors.ORANGE,
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
    base: colors.BACKGROUND,
    mantle: colors.SURFACE0,
    crust: colors.SURFACE1,
    surface0: colors.SURFACE1,
    surface1: colors.CURRENT_LINE,
    surface2: '#565869'
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
    overlay2: '#7B8BAD',
    overlay1: '#6272A4',
    overlay0: colors.COMMENT
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
    border2: colors.CURRENT_LINE,
    border1: colors.SURFACE1,
    border0: colors.SURFACE0
  },

  colors: {
    text: {
      white: colors.WHITE,
      green: colors.GREEN,
      danger: colors.RED,
      warning: colors.ORANGE,
      muted: colors.TEXT_MUTED,
      purple: colors.PURPLE,
      yellow: colors.YELLOW,
      subtext2: colors.FOREGROUND,
      subtext1: colors.TEXT_MUTED,
      subtext0: '#4d5568'
    },
    bg: {
      danger: colors.RED
    },
    accent: colors.BRAND
  },

  input: {
    bg: 'transparent',
    border: colors.CURRENT_LINE,
    focusBorder: colors.PURPLE,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.6
    }
  },

  sidebar: {
    color: colors.FOREGROUND,
    muted: colors.TEXT_MUTED,
    bg: colors.BG,
    dragbar: {
      border: colors.SURFACE1,
      activeBorder: colors.CURRENT_LINE
    },
    collection: {
      item: {
        bg: colors.SURFACE0,
        hoverBg: colors.SURFACE1,
        focusBorder: colors.CURRENT_LINE,
        indentBorder: colors.SURFACE1,
        active: {
          indentBorder: colors.CURRENT_LINE
        },
        example: {
          iconColor: colors.TEXT_MUTED
        }
      }
    },
    dropdownIcon: {
      color: colors.FOREGROUND
    }
  },

  dropdown: {
    color: colors.FOREGROUND,
    iconColor: colors.FOREGROUND,
    bg: colors.SURFACE0,
    hoverBg: colors.SURFACE1,
    shadow: 'none',
    border: colors.CURRENT_LINE,
    separator: colors.CURRENT_LINE,
    selectedColor: colors.PURPLE,
    mutedText: colors.TEXT_MUTED
  },

  workspace: {
    accent: colors.BRAND,
    border: colors.CURRENT_LINE,
    button: {
      bg: colors.SURFACE1
    }
  },

  request: {
    methods: {
      get: colors.GREEN,
      post: colors.YELLOW,
      put: colors.ORANGE,
      delete: colors.RED,
      patch: colors.PINK,
      options: colors.CYAN,
      head: colors.PURPLE
    },
    grpc: colors.CYAN,
    ws: colors.YELLOW,
    gql: colors.PINK
  },

  requestTabPanel: {
    url: {
      bg: colors.BG,
      icon: colors.FOREGROUND,
      iconDanger: colors.RED,
      border: `solid 1px ${colors.SURFACE1}`
    },
    dragbar: {
      border: colors.CURRENT_LINE,
      activeBorder: colors.PURPLE
    },
    responseStatus: colors.FOREGROUND,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.CYAN,
    responseOverlayBg: 'rgba(40, 42, 54, 0.6)',
    card: {
      bg: colors.SURFACE0,
      border: 'transparent',
      hr: colors.CURRENT_LINE
    },
    graphqlDocsExplorer: {
      bg: colors.BG,
      color: colors.FOREGROUND
    }
  },

  notifications: {
    bg: colors.SURFACE1,
    list: {
      bg: colors.SURFACE0,
      borderRight: colors.CURRENT_LINE,
      borderBottom: colors.CURRENT_LINE,
      hoverBg: colors.SURFACE1,
      active: {
        border: colors.PURPLE,
        bg: colors.SURFACE1,
        hoverBg: colors.SURFACE1
      }
    }
  },

  modal: {
    title: {
      color: colors.FOREGROUND,
      bg: colors.SURFACE0
    },
    body: {
      color: colors.FOREGROUND,
      bg: colors.SURFACE0
    },
    input: {
      bg: 'transparent',
      border: colors.CURRENT_LINE,
      focusBorder: colors.PURPLE
    },
    backdrop: {
      opacity: 0.4
    }
  },

  button: {
    secondary: {
      color: colors.FOREGROUND,
      bg: rgba(colors.PURPLE, 0.2),
      border: colors.PURPLE,
      hoverBorder: rgba(colors.PURPLE, 0.7)
    },
    close: {
      color: colors.FOREGROUND,
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: ''
    },
    disabled: {
      color: colors.TEXT_MUTED,
      bg: colors.CURRENT_LINE,
      border: colors.CURRENT_LINE
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
        bg: colors.BRAND,
        text: colors.BACKGROUND,
        border: colors.BRAND
      },
      light: {
        bg: rgba(colors.BRAND, 0.1),
        text: colors.BRAND,
        border: rgba(colors.BRAND, 0.08)
      },
      secondary: {
        bg: colors.SURFACE0,
        text: colors.FOREGROUND,
        border: colors.CURRENT_LINE
      },
      success: {
        bg: colors.GREEN,
        text: colors.BACKGROUND,
        border: colors.GREEN
      },
      warning: {
        bg: colors.ORANGE,
        text: colors.BACKGROUND,
        border: colors.ORANGE
      },
      danger: {
        bg: colors.RED,
        text: colors.WHITE,
        border: colors.RED
      }
    }
  },

  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: colors.FOREGROUND,
      border: colors.BRAND
    },
    secondary: {
      active: {
        bg: colors.SURFACE1,
        color: colors.FOREGROUND
      },
      inactive: {
        bg: colors.SURFACE1,
        color: colors.FOREGROUND
      }
    }
  },

  requestTabs: {
    color: colors.FOREGROUND,
    bg: colors.SURFACE0,
    bottomBorder: colors.CURRENT_LINE,
    icon: {
      color: colors.TEXT_MUTED,
      hoverColor: colors.FOREGROUND,
      hoverBg: colors.BACKGROUND
    },
    example: {
      iconColor: colors.TEXT_MUTED
    }
  },

  codemirror: {
    bg: colors.BG,
    border: colors.BG,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.5
    },
    gutter: {
      bg: colors.BG
    },
    variable: {
      valid: colors.GREEN,
      invalid: colors.RED,
      prompt: colors.CYAN
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
    searchLineHighlightCurrent: rgba(colors.PURPLE, 0.15),
    searchMatch: colors.YELLOW,
    searchMatchActive: colors.ORANGE
  },

  table: {
    border: colors.SURFACE1,
    thead: {
      color: colors.FOREGROUND
    },
    striped: colors.SURFACE0,
    input: {
      color: colors.FOREGROUND
    }
  },

  plainGrid: {
    hoverBg: colors.SURFACE1
  },

  scrollbar: {
    color: colors.SURFACE1
  },

  dragAndDrop: {
    border: colors.CURRENT_LINE,
    borderStyle: '2px solid',
    hoverBg: rgba(colors.PURPLE, 0.1),
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: colors.SURFACE0,
    border: colors.CURRENT_LINE,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
  },

  statusBar: {
    border: colors.SURFACE1,
    color: colors.TEXT_MUTED
  },

  console: {
    bg: colors.BG,
    headerBg: colors.SURFACE0,
    contentBg: colors.BG,
    border: colors.SURFACE1,
    titleColor: colors.FOREGROUND,
    countColor: colors.TEXT_MUTED,
    buttonColor: colors.FOREGROUND,
    buttonHoverBg: rgba(colors.WHITE, 0.08),
    buttonHoverColor: colors.WHITE,
    messageColor: colors.FOREGROUND,
    timestampColor: colors.TEXT_MUTED,
    emptyColor: colors.TEXT_MUTED,
    logHoverBg: rgba(colors.WHITE, 0.04),
    resizeHandleHover: colors.PURPLE,
    resizeHandleActive: colors.PURPLE,
    dropdownBg: colors.SURFACE0,
    dropdownHeaderBg: colors.SURFACE1,
    optionHoverBg: rgba(colors.WHITE, 0.05),
    optionLabelColor: colors.FOREGROUND,
    optionCountColor: colors.TEXT_MUTED,
    checkboxColor: colors.BRAND,
    scrollbarTrack: colors.SURFACE0,
    scrollbarThumb: colors.CURRENT_LINE,
    scrollbarThumbHover: colors.COMMENT
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.SURFACE0
      },
      button: {
        active: {
          bg: colors.SURFACE1,
          color: colors.FOREGROUND
        },
        inactive: {
          bg: 'transparent',
          color: colors.TEXT_MUTED
        }
      }
    },
    importPaths: {
      header: {
        text: colors.TEXT_MUTED,
        button: {
          color: colors.TEXT_MUTED,
          hoverColor: colors.FOREGROUND
        }
      },
      error: {
        bg: 'transparent',
        text: colors.RED,
        link: {
          color: colors.RED,
          hoverColor: colors.ORANGE
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(colors.WHITE, 0.05),
        text: colors.FOREGROUND,
        icon: colors.TEXT_MUTED,
        checkbox: {
          color: colors.FOREGROUND
        },
        invalid: {
          opacity: 0.6,
          text: colors.RED
        }
      },
      empty: {
        text: colors.TEXT_MUTED
      },
      button: {
        bg: rgba(colors.PURPLE, 0.2),
        color: colors.FOREGROUND,
        border: colors.PURPLE,
        hoverBorder: rgba(colors.PURPLE, 0.7)
      }
    },
    protoFiles: {
      header: {
        text: colors.TEXT_MUTED,
        button: {
          color: colors.TEXT_MUTED,
          hoverColor: colors.FOREGROUND
        }
      },
      error: {
        bg: 'transparent',
        text: colors.RED,
        link: {
          color: colors.RED,
          hoverColor: colors.ORANGE
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(colors.WHITE, 0.05),
        selected: {
          bg: rgba(colors.PURPLE, 0.2),
          border: colors.BRAND
        },
        text: colors.FOREGROUND,
        secondaryText: colors.TEXT_MUTED,
        icon: colors.TEXT_MUTED,
        invalid: {
          opacity: 0.6,
          text: colors.RED
        }
      },
      empty: {
        text: colors.TEXT_MUTED
      },
      button: {
        bg: rgba(colors.PURPLE, 0.2),
        color: colors.FOREGROUND,
        border: colors.PURPLE,
        hoverBorder: rgba(colors.PURPLE, 0.7)
      }
    }
  },

  deprecationWarning: {
    bg: rgba(colors.RED, 0.1),
    border: rgba(colors.RED, 0.2),
    icon: colors.RED,
    text: colors.FOREGROUND
  },

  examples: {
    buttonBg: rgba(colors.PURPLE, 0.1),
    buttonColor: colors.BRAND,
    buttonText: colors.FOREGROUND,
    buttonIconColor: colors.FOREGROUND,
    border: colors.CURRENT_LINE,
    urlBar: {
      border: colors.SURFACE1,
      bg: colors.SURFACE0
    },
    table: {
      thead: {
        bg: colors.SURFACE0,
        color: colors.TEXT_MUTED
      }
    },
    checkbox: {
      color: colors.BACKGROUND
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.BG,
          border: colors.SURFACE1,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.TEXT_MUTED,
          separator: colors.SURFACE1,
          hoverBg: colors.BG,
          hoverBorder: colors.CURRENT_LINE,
          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.BG,
            border: colors.SURFACE1,
            hoverBg: colors.BG,
            hoverBorder: colors.CURRENT_LINE
          }
        },
        sandboxMode: {
          safeMode: {
            bg: rgba(colors.GREEN, 0.12),
            color: colors.GREEN
          },
          developerMode: {
            bg: rgba(colors.YELLOW, 0.12),
            color: colors.YELLOW
          }
        }
      }
    }
  }
};

export default draculaTheme;
