/**
 * Dark Pastel Theme - "Nebula"
 * A rich, dreamy dark theme with luminous pastel accents.
 * Inspired by northern lights, night gardens, and starlit dreams.
 * Deep enough to be easy on the eyes, vibrant enough to inspire.
 */

const colors = {
  // Primary palette - glowing pastels against deep purple-black
  BRAND: '#f0a6ca', // Soft rose - warm and inviting
  TEXT: '#e8e0f0', // Lavender white - soft, readable
  TEXT_MUTED: '#a89fc4', // Dusty lavender
  TEXT_LINK: '#a8c5f0', // Soft periwinkle blue
  BG: '#1a1625', // Deep plum-black

  // Core colors
  WHITE: '#ffffff',
  BLACK: '#0d0a12',
  SLATE: '#e8e0f0',

  // Luminous pastels - glowing against darkness
  GREEN: '#7dd3a8', // Mint glow
  YELLOW: '#f0d77d', // Soft gold
  RED: '#f0887d', // Coral blush
  PURPLE: '#c4a6f0', // Lavender dream
  BLUE: '#7db8f0', // Sky shimmer
  PINK: '#f0a6ca', // Rose petal
  ORANGE: '#f0b87d', // Peach sunset
  TEAL: '#7dd3c9', // Aqua glow
  MAGENTA: '#e09fd9', // Orchid

  // Deep grayscale with purple undertones
  GRAY_1: '#1f1a2e', // Deepest plum
  GRAY_2: '#2a2440', // Dark violet
  GRAY_3: '#352e4d', // Muted purple
  GRAY_4: '#453d5c', // Dusty violet
  GRAY_5: '#5c5478', // Medium violet
  GRAY_6: '#7a7294', // Soft violet
  GRAY_7: '#9890ad', // Light violet
  GRAY_8: '#b8b0cc', // Pale violet
  GRAY_9: '#d8d0e8', // Whisper violet
  GRAY_10: '#f0e8ff', // Lightest violet

  // CodeMirror syntax - a constellation of colors
  CODEMIRROR_TOKENS: {
    DEFINITION: '#7dd3a8', // Mint - definitions stand out fresh
    PROPERTY: '#7db8f0', // Sky blue - clear and calm
    STRING: '#f0a6ca', // Rose - strings feel warm
    NUMBER: '#7dd3c9', // Teal - numbers are precise
    ATOM: '#c4a6f0', // Lavender - atoms are special
    VARIABLE: '#a8c5f0', // Periwinkle - variables flow
    KEYWORD: '#e09fd9', // Orchid - keywords command attention
    COMMENT: '#7a7294', // Muted violet - comments recede
    OPERATOR: '#b8b0cc' // Pale violet - operators connect
  }
};

const darkPastelTheme = {
  mode: 'dark',
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  bg: colors.BG,

  accents: {
    primary: colors.BRAND
  },

  background: {
    base: colors.BG,
    mantle: colors.GRAY_1,
    crust: colors.GRAY_2,
    surface0: colors.GRAY_3,
    surface1: colors.GRAY_4,
    surface2: colors.GRAY_5
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
    sm: '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(196, 166, 240, 0.08)',
    md: '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(196, 166, 240, 0.10)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(196, 166, 240, 0.12)'
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
    border1: colors.GRAY_4,
    border0: colors.GRAY_3
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
      danger: '#c4626a'
    },
    accent: colors.BRAND
  },

  input: {
    bg: 'transparent',
    border: colors.GRAY_4,
    focusBorder: colors.BRAND,
    placeholder: {
      color: colors.TEXT_MUTED,
      opacity: 0.6
    }
  },

  sidebar: {
    color: colors.TEXT,
    muted: colors.TEXT_MUTED,
    bg: '#1d1928',
    dragbar: {
      border: colors.GRAY_3,
      activeBorder: colors.BRAND
    },
    collection: {
      item: {
        bg: colors.GRAY_2,
        hoverBg: colors.GRAY_3,
        focusBorder: colors.BRAND,
        indentBorder: `solid 1px ${colors.GRAY_4}`,
        active: {
          indentBorder: `solid 1px ${colors.BRAND}50`
        },
        example: {
          iconColor: colors.GRAY_6
        }
      }
    },
    dropdownIcon: {
      color: colors.TEXT_MUTED
    }
  },

  dropdown: {
    color: colors.TEXT,
    iconColor: colors.TEXT_MUTED,
    bg: colors.GRAY_2,
    hoverBg: colors.GRAY_3,
    shadow: 'none',
    border: colors.GRAY_4,
    separator: colors.GRAY_4,
    selectedColor: colors.BRAND,
    mutedText: colors.GRAY_6
  },

  workspace: {
    accent: colors.BRAND,
    border: colors.GRAY_4,
    button: {
      bg: colors.GRAY_3
    }
  },

  request: {
    methods: {
      get: colors.GREEN, // Mint - success, retrieval
      post: colors.PURPLE, // Lavender - creation
      put: colors.ORANGE, // Peach - update
      delete: colors.RED, // Coral - deletion
      patch: colors.YELLOW, // Gold - modification
      options: colors.TEAL, // Aqua - metadata
      head: colors.BLUE // Sky - lightweight
    },
    grpc: '#9e8fd9', // Soft indigo
    ws: colors.MAGENTA, // Orchid
    gql: colors.PINK // Rose
  },

  requestTabPanel: {
    url: {
      bg: colors.BG,
      icon: colors.TEXT_MUTED,
      iconDanger: colors.RED,
      border: `solid 1px ${colors.GRAY_4}`
    },
    dragbar: {
      border: colors.GRAY_4,
      activeBorder: colors.BRAND
    },
    responseStatus: colors.TEXT_MUTED,
    responseOk: colors.GREEN,
    responseError: colors.RED,
    responsePending: colors.BLUE,
    responseOverlayBg: 'rgba(26, 22, 37, 0.75)',
    card: {
      bg: colors.GRAY_1,
      border: 'transparent',
      hr: colors.GRAY_4
    },
    graphqlDocsExplorer: {
      bg: colors.BG,
      color: colors.TEXT
    }
  },

  notifications: {
    bg: colors.GRAY_3,
    list: {
      bg: colors.GRAY_2,
      borderRight: colors.GRAY_4,
      borderBottom: colors.GRAY_4,
      hoverBg: colors.GRAY_3,
      active: {
        border: colors.BRAND,
        bg: colors.GRAY_4,
        hoverBg: colors.GRAY_4
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
      bg: colors.GRAY_2
    },
    input: {
      bg: 'transparent',
      border: colors.GRAY_4,
      focusBorder: colors.BRAND
    },
    backdrop: {
      opacity: 0.5
    }
  },

  button: {
    secondary: {
      color: colors.TEXT,
      bg: colors.GRAY_4,
      border: colors.GRAY_4,
      hoverBorder: colors.GRAY_6
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
      bg: '#c4626a',
      border: '#c4626a'
    }
  },

  button2: {
    color: {
      primary: {
        bg: colors.BRAND,
        text: colors.BLACK,
        border: colors.BRAND
      },
      secondary: {
        bg: colors.GRAY_4,
        text: colors.TEXT,
        border: colors.GRAY_5
      },
      success: {
        bg: colors.GREEN,
        text: colors.BLACK,
        border: colors.GREEN
      },
      warning: {
        bg: colors.ORANGE,
        text: colors.BLACK,
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
    bg: colors.GRAY_2,
    bottomBorder: colors.GRAY_4,
    icon: {
      color: colors.GRAY_6,
      hoverColor: colors.TEXT,
      hoverBg: colors.GRAY_3
    },
    example: {
      iconColor: colors.GRAY_6
    },
    shortTab: {
      color: colors.TEXT_MUTED,
      bg: 'transparent',
      hoverColor: colors.TEXT,
      hoverBg: colors.GRAY_3
    }
  },

  codemirror: {
    bg: colors.BG,
    border: colors.BG,
    placeholder: {
      color: colors.GRAY_6,
      opacity: 0.6
    },
    gutter: {
      bg: colors.BG
    },
    variable: {
      valid: colors.GREEN,
      invalid: colors.RED,
      prompt: colors.BLUE,
      info: {
        color: colors.TEXT,
        bg: colors.GRAY_2,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        editorBg: colors.GRAY_3,
        iconColor: colors.GRAY_6,
        editorBorder: colors.GRAY_4,
        editorFocusBorder: colors.BRAND,
        editableDisplayHoverBg: colors.GRAY_3,
        border: colors.GRAY_4
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
    searchLineHighlightCurrent: `${colors.BRAND}20`,
    searchMatch: colors.YELLOW,
    searchMatchActive: colors.ORANGE
  },

  table: {
    border: colors.GRAY_4,
    thead: {
      color: colors.TEXT_MUTED
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
    color: colors.GRAY_5
  },

  dragAndDrop: {
    border: colors.BRAND,
    borderStyle: '2px dashed',
    hoverBg: `${colors.BRAND}10`,
    transition: 'all 0.15s ease'
  },

  infoTip: {
    bg: colors.GRAY_2,
    border: colors.GRAY_4,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
  },

  statusBar: {
    border: colors.GRAY_3,
    color: colors.TEXT_MUTED
  },

  console: {
    bg: colors.BG,
    headerBg: colors.GRAY_2,
    contentBg: colors.BG,
    border: colors.GRAY_4,
    titleColor: colors.TEXT,
    countColor: colors.TEXT_MUTED,
    buttonColor: colors.TEXT,
    buttonHoverBg: colors.GRAY_3,
    buttonHoverColor: colors.WHITE,
    messageColor: colors.TEXT,
    timestampColor: colors.TEXT_MUTED,
    emptyColor: colors.TEXT_MUTED,
    logHoverBg: colors.GRAY_2,
    resizeHandleHover: colors.BRAND,
    resizeHandleActive: colors.BRAND,
    dropdownBg: colors.GRAY_2,
    dropdownHeaderBg: colors.GRAY_3,
    optionHoverBg: colors.GRAY_3,
    optionLabelColor: colors.TEXT,
    optionCountColor: colors.TEXT_MUTED,
    checkboxColor: colors.BRAND,
    scrollbarTrack: colors.GRAY_2,
    scrollbarThumb: colors.GRAY_5,
    scrollbarThumbHover: colors.GRAY_6
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.GRAY_1
      },
      button: {
        active: {
          bg: colors.GRAY_3,
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
          hoverColor: '#f5a09a'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: colors.GRAY_3,
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
        text: colors.RED,
        link: {
          color: colors.RED,
          hoverColor: '#f5a09a'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: colors.GRAY_3,
        selected: {
          bg: `${colors.BRAND}25`,
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
        hoverBorder: colors.GRAY_6
      }
    }
  },

  deprecationWarning: {
    bg: `${colors.ORANGE}18`,
    border: `${colors.ORANGE}35`,
    icon: colors.ORANGE,
    text: colors.TEXT
  },

  examples: {
    buttonBg: `${colors.BRAND}20`,
    buttonColor: colors.BRAND,
    buttonText: colors.WHITE,
    buttonIconColor: colors.WHITE,
    border: colors.GRAY_4,
    urlBar: {
      border: colors.GRAY_4,
      bg: colors.GRAY_2
    },
    table: {
      thead: {
        bg: colors.GRAY_2,
        color: colors.TEXT_MUTED
      }
    },
    checkbox: {
      color: colors.BLACK
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.BG,
          border: colors.GRAY_4,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.TEXT_MUTED,
          separator: colors.GRAY_4,
          hoverBg: colors.BG,
          hoverBorder: colors.GRAY_5,
          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.BG,
            border: colors.GRAY_4,
            hoverBg: colors.BG,
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

export default darkPastelTheme;
