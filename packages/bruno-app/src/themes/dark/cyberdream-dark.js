// Cyberdream Theme for Bruno (dark)
// https://github.com/scottmckendry/cyberdream.nvim

import { mix, rgba } from 'polished';

const BG = '#16181a';
const BG_ALT = '#1e2124';
const BG_HIGHLIGHT = '#3c4048';
const FG = '#ffffff';
const GREY = '#7b8496';

const colors = {
  BG,
  BG_ALT,
  BG_HIGHLIGHT,
  FG,
  GREY,

  BLUE: '#5ea1ff',
  GREEN: '#5eff6c',
  CYAN: '#5ef1ff',
  RED: '#ff6e5e',
  YELLOW: '#f1ff5e',
  MAGENTA: '#ff5ef1',
  PINK: '#ff5ea0',
  ORANGE: '#ffbd5e',
  PURPLE: '#bd5eff',

  // Derived surfaces: progressive steps from bg_alt towards bg_highlight
  CRUST: mix(0.12, BG_HIGHLIGHT, BG_ALT),
  SURFACE0: mix(0.25, BG_HIGHLIGHT, BG_ALT),
  SURFACE1: mix(0.6, BG_HIGHLIGHT, BG_ALT),
  SURFACE2: BG_HIGHLIGHT,

  BORDER0: mix(0.2, BG_HIGHLIGHT, BG_ALT),
  BORDER1: mix(0.5, BG_HIGHLIGHT, BG_ALT),
  BORDER2: BG_HIGHLIGHT,

  OVERLAY0: BG_HIGHLIGHT,
  OVERLAY1: mix(0.5, GREY, BG_HIGHLIGHT),
  OVERLAY2: GREY,

  SUBTEXT2: mix(0.25, GREY, FG),
  SUBTEXT1: GREY,
  SUBTEXT0: mix(0.35, BG, GREY)
};

colors.BRAND = colors.CYAN;
colors.TEXT = colors.FG;
colors.TEXT_MUTED = colors.SUBTEXT1;
colors.TEXT_LINK = colors.BLUE;
colors.WHITE = colors.FG;

export const palette = {};

palette.intent = {
  INFO: colors.BLUE,
  SUCCESS: colors.GREEN,
  WARNING: colors.ORANGE,
  DANGER: colors.RED
};

const cyberdreamDarkTheme = {
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

  ws: {
    activeMessage: {
      label: colors.BRAND
    }
  },

  accents: {
    primary: colors.BRAND
  },

  background: {
    base: colors.BG,
    mantle: colors.BG_ALT,
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
    border2: colors.BORDER2,
    border1: colors.BORDER1,
    border0: colors.BORDER0
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
      subtext2: colors.SUBTEXT2,
      subtext1: colors.SUBTEXT1,
      subtext0: colors.SUBTEXT0
    },
    bg: {
      danger: colors.RED
    },
    accent: colors.BRAND
  },

  input: {
    bg: 'transparent',
    border: colors.BORDER2,
    focusBorder: colors.BRAND,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.6
    }
  },

  sidebar: {
    color: colors.TEXT,
    muted: colors.TEXT_MUTED,
    bg: colors.BG,
    dragbar: {
      border: colors.BORDER1,
      activeBorder: colors.BORDER2
    },
    collection: {
      item: {
        bg: colors.BG_ALT,
        hoverBg: colors.SURFACE0,
        focusBorder: colors.BORDER2,
        indentBorder: colors.BORDER1,
        active: {
          indentBorder: colors.BORDER1
        },
        example: {
          iconColor: colors.TEXT_MUTED
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
    bg: colors.BG_ALT,
    hoverBg: colors.SURFACE0,
    shadow: 'none',
    border: colors.BORDER2,
    separator: colors.BORDER1,
    selectedColor: colors.BRAND,
    mutedText: colors.TEXT_MUTED
  },

  workspace: {
    accent: colors.BRAND,
    border: colors.BORDER2,
    button: {
      bg: colors.SURFACE0
    }
  },

  request: {
    methods: {
      get: colors.GREEN,
      post: colors.PURPLE,
      put: colors.YELLOW,
      delete: colors.RED,
      patch: colors.ORANGE,
      options: colors.CYAN,
      head: colors.BLUE
    },
    grpc: colors.CYAN,
    ws: colors.YELLOW,
    gql: colors.MAGENTA
  },

  requestTabPanel: {
    url: {
      bg: colors.BG,
      icon: colors.TEXT,
      iconDanger: colors.RED,
      border: `solid 1px ${colors.BORDER1}`
    },
    dragbar: {
      border: colors.BORDER1,
      activeBorder: colors.BRAND
    },
    responseStatus: colors.SUBTEXT2,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.CYAN,
    responseOverlayBg: rgba(colors.BG, 0.6),
    card: {
      bg: colors.BG_ALT,
      border: 'transparent',
      hr: colors.BORDER2
    },
    graphqlDocsExplorer: {
      bg: colors.BG,
      color: colors.TEXT
    }
  },

  notifications: {
    bg: colors.BG,
    list: {
      bg: colors.BG,
      borderBottom: colors.BORDER1,
      hoverBg: colors.SURFACE0,
      active: {
        bg: colors.SURFACE1,
        hoverBg: colors.SURFACE2
      }
    }
  },

  modal: {
    title: {
      color: colors.TEXT,
      bg: colors.BG_ALT
    },
    body: {
      color: colors.TEXT,
      bg: colors.BG_ALT
    },
    input: {
      bg: 'transparent',
      border: colors.BORDER2,
      focusBorder: colors.BRAND
    },
    backdrop: {
      opacity: 0.3
    }
  },

  button: {
    secondary: {
      color: colors.BG,
      bg: colors.BRAND,
      border: colors.BRAND,
      hoverBorder: colors.BLUE
    },
    close: {
      color: colors.TEXT,
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: ''
    },
    disabled: {
      color: colors.TEXT_MUTED,
      bg: colors.SURFACE1,
      border: colors.SURFACE1
    },
    danger: {
      color: colors.BG,
      bg: colors.RED,
      border: colors.RED
    }
  },

  button2: {
    color: {
      primary: {
        bg: colors.BRAND,
        text: colors.BG,
        border: colors.BRAND
      },
      light: {
        bg: rgba(colors.BRAND, 0.08),
        text: colors.BRAND,
        border: rgba(colors.BRAND, 0.06)
      },
      secondary: {
        bg: colors.BG_ALT,
        text: colors.TEXT,
        border: colors.BORDER2
      },
      success: {
        bg: colors.GREEN,
        text: colors.BG,
        border: colors.GREEN
      },
      warning: {
        bg: colors.ORANGE,
        text: colors.BG,
        border: colors.ORANGE
      },
      danger: {
        bg: colors.RED,
        text: colors.BG,
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
        bg: colors.SURFACE0,
        color: colors.TEXT
      },
      inactive: {
        bg: colors.SURFACE0,
        color: colors.TEXT_MUTED
      }
    }
  },

  requestTabs: {
    color: colors.TEXT,
    bg: colors.BG_ALT,
    bottomBorder: colors.BORDER1,
    icon: {
      color: colors.TEXT_MUTED,
      hoverColor: colors.TEXT,
      hoverBg: colors.BG
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
      definition: colors.GREEN,
      property: colors.CYAN,
      string: colors.GREEN,
      number: colors.PURPLE,
      atom: colors.BLUE,
      variable: colors.FG,
      keyword: colors.MAGENTA,
      comment: colors.GREY,
      operator: colors.PINK,
      tag: colors.BLUE,
      tagBracket: colors.GREY
    },
    searchLineHighlightCurrent: rgba(colors.CYAN, 0.15),
    searchMatch: colors.YELLOW,
    searchMatchActive: colors.ORANGE
  },

  table: {
    border: colors.BORDER1,
    thead: {
      color: colors.TEXT
    },
    striped: colors.BG_ALT,
    input: {
      color: colors.TEXT
    }
  },

  plainGrid: {
    hoverBg: colors.SURFACE0
  },

  scrollbar: {
    color: colors.SURFACE1
  },

  dragAndDrop: {
    border: colors.BRAND,
    borderStyle: '2px solid',
    hoverBg: rgba(colors.CYAN, 0.15),
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: colors.BG_ALT,
    border: colors.BORDER2,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
  },

  statusBar: {
    border: colors.BORDER1,
    color: colors.TEXT_MUTED
  },

  console: {
    bg: colors.BG,
    headerBg: colors.BG_ALT,
    contentBg: colors.BG,
    border: colors.BORDER1,
    titleColor: colors.TEXT,
    countColor: colors.TEXT_MUTED,
    buttonColor: colors.TEXT,
    buttonHoverBg: rgba(colors.FG, 0.1),
    buttonHoverColor: colors.FG,
    messageColor: colors.SUBTEXT2,
    timestampColor: colors.TEXT_MUTED,
    emptyColor: colors.TEXT_MUTED,
    logHoverBg: rgba(colors.FG, 0.05),
    resizeHandleHover: colors.BRAND,
    resizeHandleActive: colors.BRAND,
    dropdownBg: colors.BG_ALT,
    dropdownHeaderBg: colors.SURFACE0,
    optionHoverBg: rgba(colors.FG, 0.05),
    optionLabelColor: colors.TEXT,
    optionCountColor: colors.TEXT_MUTED,
    checkboxColor: colors.BRAND,
    scrollbarTrack: colors.BG_ALT,
    scrollbarThumb: colors.SURFACE1,
    scrollbarThumbHover: colors.OVERLAY1
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.BG_ALT
      },
      button: {
        active: {
          bg: colors.SURFACE0,
          color: colors.TEXT
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
          hoverColor: colors.ORANGE
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(colors.FG, 0.05),
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
        bg: colors.BRAND,
        color: colors.BG,
        border: colors.BRAND,
        hoverBorder: colors.BLUE
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
          hoverColor: colors.ORANGE
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(colors.FG, 0.05),
        selected: {
          bg: rgba(colors.CYAN, 0.2),
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
        bg: colors.BRAND,
        color: colors.BG,
        border: colors.BRAND,
        hoverBorder: colors.BLUE
      }
    }
  },

  deprecationWarning: {
    bg: rgba(colors.RED, 0.1),
    border: rgba(colors.RED, 0.2),
    icon: colors.RED,
    text: colors.TEXT
  },

  examples: {
    buttonBg: rgba(colors.CYAN, 0.1),
    buttonColor: colors.BRAND,
    buttonText: colors.TEXT,
    buttonIconColor: colors.TEXT,
    border: colors.BORDER2,
    urlBar: {
      border: colors.BORDER1,
      bg: colors.BG_ALT
    },
    table: {
      thead: {
        bg: colors.BG_ALT,
        color: colors.TEXT_MUTED
      }
    },
    checkbox: {
      color: colors.BG
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.BG,
          border: colors.BORDER1,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.TEXT_MUTED,
          separator: colors.BORDER1,
          hoverBg: colors.BG,
          hoverBorder: colors.BORDER2,
          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.BG,
            border: colors.BORDER1,
            hoverBg: colors.BG,
            hoverBorder: colors.BORDER2
          }
        },
        sandboxMode: {
          safeMode: {
            bg: rgba(colors.GREEN, 0.12),
            color: colors.GREEN
          },
          developerMode: {
            bg: rgba(colors.ORANGE, 0.12),
            color: colors.ORANGE
          }
        }
      }
    }
  }
};

export default cyberdreamDarkTheme;
