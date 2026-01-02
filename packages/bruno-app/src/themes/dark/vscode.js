// VS Code Dark+ Theme for Bruno
// Based on the default Visual Studio Code Dark+ theme

import { rgba } from 'polished';

const colors = {
  // VS Code Dark+ Core Colors
  EDITOR_BG: '#1e1e1e',
  SIDEBAR_BG: '#252526',
  ACTIVITY_BAR_BG: '#333333',
  PANEL_BG: '#1e1e1e',

  // Text colors
  TEXT: '#d4d4d4',
  TEXT_MUTED: '#808080',
  TEXT_LINK: '#3794ff',
  BRAND_TEXT: '#4dabfc', // VS Code blue

  // Brand - VS Code blue
  BRAND: '#007acc',
  BRAND_HOVER: '#1177bb',

  // Semantic colors
  GREEN: '#4ec9b0',
  YELLOW: '#dcdcaa',
  ORANGE: '#ce9178',
  RED: '#f14c4c',
  PURPLE: '#c586c0',
  BLUE: '#569cd6',
  CYAN: '#4fc1ff',

  WHITE: '#ffffff',
  BLACK: '#000000',

  // Grays (VS Code specific)
  GRAY_1: '#252526',
  GRAY_2: '#2d2d2d',
  GRAY_3: '#3c3c3c',
  GRAY_4: '#474747',
  GRAY_5: '#5a5a5a',
  GRAY_6: '#6e6e6e',
  GRAY_7: '#858585',
  GRAY_8: '#a0a0a0',

  // Borders
  BORDER: '#454545',
  BORDER_LIGHT: '#3c3c3c',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#9cdcfe',
    PROPERTY: '#9cdcfe',
    STRING: '#ce9178',
    NUMBER: '#b5cea8',
    ATOM: '#569cd6',
    VARIABLE: '#9cdcfe',
    KEYWORD: '#c586c0',
    COMMENT: '#6a9955',
    OPERATOR: '#d4d4d4',
    TAG: '#569cd6',
    TAG_BRACKET: '#808080'
  }
};

export const palette = {};

palette.intent = {
  INFO: colors.BLUE,
  SUCCESS: colors.GREEN,
  WARNING: colors.ORANGE,
  DANGER: colors.RED
};

const vscodeDarkTheme = {
  mode: 'dark',
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  bg: colors.EDITOR_BG,

  primary: {
    solid: colors.BRAND,
    text: colors.TEXT_LINK,
    strong: '#0098ff',
    subtle: '#005a9e'
  },

  accents: {
    primary: colors.BRAND
  },

  background: {
    base: colors.EDITOR_BG,
    mantle: colors.SIDEBAR_BG,
    crust: colors.GRAY_2,
    surface0: colors.GRAY_3,
    surface1: colors.GRAY_4,
    surface2: colors.GRAY_5
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
    overlay2: colors.GRAY_6,
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
    border2: colors.GRAY_5,
    border1: colors.BORDER,
    border0: colors.BORDER_LIGHT
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
      subtext2: colors.GRAY_8,
      subtext1: colors.GRAY_7,
      subtext0: colors.GRAY_6
    },
    bg: {
      danger: '#f14c4c'
    },
    accent: colors.BRAND
  },

  input: {
    bg: 'transparent',
    border: colors.BORDER,
    focusBorder: colors.BRAND,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.6
    }
  },

  sidebar: {
    color: colors.TEXT,
    muted: colors.TEXT_MUTED,
    bg: colors.SIDEBAR_BG,
    dragbar: {
      border: colors.BORDER_LIGHT,
      activeBorder: colors.GRAY_5
    },
    collection: {
      item: {
        bg: colors.GRAY_2,
        hoverBg: colors.GRAY_3,
        focusBorder: colors.GRAY_4,
        indentBorder: `solid 1px ${colors.BORDER}`,
        active: {
          indentBorder: `solid 1px ${colors.BORDER}`
        },
        example: {
          iconColor: colors.GRAY_7
        }
      }
    },
    dropdownIcon: {
      color: colors.TEXT
    }
  },

  dropdown: {
    color: colors.TEXT,
    iconColor: colors.TEXT,
    bg: colors.SIDEBAR_BG,
    hoverBg: colors.GRAY_3,
    shadow: 'none',
    border: colors.BORDER,
    separator: colors.BORDER,
    selectedColor: colors.TEXT_LINK,
    mutedText: colors.TEXT_MUTED
  },

  workspace: {
    accent: colors.BRAND,
    border: colors.BORDER,
    button: {
      bg: colors.GRAY_2
    }
  },

  request: {
    methods: {
      get: colors.GREEN,
      post: '#dcdcaa',
      put: colors.ORANGE,
      delete: colors.RED,
      patch: colors.ORANGE,
      options: colors.GRAY_7,
      head: colors.BLUE
    },
    grpc: colors.CYAN,
    ws: colors.YELLOW,
    gql: colors.PURPLE
  },

  requestTabPanel: {
    url: {
      bg: colors.EDITOR_BG,
      icon: colors.TEXT,
      iconDanger: colors.RED,
      border: `solid 1px ${colors.BORDER}`
    },
    dragbar: {
      border: colors.BORDER,
      activeBorder: colors.BRAND
    },
    responseStatus: colors.TEXT,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.BRAND,
    responseOverlayBg: 'rgba(30, 30, 30, 0.6)',
    card: {
      bg: colors.SIDEBAR_BG,
      border: 'transparent',
      hr: colors.BORDER
    },
    graphqlDocsExplorer: {
      bg: colors.EDITOR_BG,
      color: colors.TEXT
    }
  },

  notifications: {
    bg: colors.GRAY_3,
    list: {
      bg: colors.GRAY_2,
      borderRight: colors.BORDER,
      borderBottom: colors.BORDER,
      hoverBg: colors.GRAY_3,
      active: {
        border: colors.BRAND,
        bg: colors.GRAY_3,
        hoverBg: colors.GRAY_3
      }
    }
  },

  modal: {
    title: {
      color: colors.TEXT,
      bg: colors.SIDEBAR_BG
    },
    body: {
      color: colors.TEXT,
      bg: colors.GRAY_2
    },
    input: {
      bg: 'transparent',
      border: colors.BORDER,
      focusBorder: colors.BRAND
    },
    backdrop: {
      opacity: 0.25
    }
  },

  button: {
    secondary: {
      color: colors.WHITE,
      bg: colors.GRAY_4,
      border: colors.GRAY_4,
      hoverBorder: colors.GRAY_5
    },
    close: {
      color: colors.TEXT,
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: ''
    },
    disabled: {
      color: colors.GRAY_6,
      bg: colors.GRAY_4,
      border: colors.GRAY_4
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
        text: colors.WHITE,
        border: colors.BRAND
      },
      secondary: {
        bg: rgba(colors.BRAND_TEXT, 0.08),
        text: colors.BRAND_TEXT,
        border: rgba(colors.BRAND_TEXT, 0.06)
      },
      success: {
        bg: '#388a34',
        text: colors.WHITE,
        border: '#388a34'
      },
      warning: {
        bg: '#bf8803',
        text: colors.BLACK,
        border: '#bf8803'
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
      color: colors.TEXT,
      border: colors.BRAND
    },
    secondary: {
      active: {
        bg: colors.GRAY_3,
        color: colors.TEXT
      },
      inactive: {
        bg: colors.GRAY_4,
        color: colors.TEXT_MUTED
      }
    }
  },

  requestTabs: {
    color: colors.TEXT,
    bg: colors.SIDEBAR_BG,
    bottomBorder: colors.BORDER,
    icon: {
      color: colors.TEXT_MUTED,
      hoverColor: colors.TEXT,
      hoverBg: colors.GRAY_3
    },
    example: {
      iconColor: colors.GRAY_7
    }
  },

  codemirror: {
    bg: colors.EDITOR_BG,
    border: colors.EDITOR_BG,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.5
    },
    gutter: {
      bg: colors.EDITOR_BG
    },
    variable: {
      valid: colors.GREEN,
      invalid: colors.RED,
      prompt: colors.BRAND
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
    searchLineHighlightCurrent: 'rgba(255, 255, 0, 0.1)',
    searchMatch: '#515c6a',
    searchMatchActive: '#613214'
  },

  table: {
    border: colors.BORDER_LIGHT,
    thead: {
      color: colors.TEXT
    },
    striped: colors.GRAY_2,
    input: {
      color: colors.TEXT
    }
  },

  plainGrid: {
    hoverBg: colors.GRAY_3
  },

  scrollbar: {
    color: colors.GRAY_4
  },

  dragAndDrop: {
    border: colors.BRAND,
    borderStyle: '2px solid',
    hoverBg: 'rgba(0, 122, 204, 0.1)',
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: colors.SIDEBAR_BG,
    border: colors.BORDER,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
  },

  statusBar: {
    border: colors.BORDER_LIGHT,
    color: colors.TEXT_MUTED
  },

  console: {
    bg: colors.EDITOR_BG,
    headerBg: colors.SIDEBAR_BG,
    contentBg: colors.EDITOR_BG,
    border: colors.BORDER,
    titleColor: colors.TEXT,
    countColor: colors.TEXT_MUTED,
    buttonColor: colors.TEXT,
    buttonHoverBg: 'rgba(255, 255, 255, 0.1)',
    buttonHoverColor: colors.WHITE,
    messageColor: colors.TEXT,
    timestampColor: colors.TEXT_MUTED,
    emptyColor: colors.TEXT_MUTED,
    logHoverBg: 'rgba(255, 255, 255, 0.05)',
    resizeHandleHover: colors.BRAND,
    resizeHandleActive: colors.BRAND,
    dropdownBg: colors.SIDEBAR_BG,
    dropdownHeaderBg: colors.GRAY_3,
    optionHoverBg: 'rgba(255, 255, 255, 0.05)',
    optionLabelColor: colors.TEXT,
    optionCountColor: colors.TEXT_MUTED,
    checkboxColor: colors.BRAND,
    scrollbarTrack: colors.SIDEBAR_BG,
    scrollbarThumb: colors.GRAY_5,
    scrollbarThumbHover: colors.GRAY_6
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.GRAY_2
      },
      button: {
        active: {
          bg: colors.GRAY_3,
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
          hoverColor: colors.TEXT
        }
      },
      error: {
        bg: 'transparent',
        text: colors.RED,
        link: {
          color: colors.RED,
          hoverColor: '#ff6b6b'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        text: colors.TEXT,
        icon: colors.TEXT_MUTED,
        checkbox: {
          color: colors.TEXT
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
        bg: colors.GRAY_4,
        color: colors.TEXT,
        border: colors.GRAY_4,
        hoverBorder: colors.GRAY_5
      }
    },
    protoFiles: {
      header: {
        text: colors.TEXT_MUTED,
        button: {
          color: colors.TEXT_MUTED,
          hoverColor: colors.TEXT
        }
      },
      error: {
        bg: 'transparent',
        text: colors.RED,
        link: {
          color: colors.RED,
          hoverColor: '#ff6b6b'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        selected: {
          bg: 'rgba(0, 122, 204, 0.2)',
          border: colors.BRAND
        },
        text: colors.TEXT,
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
        bg: colors.GRAY_4,
        color: colors.TEXT,
        border: colors.GRAY_4,
        hoverBorder: colors.GRAY_5
      }
    }
  },

  deprecationWarning: {
    bg: 'rgba(241, 76, 76, 0.1)',
    border: 'rgba(241, 76, 76, 0.2)',
    icon: colors.RED,
    text: colors.TEXT
  },

  examples: {
    buttonBg: 'rgba(0, 122, 204, 0.15)',
    buttonColor: colors.TEXT_LINK,
    buttonText: colors.WHITE,
    buttonIconColor: colors.WHITE,
    border: colors.BORDER,
    urlBar: {
      border: colors.BORDER,
      bg: colors.GRAY_2
    },
    table: {
      thead: {
        bg: colors.GRAY_2,
        color: colors.TEXT_MUTED
      }
    },
    checkbox: {
      color: colors.WHITE
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.EDITOR_BG,
          border: colors.BORDER,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.TEXT_MUTED,
          separator: colors.BORDER,
          hoverBg: colors.EDITOR_BG,
          hoverBorder: colors.GRAY_5,
          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.EDITOR_BG,
            border: colors.BORDER,
            hoverBg: colors.EDITOR_BG,
            hoverBorder: colors.GRAY_5
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(78, 201, 176, 0.12)',
            color: colors.GREEN
          },
          developerMode: {
            bg: 'rgba(220, 220, 170, 0.12)',
            color: colors.YELLOW
          }
        }
      }
    }
  }
};

export default vscodeDarkTheme;
