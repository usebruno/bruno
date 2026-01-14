// Nord Theme for Bruno
// https://www.nordtheme.com/
//
// Polar Night: nord0-nord3 (#2e3440, #3b4252, #434c5e, #4c566a)
// Snow Storm: nord4-nord6 (#d8dee9, #e5e9f0, #eceff4)
// Frost: nord7-nord10 (#8fbcbb, #88c0d0, #81a1c1, #5e81ac)
// Aurora: nord11-nord15 (#bf616a, #d08770, #ebcb8b, #a3be8c, #b48ead)

import { rgba } from 'polished';

const colors = {
  // Polar Night
  NORD0: '#2e3440',
  NORD1: '#3b4252',
  NORD2: '#434c5e',
  NORD3: '#4c566a',

  // Snow Storm
  NORD4: '#d8dee9',
  NORD5: '#e5e9f0',
  NORD6: '#eceff4',

  // Frost
  NORD7: '#8fbcbb',
  NORD8: '#88c0d0',
  NORD9: '#81a1c1',
  NORD10: '#5e81ac',

  // Aurora
  NORD11: '#bf616a',
  NORD12: '#d08770',
  NORD13: '#ebcb8b',
  NORD14: '#a3be8c',
  NORD15: '#b48ead',

  // Semantic aliases
  BRAND: '#88c0d0',
  TEXT: '#d8dee9',
  TEXT_MUTED: '#7b88a1',
  TEXT_LINK: '#88c0d0',
  BG: '#2e3440',

  WHITE: '#eceff4',
  BLACK: '#2e3440',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#a3be8c',
    PROPERTY: '#88c0d0',
    STRING: '#a3be8c',
    NUMBER: '#b48ead',
    ATOM: '#81a1c1',
    VARIABLE: '#d8dee9',
    KEYWORD: '#81a1c1',
    COMMENT: '#616e88',
    OPERATOR: '#81a1c1',
    TAG: '#81a1c1',
    TAG_BRACKET: '#616e88'
  }
};

export const palette = {};

palette.intent = {
  INFO: colors.NORD10,
  SUCCESS: colors.NORD14,
  WARNING: colors.NORD12,
  DANGER: colors.NORD11
};

const nordTheme = {
  mode: 'dark',
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  draftColor: '#cc7b1b',
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
    base: colors.NORD0,
    mantle: colors.NORD1,
    crust: colors.NORD2,
    surface0: colors.NORD2,
    surface1: colors.NORD3,
    surface2: '#5d6b83'
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
    overlay2: '#616e88',
    overlay1: '#5d6b83',
    overlay0: '#4c566a'
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
    border2: colors.NORD3,
    border1: colors.NORD2,
    border0: colors.NORD1
  },

  colors: {
    text: {
      white: colors.WHITE,
      green: colors.NORD14,
      danger: colors.NORD11,
      warning: colors.NORD12,
      muted: colors.TEXT_MUTED,
      purple: colors.NORD15,
      yellow: colors.NORD13,
      subtext2: colors.NORD4,
      subtext1: colors.TEXT_MUTED,
      subtext0: '#616e88'
    },
    bg: {
      danger: colors.NORD11
    },
    accent: colors.BRAND
  },

  input: {
    bg: 'transparent',
    border: colors.NORD3,
    focusBorder: colors.NORD8,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.6
    }
  },

  sidebar: {
    color: colors.NORD4,
    muted: colors.TEXT_MUTED,
    bg: colors.BG,
    dragbar: {
      border: colors.NORD2,
      activeBorder: colors.NORD3
    },
    collection: {
      item: {
        bg: colors.NORD1,
        hoverBg: colors.NORD2,
        focusBorder: colors.NORD3,
        indentBorder: colors.NORD2,
        active: {
          indentBorder: colors.NORD2
        },
        example: {
          iconColor: colors.TEXT_MUTED
        }
      }
    },
    dropdownIcon: {
      color: colors.NORD4
    }
  },

  dropdown: {
    color: colors.NORD4,
    iconColor: colors.NORD4,
    bg: colors.NORD1,
    hoverBg: colors.NORD2,
    shadow: 'none',
    border: colors.NORD3,
    separator: colors.NORD3,
    selectedColor: colors.NORD8,
    mutedText: colors.TEXT_MUTED
  },

  workspace: {
    accent: colors.BRAND,
    border: colors.NORD3,
    button: {
      bg: colors.NORD2
    }
  },

  request: {
    methods: {
      get: colors.NORD14,
      post: colors.NORD15,
      put: colors.NORD13,
      delete: colors.NORD11,
      patch: colors.NORD12,
      options: colors.NORD7,
      head: colors.NORD9
    },
    grpc: colors.NORD8,
    ws: colors.NORD13,
    gql: colors.NORD15
  },

  requestTabPanel: {
    url: {
      bg: colors.BG,
      icon: colors.NORD4,
      iconDanger: colors.NORD11,
      border: `solid 1px ${colors.NORD2}`
    },
    dragbar: {
      border: colors.NORD3,
      activeBorder: colors.NORD8
    },
    responseStatus: colors.NORD4,
    responseOk: colors.NORD14,
    responseError: colors.NORD11,
    responsePending: colors.NORD8,
    responseOverlayBg: 'rgba(46, 52, 64, 0.6)',
    card: {
      bg: colors.NORD1,
      border: 'transparent',
      hr: colors.NORD3
    },
    graphqlDocsExplorer: {
      bg: colors.BG,
      color: colors.NORD4
    }
  },

  notifications: {
    bg: colors.NORD2,
    list: {
      bg: colors.NORD1,
      borderRight: colors.NORD3,
      borderBottom: colors.NORD3,
      hoverBg: colors.NORD2,
      active: {
        border: colors.NORD8,
        bg: colors.NORD2,
        hoverBg: colors.NORD2
      }
    }
  },

  modal: {
    title: {
      color: colors.NORD4,
      bg: colors.NORD1
    },
    body: {
      color: colors.NORD4,
      bg: colors.NORD1
    },
    input: {
      bg: 'transparent',
      border: colors.NORD3,
      focusBorder: colors.NORD8
    },
    backdrop: {
      opacity: 0.3
    }
  },

  button: {
    secondary: {
      color: colors.NORD4,
      bg: colors.NORD10,
      border: colors.NORD10,
      hoverBorder: colors.NORD9
    },
    close: {
      color: colors.NORD4,
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: ''
    },
    disabled: {
      color: colors.TEXT_MUTED,
      bg: colors.NORD3,
      border: colors.NORD3
    },
    danger: {
      color: colors.WHITE,
      bg: colors.NORD11,
      border: colors.NORD11
    }
  },

  button2: {
    color: {
      primary: {
        bg: colors.BRAND,
        text: colors.NORD0,
        border: colors.BRAND
      },
      light: {
        bg: rgba(colors.BRAND, 0.08),
        text: colors.BRAND,
        border: rgba(colors.BRAND, 0.06)
      },
      secondary: {
        bg: colors.NORD1,
        text: colors.NORD4,
        border: colors.NORD3
      },
      success: {
        bg: colors.NORD14,
        text: colors.NORD0,
        border: colors.NORD14
      },
      warning: {
        bg: colors.NORD13,
        text: colors.NORD0,
        border: colors.NORD13
      },
      danger: {
        bg: colors.NORD11,
        text: colors.NORD6,
        border: colors.NORD11
      }
    }
  },

  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: colors.NORD4,
      border: colors.BRAND
    },
    secondary: {
      active: {
        bg: colors.NORD2,
        color: colors.NORD4
      },
      inactive: {
        bg: colors.NORD2,
        color: colors.NORD4
      }
    }
  },

  requestTabs: {
    color: colors.NORD4,
    bg: colors.NORD1,
    bottomBorder: colors.NORD3,
    icon: {
      color: colors.TEXT_MUTED,
      hoverColor: colors.NORD4,
      hoverBg: colors.NORD0
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
      valid: colors.NORD14,
      invalid: colors.NORD11,
      prompt: colors.NORD8
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
    searchLineHighlightCurrent: 'rgba(136, 192, 208, 0.15)',
    searchMatch: colors.NORD13,
    searchMatchActive: colors.NORD12
  },

  table: {
    border: colors.NORD2,
    thead: {
      color: colors.NORD4,
      bg: colors.NORD1
    },
    striped: colors.NORD1,
    input: {
      color: colors.NORD4
    }
  },

  plainGrid: {
    hoverBg: colors.NORD2
  },

  scrollbar: {
    color: colors.NORD2
  },

  dragAndDrop: {
    border: colors.NORD3,
    borderStyle: '2px solid',
    hoverBg: 'rgba(76, 86, 106, 0.15)',
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: colors.NORD1,
    border: colors.NORD3,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
  },

  statusBar: {
    border: colors.NORD2,
    color: colors.TEXT_MUTED
  },

  console: {
    bg: colors.BG,
    headerBg: colors.NORD1,
    contentBg: colors.BG,
    border: colors.NORD2,
    titleColor: colors.NORD4,
    countColor: colors.TEXT_MUTED,
    buttonColor: colors.NORD4,
    buttonHoverBg: 'rgba(255, 255, 255, 0.1)',
    buttonHoverColor: colors.NORD6,
    messageColor: colors.NORD4,
    timestampColor: colors.TEXT_MUTED,
    emptyColor: colors.TEXT_MUTED,
    logHoverBg: 'rgba(255, 255, 255, 0.05)',
    resizeHandleHover: colors.NORD8,
    resizeHandleActive: colors.NORD8,
    dropdownBg: colors.NORD1,
    dropdownHeaderBg: colors.NORD2,
    optionHoverBg: 'rgba(255, 255, 255, 0.05)',
    optionLabelColor: colors.NORD4,
    optionCountColor: colors.TEXT_MUTED,
    checkboxColor: colors.BRAND,
    scrollbarTrack: colors.NORD1,
    scrollbarThumb: colors.NORD3,
    scrollbarThumbHover: colors.NORD9
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.NORD1
      },
      button: {
        active: {
          bg: colors.NORD2,
          color: colors.NORD6
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
          hoverColor: colors.NORD4
        }
      },
      error: {
        bg: 'transparent',
        text: colors.NORD11,
        link: {
          color: colors.NORD11,
          hoverColor: '#d08770'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        text: colors.NORD4,
        icon: colors.TEXT_MUTED,
        checkbox: {
          color: colors.NORD4
        },
        invalid: {
          opacity: 0.6,
          text: colors.NORD11
        }
      },
      empty: {
        text: colors.TEXT_MUTED
      },
      button: {
        bg: colors.NORD10,
        color: colors.NORD4,
        border: colors.NORD10,
        hoverBorder: colors.NORD9
      }
    },
    protoFiles: {
      header: {
        text: colors.TEXT_MUTED,
        button: {
          color: colors.TEXT_MUTED,
          hoverColor: colors.NORD4
        }
      },
      error: {
        bg: 'transparent',
        text: colors.NORD11,
        link: {
          color: colors.NORD11,
          hoverColor: '#d08770'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        selected: {
          bg: 'rgba(136, 192, 208, 0.2)',
          border: colors.BRAND
        },
        text: colors.NORD4,
        secondaryText: colors.TEXT_MUTED,
        icon: colors.TEXT_MUTED,
        invalid: {
          opacity: 0.6,
          text: colors.NORD11
        }
      },
      empty: {
        text: colors.TEXT_MUTED
      },
      button: {
        bg: colors.NORD10,
        color: colors.NORD4,
        border: colors.NORD10,
        hoverBorder: colors.NORD9
      }
    }
  },

  deprecationWarning: {
    bg: 'rgba(191, 97, 106, 0.1)',
    border: 'rgba(191, 97, 106, 0.2)',
    icon: colors.NORD11,
    text: colors.NORD4
  },

  examples: {
    buttonBg: 'rgba(136, 192, 208, 0.1)',
    buttonColor: colors.BRAND,
    buttonText: colors.NORD6,
    buttonIconColor: colors.NORD6,
    border: colors.NORD3,
    urlBar: {
      border: colors.NORD2,
      bg: colors.NORD1
    },
    table: {
      thead: {
        bg: colors.NORD1,
        color: colors.TEXT_MUTED
      }
    },
    checkbox: {
      color: colors.NORD0
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.BG,
          border: colors.NORD2,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.TEXT_MUTED,
          separator: colors.NORD2,
          hoverBg: colors.BG,
          hoverBorder: colors.NORD3,
          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.BG,
            border: colors.NORD2,
            hoverBg: colors.BG,
            hoverBorder: colors.NORD3
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(163, 190, 140, 0.12)',
            color: colors.NORD14
          },
          developerMode: {
            bg: 'rgba(235, 203, 139, 0.12)',
            color: colors.NORD13
          }
        }
      }
    }
  }
};

export default nordTheme;
