// Dracula Theme for Bruno
// https://draculatheme.com/
//
// Official palette:
//   Background   #282a36
//   Current Line #44475a
//   Foreground   #f8f8f2
//   Comment      #6272a4
//   Cyan         #8be9fd
//   Green        #50fa7b
//   Orange       #ffb86c
//   Pink         #ff79c6
//   Purple       #bd93f9
//   Red          #ff5555
//   Yellow       #f1fa8c

import { rgba } from 'polished';

const colors = {
  // Official Dracula palette
  BACKGROUND: '#282a36',
  CURRENT_LINE: '#44475a',
  FOREGROUND: '#f8f8f2',
  COMMENT: '#6272a4',
  CYAN: '#8be9fd',
  GREEN: '#50fa7b',
  ORANGE: '#ffb86c',
  PINK: '#ff79c6',
  PURPLE: '#bd93f9',
  RED: '#ff5555',
  YELLOW: '#f1fa8c',

  // Auxiliary shades derived from the official palette
  BG_DARKER: '#21222c',
  BG_DARKEST: '#191a21',
  BG_ELEVATED: '#343746',
  BG_HOVER: '#3d3f4b',

  // Semantic aliases
  BRAND: '#bd93f9',
  TEXT: '#f8f8f2',
  TEXT_MUTED: '#6272a4',
  TEXT_LINK: '#8be9fd',
  BG: '#282a36',

  WHITE: '#f8f8f2',
  BLACK: '#21222c',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#50fa7b',
    PROPERTY: '#8be9fd',
    STRING: '#f1fa8c',
    NUMBER: '#bd93f9',
    ATOM: '#bd93f9',
    VARIABLE: '#f8f8f2',
    KEYWORD: '#ff79c6',
    COMMENT: '#6272a4',
    OPERATOR: '#ff79c6',
    TAG: '#ff79c6',
    TAG_BRACKET: '#6272a4'
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
    mantle: colors.BG_DARKER,
    crust: colors.BG_DARKEST,
    surface0: colors.BG_ELEVATED,
    surface1: colors.CURRENT_LINE,
    surface2: colors.COMMENT
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
    overlay2: colors.COMMENT,
    overlay1: colors.CURRENT_LINE,
    overlay0: colors.BG_HOVER
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
    sm: '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.2)',
    md: '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.3)',
    lg: '0 2px 12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.3)'
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
    border1: colors.BG_ELEVATED,
    border0: colors.BG_DARKER
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
      subtext0: colors.CURRENT_LINE
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
    bg: colors.BG_DARKER,
    dragbar: {
      border: colors.BG_ELEVATED,
      activeBorder: colors.CURRENT_LINE
    },
    collection: {
      item: {
        bg: colors.BG_DARKER,
        hoverBg: colors.BG_ELEVATED,
        focusBorder: colors.CURRENT_LINE,
        indentBorder: colors.BG_ELEVATED,
        active: {
          indentBorder: colors.BG_ELEVATED
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
    bg: colors.BG_DARKER,
    hoverBg: colors.BG_ELEVATED,
    shadow: 'none',
    border: colors.CURRENT_LINE,
    separator: colors.BG_ELEVATED,
    selectedColor: colors.PURPLE,
    mutedText: colors.TEXT_MUTED
  },

  workspace: {
    accent: colors.BRAND,
    border: colors.CURRENT_LINE,
    button: {
      bg: colors.BG_ELEVATED
    }
  },

  request: {
    methods: {
      get: colors.GREEN,
      post: colors.PINK,
      put: colors.YELLOW,
      delete: colors.RED,
      patch: colors.ORANGE,
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
      border: `solid 1px ${colors.BG_ELEVATED}`
    },
    dragbar: {
      border: colors.CURRENT_LINE,
      activeBorder: colors.PURPLE
    },
    responseStatus: colors.FOREGROUND,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.PURPLE,
    responseOverlayBg: 'rgba(40, 42, 54, 0.6)',
    card: {
      bg: colors.BG_DARKER,
      border: 'transparent',
      hr: colors.BG_ELEVATED
    },
    graphqlDocsExplorer: {
      bg: colors.BG,
      color: colors.FOREGROUND
    }
  },

  notifications: {
    bg: colors.BG_ELEVATED,
    list: {
      bg: colors.BG_DARKER,
      borderRight: colors.BG_ELEVATED,
      borderBottom: colors.BG_ELEVATED,
      hoverBg: colors.BG_ELEVATED,
      active: {
        border: colors.PURPLE,
        bg: colors.BG_ELEVATED,
        hoverBg: colors.BG_ELEVATED
      }
    }
  },

  modal: {
    title: {
      color: colors.FOREGROUND,
      bg: colors.BG_DARKER
    },
    body: {
      color: colors.FOREGROUND,
      bg: colors.BG_DARKER
    },
    input: {
      bg: 'transparent',
      border: colors.CURRENT_LINE,
      focusBorder: colors.PURPLE
    },
    backdrop: {
      opacity: 0.3
    }
  },

  button: {
    secondary: {
      color: colors.FOREGROUND,
      bg: colors.PURPLE,
      border: colors.PURPLE,
      hoverBorder: colors.PINK
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
        bg: rgba(colors.BRAND, 0.08),
        text: colors.BRAND,
        border: rgba(colors.BRAND, 0.06)
      },
      secondary: {
        bg: colors.BG_DARKER,
        text: colors.FOREGROUND,
        border: colors.CURRENT_LINE
      },
      success: {
        bg: colors.GREEN,
        text: colors.BACKGROUND,
        border: colors.GREEN
      },
      warning: {
        bg: colors.YELLOW,
        text: colors.BACKGROUND,
        border: colors.YELLOW
      },
      danger: {
        bg: colors.RED,
        text: colors.FOREGROUND,
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
        bg: colors.BG_ELEVATED,
        color: colors.FOREGROUND
      },
      inactive: {
        bg: colors.BG_ELEVATED,
        color: colors.FOREGROUND
      }
    }
  },

  requestTabs: {
    color: colors.FOREGROUND,
    bg: colors.BG_DARKER,
    bottomBorder: colors.BG_ELEVATED,
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
      prompt: colors.PURPLE
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
    searchLineHighlightCurrent: 'rgba(189, 147, 249, 0.15)',
    searchMatch: colors.YELLOW,
    searchMatchActive: colors.ORANGE
  },

  table: {
    border: colors.BG_ELEVATED,
    thead: {
      color: colors.FOREGROUND
    },
    striped: colors.BG_DARKER,
    input: {
      color: colors.FOREGROUND
    }
  },

  plainGrid: {
    hoverBg: colors.BG_ELEVATED
  },

  scrollbar: {
    color: colors.BG_ELEVATED
  },

  dragAndDrop: {
    border: colors.CURRENT_LINE,
    borderStyle: '2px solid',
    hoverBg: 'rgba(68, 71, 90, 0.15)',
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: colors.BG_DARKER,
    border: colors.CURRENT_LINE,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
  },

  statusBar: {
    border: colors.BG_ELEVATED,
    color: colors.TEXT_MUTED
  },

  console: {
    bg: colors.BG,
    headerBg: colors.BG_DARKER,
    contentBg: colors.BG,
    border: colors.BG_ELEVATED,
    titleColor: colors.FOREGROUND,
    countColor: colors.TEXT_MUTED,
    buttonColor: colors.FOREGROUND,
    buttonHoverBg: 'rgba(255, 255, 255, 0.1)',
    buttonHoverColor: colors.WHITE,
    messageColor: colors.FOREGROUND,
    timestampColor: colors.TEXT_MUTED,
    emptyColor: colors.TEXT_MUTED,
    logHoverBg: 'rgba(255, 255, 255, 0.05)',
    resizeHandleHover: colors.PURPLE,
    resizeHandleActive: colors.PURPLE,
    dropdownBg: colors.BG_DARKER,
    dropdownHeaderBg: colors.BG_ELEVATED,
    optionHoverBg: 'rgba(255, 255, 255, 0.05)',
    optionLabelColor: colors.FOREGROUND,
    optionCountColor: colors.TEXT_MUTED,
    checkboxColor: colors.BRAND,
    scrollbarTrack: colors.BG_DARKER,
    scrollbarThumb: colors.CURRENT_LINE,
    scrollbarThumbHover: colors.COMMENT
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.BG_DARKER
      },
      button: {
        active: {
          bg: colors.BG_ELEVATED,
          color: colors.WHITE
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
        hoverBg: 'rgba(255, 255, 255, 0.05)',
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
        bg: colors.PURPLE,
        color: colors.FOREGROUND,
        border: colors.PURPLE,
        hoverBorder: colors.PINK
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
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        selected: {
          bg: 'rgba(189, 147, 249, 0.2)',
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
        bg: colors.PURPLE,
        color: colors.FOREGROUND,
        border: colors.PURPLE,
        hoverBorder: colors.PINK
      }
    }
  },

  deprecationWarning: {
    bg: 'rgba(255, 85, 85, 0.1)',
    border: 'rgba(255, 85, 85, 0.2)',
    icon: colors.RED,
    text: colors.FOREGROUND
  },

  examples: {
    buttonBg: 'rgba(189, 147, 249, 0.1)',
    buttonColor: colors.BRAND,
    buttonText: colors.WHITE,
    buttonIconColor: colors.WHITE,
    border: colors.CURRENT_LINE,
    urlBar: {
      border: colors.BG_ELEVATED,
      bg: colors.BG_DARKER
    },
    table: {
      thead: {
        bg: colors.BG_DARKER,
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
          border: colors.BG_ELEVATED,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.TEXT_MUTED,
          separator: colors.BG_ELEVATED,
          hoverBg: colors.BG,
          hoverBorder: colors.CURRENT_LINE,
          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.BG,
            border: colors.BG_ELEVATED,
            hoverBg: colors.BG,
            hoverBorder: colors.CURRENT_LINE
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(80, 250, 123, 0.12)',
            color: colors.GREEN
          },
          developerMode: {
            bg: 'rgba(241, 250, 140, 0.12)',
            color: colors.YELLOW
          }
        }
      }
    }
  }
};

export default draculaTheme;
