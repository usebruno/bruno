/**
 * Light Pastel Theme - "Serenity Bloom"
 * Soft, deep pastels with warm undertones for a calm, refined look.
 * Gentle contrast that stays readable and inviting.
 */

const colors = {
  // Primary palette - soft yet deep
  BRAND: '#d16c6c', // Dusty coral - warm but calm
  TEXT: '#2b2f3a', // Deep charcoal with a violet hint
  TEXT_MUTED: '#6e7380', // Muted slate
  TEXT_LINK: '#3f7cac', // Steel blue
  BACKGROUND: '#fdfaf7', // Warm ivory

  // Core colors
  WHITE: '#ffffff',
  BLACK: '#17181f',
  SLATE: '#1f2530',

  // Soft pastels with depth
  GREEN: '#3c9d7c', // Soft emerald
  YELLOW: '#d2a13f', // Golden ochre
  RED: '#c75b63', // Rosewood red
  PURPLE: '#7a70b5', // Dusty periwinkle
  BLUE: '#3a7cc4', // Muted azure
  PINK: '#c57a92', // Dusty rose
  ORANGE: '#dd8a52', // Muted amber
  TEAL: '#3a8f98', // Steel teal

  // Warm grayscale with soft contrast
  GRAY_1: '#f7f4ef', // Near white with warmth
  GRAY_2: '#f0ebe4', // Light greige
  GRAY_3: '#e2dbd1', // Soft stone
  GRAY_4: '#d3cabc', // Gentle taupe
  GRAY_5: '#b8b0a3', // Mid greige
  GRAY_6: '#8d8577', // Warm smoke
  GRAY_7: '#6f675b', // Earthy brown-gray
  GRAY_8: '#574f45', // Deep stone
  GRAY_9: '#3f382f', // Charcoal brown
  GRAY_10: '#29231d', // Deepest warm charcoal

  // CodeMirror syntax - soft contrast with clarity
  CODEMIRROR_TOKENS: {
    DEFINITION: '#3c9d7c', // Soft emerald
    PROPERTY: '#3a7cc4', // Muted azure
    STRING: '#c75b63', // Rosewood
    NUMBER: '#2d8fa1', // Dusty teal
    ATOM: '#7a70b5', // Dusty periwinkle
    VARIABLE: '#3f7cac', // Steel blue
    KEYWORD: '#c57a92', // Dusty rose
    COMMENT: '#9a9488', // Warm muted gray
    OPERATOR: '#7c7a73' // Soft graphite
  }
};

const lightPastelTheme = {
  mode: 'light',
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  bg: colors.BACKGROUND,

  accents: {
    primary: colors.BRAND
  },

  background: {
    base: colors.BACKGROUND,
    mantle: colors.GRAY_1,
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
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
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
    border1: colors.GRAY_3,
    border0: colors.GRAY_2
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
      subtext2: colors.GRAY_7,
      subtext1: colors.TEXT_MUTED,
      subtext0: colors.GRAY_6
    },
    bg: {
      danger: colors.RED
    },
    accent: colors.BRAND
  },

  input: {
    bg: colors.WHITE,
    border: colors.GRAY_4,
    focusBorder: colors.BRAND,
    placeholder: {
      color: colors.GRAY_6,
      opacity: 0.8
    }
  },

  sidebar: {
    color: colors.TEXT,
    muted: colors.TEXT_MUTED,
    bg: colors.GRAY_1,
    dragbar: {
      border: colors.GRAY_4,
      activeBorder: colors.BRAND
    },
    collection: {
      item: {
        bg: colors.GRAY_2,
        hoverBg: colors.GRAY_3,
        focusBorder: colors.BRAND,
        indentBorder: `solid 1px ${colors.GRAY_4}`,
        active: {
          indentBorder: `solid 1px ${colors.BRAND}40`
        },
        example: {
          iconColor: colors.GRAY_7
        }
      }
    },
    dropdownIcon: {
      color: colors.GRAY_7
    }
  },

  dropdown: {
    color: colors.TEXT,
    iconColor: colors.GRAY_7,
    bg: colors.GRAY_1,
    hoverBg: colors.GRAY_2,
    shadow: 'rgba(0, 0, 0, 0.15) 0px 6px 16px -2px, rgba(0, 0, 0, 0.1) 0px 3px 8px -3px',
    border: 'none',
    separator: colors.GRAY_3,
    selectedColor: colors.BRAND,
    mutedText: colors.GRAY_6
  },

  workspace: {
    accent: colors.BRAND,
    border: colors.GRAY_3,
    button: {
      bg: colors.GRAY_3
    }
  },

  request: {
    methods: {
      get: '#3c9d7c', // Soft emerald - success
      post: '#7a70b5', // Dusty periwinkle - creation
      put: '#dd8a52', // Muted amber - update
      delete: '#c75b63', // Rosewood red - deletion
      patch: '#3a8f98', // Steel teal - modification
      options: '#2d8fa1', // Dusty teal - metadata
      head: '#3a7cc4' // Muted azure - lightweight
    },
    grpc: '#7a70b5', // Dusty periwinkle
    ws: '#c57a92', // Dusty rose
    gql: '#7a70b5' // Dusty periwinkle
  },

  requestTabPanel: {
    url: {
      bg: 'transparent',
      icon: colors.GRAY_7,
      iconDanger: colors.RED,
      border: `solid 1px ${colors.GRAY_4}`
    },
    dragbar: {
      border: colors.GRAY_3,
      activeBorder: colors.BRAND
    },
    responseStatus: colors.TEXT_MUTED,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.BLUE,
    responseOverlayBg: 'rgba(254, 251, 255, 0.7)',
    card: {
      bg: colors.WHITE,
      border: colors.GRAY_3,
      hr: colors.GRAY_3
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
      borderBottom: colors.GRAY_4,
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
      bg: colors.GRAY_1
    },
    body: {
      color: colors.TEXT,
      bg: colors.WHITE
    },
    input: {
      bg: colors.WHITE,
      border: colors.GRAY_4,
      focusBorder: colors.BRAND
    },
    backdrop: {
      opacity: 0.35
    }
  },

  button: {
    secondary: {
      color: colors.TEXT,
      bg: colors.GRAY_2,
      border: colors.GRAY_4,
      hoverBorder: colors.GRAY_6
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
      border: colors.GRAY_3
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
        bg: colors.ORANGE,
        text: colors.WHITE,
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
    bg: colors.GRAY_1,
    bottomBorder: colors.GRAY_3,
    icon: {
      color: colors.GRAY_6,
      hoverColor: colors.TEXT,
      hoverBg: colors.GRAY_3
    },
    example: {
      iconColor: colors.GRAY_7
    },
    shortTab: {
      color: colors.TEXT_MUTED,
      bg: colors.WHITE,
      hoverColor: colors.TEXT,
      hoverBg: colors.GRAY_2
    }
  },

  codemirror: {
    bg: 'transparent',
    border: colors.WHITE,
    placeholder: {
      color: colors.GRAY_6,
      opacity: 0.75
    },
    gutter: {
      bg: 'transparent'
    },
    variable: {
      valid: colors.GREEN,
      invalid: colors.RED,
      prompt: colors.BLUE,
      info: {
        color: colors.TEXT,
        bg: colors.WHITE,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        editorBg: colors.GRAY_1,
        iconColor: colors.GRAY_6,
        editorBorder: colors.GRAY_3,
        editorFocusBorder: colors.BRAND,
        editableDisplayHoverBg: colors.GRAY_1,
        border: colors.GRAY_3
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
    searchLineHighlightCurrent: `${colors.BRAND}12`,
    searchMatch: '#e5c27a',
    searchMatchActive: '#d7b35f'
  },

  table: {
    border: colors.GRAY_3,
    thead: {
      color: colors.TEXT_MUTED
    },
    striped: colors.GRAY_1,
    input: {
      color: colors.TEXT
    }
  },

  plainGrid: {
    hoverBg: colors.GRAY_2
  },

  scrollbar: {
    color: colors.GRAY_5
  },

  dragAndDrop: {
    border: colors.BRAND,
    borderStyle: '2px dashed',
    hoverBg: `${colors.BRAND}08`,
    transition: 'all 0.15s ease'
  },

  infoTip: {
    bg: colors.WHITE,
    border: colors.GRAY_4,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
  },

  statusBar: {
    border: colors.GRAY_3,
    color: colors.TEXT_MUTED
  },

  console: {
    bg: colors.GRAY_1,
    headerBg: colors.GRAY_1,
    contentBg: colors.WHITE,
    border: colors.GRAY_3,
    titleColor: colors.TEXT,
    countColor: colors.TEXT_MUTED,
    buttonColor: colors.TEXT,
    buttonHoverBg: colors.GRAY_2,
    buttonHoverColor: colors.TEXT,
    messageColor: colors.TEXT,
    timestampColor: colors.TEXT_MUTED,
    emptyColor: colors.TEXT_MUTED,
    logHoverBg: colors.GRAY_1,
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
        text: '#c75b63',
        link: {
          color: '#c75b63',
          hoverColor: '#d98b8f'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: colors.GRAY_2,
        text: colors.TEXT,
        icon: colors.TEXT_MUTED,
        checkbox: {
          color: colors.TEXT
        },
        invalid: {
          opacity: 0.6,
          text: '#c75b63'
        }
      },
      empty: {
        text: colors.TEXT_MUTED
      },
      button: {
        bg: colors.GRAY_2,
        color: colors.TEXT,
        border: colors.GRAY_4,
        hoverBorder: colors.GRAY_6
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
        text: '#c75b63',
        link: {
          color: '#c75b63',
          hoverColor: '#d98b8f'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: colors.GRAY_2,
        selected: {
          bg: `${colors.BRAND}18`,
          border: colors.BRAND
        },
        text: colors.TEXT,
        secondaryText: colors.TEXT_MUTED,
        icon: colors.TEXT_MUTED,
        invalid: {
          opacity: 0.6,
          text: '#c75b63'
        }
      },
      empty: {
        text: colors.TEXT_MUTED
      },
      button: {
        bg: colors.GRAY_2,
        color: colors.TEXT,
        border: colors.GRAY_4,
        hoverBorder: colors.GRAY_6
      }
    }
  },

  deprecationWarning: {
    bg: '#fef3c7',
    border: '#fcd34d',
    icon: '#d97706',
    text: colors.TEXT
  },

  examples: {
    buttonBg: `${colors.BRAND}15`,
    buttonColor: colors.BRAND,
    buttonText: colors.WHITE,
    buttonIconColor: colors.TEXT,
    border: colors.GRAY_3,
    urlBar: {
      border: colors.GRAY_3,
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
          border: colors.GRAY_4,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.GRAY_6,
          separator: colors.GRAY_4,
          hoverBg: colors.WHITE,
          hoverBorder: colors.GRAY_5,
          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.WHITE,
            border: colors.GRAY_4,
            hoverBg: colors.WHITE,
            hoverBorder: colors.GRAY_5
          }
        },
        sandboxMode: {
          safeMode: {
            bg: `${colors.GREEN}18`,
            color: colors.GREEN
          },
          developerMode: {
            bg: `${colors.ORANGE}18`,
            color: colors.ORANGE
          }
        }
      }
    }
  }
};

export default lightPastelTheme;
