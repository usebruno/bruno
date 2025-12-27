// VS Code Light+ Theme for Bruno
// Based on the default Visual Studio Code Light+ theme

const colors = {
  // VS Code Light+ Core Colors
  EDITOR_BG: '#ffffff',
  SIDEBAR_BG: '#f3f3f3',
  ACTIVITY_BAR_BG: '#2c2c2c',
  PANEL_BG: '#ffffff',

  // Text colors
  TEXT: '#000000',
  TEXT_SECONDARY: '#1f1f1f',
  TEXT_MUTED: '#6e7681',
  TEXT_LINK: '#006ab1',

  // Brand - VS Code blue
  BRAND: '#007acc',
  BRAND_HOVER: '#0062a3',

  // Semantic colors
  GREEN: '#098658',
  YELLOW: '#795e26',
  ORANGE: '#a31515',
  RED: '#cd3131',
  PURPLE: '#af00db',
  BLUE: '#0000ff',
  CYAN: '#008080',

  WHITE: '#ffffff',
  BLACK: '#000000',

  // Grays (VS Code Light specific)
  GRAY_1: '#f3f3f3',
  GRAY_2: '#e8e8e8',
  GRAY_3: '#dddddd',
  GRAY_4: '#d4d4d4',
  GRAY_5: '#c6c6c6',
  GRAY_6: '#a0a0a0',
  GRAY_7: '#7a7a7a',
  GRAY_8: '#5a5a5a',

  // Borders
  BORDER: '#e5e5e5',
  BORDER_DARK: '#cecece',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#267f99',
    PROPERTY: '#0451a5',
    STRING: '#a31515',
    NUMBER: '#098658',
    ATOM: '#0000ff',
    VARIABLE: '#001080',
    KEYWORD: '#af00db',
    COMMENT: '#008000',
    OPERATOR: '#000000'
  }
};

const vscodeLightTheme = {
  mode: 'light',
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  bg: colors.EDITOR_BG,

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

  overlay: {
    overlay2: colors.GRAY_6,
    overlay1: '#c0c0c0',
    overlay0: '#d0d0d0'
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
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
    md: '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    lg: '0 2px 12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05)'
  },

  border: {
    radius: {
      sm: '4px',
      base: '6px',
      md: '8px',
      lg: '10px',
      xl: '12px'
    },
    border2: colors.GRAY_4,
    border1: colors.BORDER,
    border0: colors.GRAY_2
  },

  colors: {
    text: {
      white: colors.WHITE,
      green: colors.GREEN,
      danger: colors.RED,
      warning: '#bf8803',
      muted: colors.TEXT_MUTED,
      purple: colors.PURPLE,
      yellow: colors.YELLOW,
      subtext2: colors.TEXT_SECONDARY,
      subtext1: colors.TEXT_MUTED,
      subtext0: colors.GRAY_7
    },
    bg: {
      danger: colors.RED
    },
    accent: colors.BRAND
  },

  input: {
    bg: colors.WHITE,
    border: colors.BORDER_DARK,
    focusBorder: colors.BRAND,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.8
    }
  },

  sidebar: {
    color: colors.TEXT,
    muted: colors.TEXT_MUTED,
    bg: colors.SIDEBAR_BG,
    dragbar: {
      border: colors.BORDER,
      activeBorder: colors.GRAY_5
    },
    search: {
      border: `1px solid ${colors.BORDER_DARK}`,
      bg: colors.WHITE
    },
    collection: {
      item: {
        bg: colors.GRAY_2,
        hoverBg: colors.GRAY_3,
        focusBorder: colors.GRAY_5,
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
      color: colors.TEXT_SECONDARY
    }
  },

  dropdown: {
    color: colors.TEXT,
    iconColor: colors.TEXT_SECONDARY,
    bg: colors.WHITE,
    hoverBg: colors.GRAY_2,
    shadow: 'rgba(0, 0, 0, 0.16) 0px 6px 12px -2px, rgba(0, 0, 0, 0.1) 0px 3px 7px -3px',
    separator: colors.BORDER,
    selectedColor: colors.BRAND,
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
      post: colors.YELLOW,
      put: '#d18616',
      delete: colors.RED,
      patch: '#d18616',
      options: colors.GRAY_7,
      head: colors.BLUE
    },
    grpc: colors.CYAN,
    ws: '#795e26',
    gql: colors.PURPLE
  },

  requestTabPanel: {
    url: {
      bg: colors.WHITE,
      icon: colors.TEXT_SECONDARY,
      iconDanger: colors.RED,
      border: `solid 1px ${colors.BORDER}`
    },
    dragbar: {
      border: colors.BORDER,
      activeBorder: colors.BRAND
    },
    responseStatus: colors.TEXT_SECONDARY,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.BRAND,
    responseOverlayBg: 'rgba(255, 255, 255, 0.6)',
    card: {
      bg: colors.WHITE,
      border: colors.BORDER,
      hr: colors.BORDER
    },
    graphqlDocsExplorer: {
      bg: colors.WHITE,
      color: colors.TEXT
    }
  },

  notifications: {
    bg: colors.WHITE,
    list: {
      bg: colors.GRAY_2,
      borderRight: 'transparent',
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
      color: colors.TEXT_SECONDARY,
      bg: colors.GRAY_1
    },
    body: {
      color: colors.TEXT,
      bg: colors.WHITE
    },
    input: {
      bg: colors.WHITE,
      border: colors.BORDER_DARK,
      focusBorder: colors.BRAND
    },
    backdrop: {
      opacity: 0.4
    }
  },

  button: {
    secondary: {
      color: colors.TEXT,
      bg: colors.GRAY_2,
      border: colors.GRAY_4,
      hoverBorder: colors.GRAY_5
    },
    close: {
      color: colors.TEXT,
      bg: colors.WHITE,
      border: colors.WHITE,
      hoverBorder: ''
    },
    disabled: {
      color: colors.GRAY_6,
      bg: colors.GRAY_2,
      border: colors.BORDER
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
        bg: colors.GRAY_3,
        text: colors.TEXT,
        border: colors.GRAY_4
      },
      success: {
        bg: colors.GREEN,
        text: colors.WHITE,
        border: colors.GREEN
      },
      warning: {
        bg: '#bf8803',
        text: colors.WHITE,
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
        bg: colors.WHITE,
        color: colors.TEXT
      },
      inactive: {
        bg: colors.GRAY_2,
        color: colors.TEXT_MUTED
      }
    }
  },

  requestTabs: {
    color: colors.TEXT,
    bg: colors.SIDEBAR_BG,
    bottomBorder: colors.BORDER,
    icon: {
      color: colors.GRAY_6,
      hoverColor: colors.TEXT_SECONDARY,
      hoverBg: colors.GRAY_3
    },
    example: {
      iconColor: colors.GRAY_7
    },
    shortTab: {
      color: colors.TEXT_SECONDARY,
      bg: colors.WHITE,
      hoverColor: colors.TEXT_SECONDARY,
      hoverBg: colors.GRAY_2
    }
  },

  codemirror: {
    bg: colors.WHITE,
    border: colors.WHITE,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.75
    },
    gutter: {
      bg: colors.WHITE
    },
    variable: {
      valid: colors.GREEN,
      invalid: colors.RED,
      prompt: colors.BRAND,
      info: {
        color: colors.TEXT,
        bg: colors.WHITE,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        editorBg: colors.GRAY_1,
        iconColor: colors.GRAY_6,
        editorBorder: colors.BORDER,
        editorFocusBorder: colors.GRAY_6,
        editableDisplayHoverBg: 'rgba(0, 0, 0, 0.02)',
        border: colors.BORDER
      }
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
      operator: colors.CODEMIRROR_TOKENS.OPERATOR
    },
    searchLineHighlightCurrent: 'rgba(255, 255, 0, 0.2)',
    searchMatch: '#a8ac94',
    searchMatchActive: '#f8e8a6'
  },

  table: {
    border: colors.BORDER,
    thead: {
      color: colors.TEXT_SECONDARY
    },
    striped: colors.GRAY_1,
    input: {
      color: colors.BLACK
    }
  },

  plainGrid: {
    hoverBg: colors.GRAY_1
  },

  scrollbar: {
    color: colors.GRAY_5
  },

  dragAndDrop: {
    border: colors.BRAND,
    borderStyle: '2px solid',
    hoverBg: 'rgba(0, 122, 204, 0.08)',
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: colors.WHITE,
    border: colors.BORDER,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },

  statusBar: {
    border: colors.BORDER,
    color: colors.TEXT_MUTED
  },

  console: {
    bg: colors.GRAY_1,
    headerBg: colors.GRAY_1,
    contentBg: colors.WHITE,
    border: colors.BORDER,
    titleColor: colors.TEXT,
    countColor: colors.TEXT_MUTED,
    buttonColor: colors.TEXT_SECONDARY,
    buttonHoverBg: colors.GRAY_2,
    buttonHoverColor: colors.TEXT,
    messageColor: colors.TEXT,
    timestampColor: colors.TEXT_MUTED,
    emptyColor: colors.TEXT_MUTED,
    logHoverBg: 'rgba(0, 0, 0, 0.03)',
    resizeHandleHover: colors.BRAND,
    resizeHandleActive: colors.BRAND,
    dropdownBg: colors.WHITE,
    dropdownHeaderBg: colors.GRAY_1,
    optionHoverBg: colors.GRAY_1,
    optionLabelColor: colors.TEXT,
    optionCountColor: colors.TEXT_MUTED,
    checkboxColor: colors.BRAND,
    scrollbarTrack: colors.GRAY_1,
    scrollbarThumb: colors.GRAY_4,
    scrollbarThumbHover: colors.GRAY_5
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.GRAY_1
      },
      button: {
        active: {
          bg: colors.WHITE,
          color: colors.BLACK
        },
        inactive: {
          bg: 'transparent',
          color: colors.TEXT_SECONDARY
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
          hoverColor: '#e03e3e'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(0, 0, 0, 0.05)',
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
        bg: colors.GRAY_2,
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
          hoverColor: '#e03e3e'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(0, 0, 0, 0.05)',
        selected: {
          bg: 'rgba(0, 122, 204, 0.15)',
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
        bg: colors.GRAY_2,
        color: colors.TEXT,
        border: colors.GRAY_4,
        hoverBorder: colors.GRAY_5
      }
    }
  },

  deprecationWarning: {
    bg: 'rgba(205, 49, 49, 0.1)',
    border: 'rgba(205, 49, 49, 0.15)',
    icon: colors.RED,
    text: colors.TEXT
  },

  preferences: {
    sidebar: {
      border: colors.BORDER
    }
  },

  examples: {
    buttonBg: 'rgba(0, 122, 204, 0.1)',
    buttonColor: colors.BRAND,
    buttonText: colors.WHITE,
    buttonIconColor: colors.BLACK,
    border: colors.BORDER,
    urlBar: {
      border: colors.BORDER,
      bg: colors.GRAY_1
    },
    table: {
      thead: {
        bg: colors.GRAY_1,
        color: colors.TEXT
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
          bg: colors.WHITE,
          border: colors.BORDER,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.GRAY_6,
          separator: colors.BORDER,
          hoverBg: colors.WHITE,
          hoverBorder: colors.GRAY_5,
          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.WHITE,
            border: colors.BORDER,
            hoverBg: colors.WHITE,
            hoverBorder: colors.GRAY_5
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(9, 134, 88, 0.12)',
            color: colors.GREEN
          },
          developerMode: {
            bg: 'rgba(121, 94, 38, 0.12)',
            color: colors.YELLOW
          }
        }
      }
    }
  }
};

export default vscodeLightTheme;
