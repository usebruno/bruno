const palette = {
  accents: {
    PRIMARY: '#bd7a28',
    RED: 'hsl(8 60% 52%)', // warm coral - NEW
    ROSE: 'hsl(352 45% 50%)', // soft red (approved)
    BROWN: 'hsl(28 55% 38%)', // warm brown (liked)
    ORANGE: 'hsl(35 85% 42%)', // vibrant orange
    YELLOW: 'hsl(45 75% 42%)', // golden yellow
    LIME: 'hsl(85 45% 40%)', // yellow-green - NEW
    GREEN: 'hsl(145 50% 36%)', // forest green
    TEAL: 'hsl(178 50% 36%)', // true teal
    CYAN: 'hsl(195 55% 42%)', // cyan-blue - NEW
    BLUE: 'hsl(214 55% 45%)', // true blue (liked)
    INDIGO: 'hsl(235 45% 45%)', // deep indigo
    VIOLET: 'hsl(258 42% 50%)', // soft violet - NEW
    PURPLE: 'hsl(280 45% 48%)', // rich purple
    PINK: 'hsl(328 50% 48%)' // magenta-pink - NEW
  },
  system: {
    CONTROL_ACCENT: '#b96f1d' // for accent-color
  },
  background: {
    BASE: '#ffffff',
    MANTLE: '#f8f8f8',
    CRUST: '#f6f6f6',
    SURFACE0: '#f1f1f1',
    SURFACE1: '#eaeaea',
    SURFACE2: '#e5e5e5'
  },
  text: {
    BASE: '#343434',
    SUBTEXT2: '#666666',
    SUBTEXT1: '#838383',
    SUBTEXT0: '#9B9B9B'
  },
  overlay: {
    OVERLAY2: '#8b8b8b',
    OVERLAY1: '#B0B0B0',
    OVERLAY0: '#C0C0C0'
  },
  border: {
    BORDER2: '#cccccc',
    BORDER1: '#e5e5e5',
    BORDER0: '#efefef'
  },
  utility: {
    WHITE: '#ffffff',
    BLACK: '#000000'
  }
};

const colors = {
  CODEMIRROR_TOKENS: {
    DEFINITION: palette.accents.INDIGO,
    PROPERTY: palette.accents.BLUE,
    STRING: palette.accents.BROWN,
    NUMBER: palette.accents.GREEN,
    ATOM: palette.accents.PURPLE,
    VARIABLE: palette.accents.PINK,
    KEYWORD: palette.accents.ROSE,
    COMMENT: palette.text.SUBTEXT0,
    OPERATOR: palette.accents.BLUE
  }
};

const lightTheme = {
  mode: 'light',
  brand: palette.accents.PRIMARY,
  text: palette.text.BASE,
  textLink: palette.accents.BLUE,
  bg: palette.background.BASE,

  accents: {
    primary: palette.accents.PRIMARY
  },

  background: {
    base: palette.background.BASE,
    mantle: palette.background.MANTLE,
    crust: palette.background.CRUST,
    surface2: palette.background.SURFACE2,
    surface1: palette.background.SURFACE1,
    surface0: palette.background.SURFACE0
  },

  overlay: {
    overlay2: palette.overlay.OVERLAY2,
    overlay1: palette.overlay.OVERLAY1,
    overlay0: palette.overlay.OVERLAY0
  },

  font: {
    size: {
      xs: '0.6875rem', // 11px
      sm: '0.75rem', // 12px
      base: '0.8125rem', // 13px
      md: '0.875rem', // 14px
      lg: '1rem', // 16px
      xl: '1.125rem' // 18px
    }
  },

  shadow: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.06)',
    lg: '0 2px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
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
      white: palette.utility.WHITE,
      green: palette.accents.GREEN,
      danger: palette.accents.RED,
      warning: palette.accents.ORANGE,
      muted: palette.text.SUBTEXT1,
      purple: palette.accents.PURPLE,
      yellow: palette.accents.YELLOW,
      subtext2: palette.text.SUBTEXT2,
      subtext1: palette.text.SUBTEXT1,
      subtext0: palette.text.SUBTEXT0
    },
    bg: {
      danger: palette.accents.RED
    },
    accent: palette.system.CONTROL_ACCENT
  },

  input: {
    bg: palette.utility.WHITE,
    border: palette.border.BORDER2,
    focusBorder: palette.overlay.OVERLAY2,
    placeholder: {
      color: palette.overlay.OVERLAY1,
      opacity: 0.8
    }
  },

  sidebar: {
    color: palette.text.BASE,
    muted: palette.text.SUBTEXT1,
    bg: palette.background.MANTLE,
    dragbar: {
      border: palette.background.SURFACE2,
      activeBorder: palette.background.SURFACE2
    },

    search: {
      border: `1px solid ${palette.border.BORDER2}`,
      bg: palette.utility.WHITE
    },

    collection: {
      item: {
        bg: palette.background.SURFACE0,
        hoverBg: palette.background.SURFACE0,
        focusBorder: palette.border.BORDER2,
        indentBorder: `solid 1px ${palette.border.BORDER1}`,
        active: {
          indentBorder: `solid 1px ${palette.border.BORDER1}`
        },
        example: {
          iconColor: palette.text.SUBTEXT2
        }
      }
    },

    dropdownIcon: {
      color: palette.text.SUBTEXT2
    }
  },

  dropdown: {
    color: palette.text.BASE,
    iconColor: palette.text.SUBTEXT2,
    bg: palette.utility.WHITE,
    hoverBg: palette.background.CRUST,
    shadow: 'rgb(50 50 93 / 25%) 0px 6px 12px -2px, rgb(0 0 0 / 30%) 0px 3px 7px -3px',
    separator: palette.border.BORDER1,
    selectedColor: palette.accents.PRIMARY,
    mutedText: palette.text.SUBTEXT0
  },

  workspace: {
    accent: palette.system.CONTROL_ACCENT,
    border: palette.border.BORDER1,
    button: {
      bg: palette.background.MANTLE
    }
  },

  request: {
    methods: {
      get: palette.accents.GREEN,
      post: palette.accents.PURPLE,
      put: palette.accents.ORANGE,
      delete: palette.accents.RED,
      patch: palette.accents.PURPLE,
      options: palette.accents.TEAL,
      head: palette.accents.CYAN
    },

    grpc: palette.accents.INDIGO,
    ws: palette.accents.ORANGE,
    gql: palette.accents.PINK
  },

  requestTabPanel: {
    url: {
      bg: palette.utility.WHITE,
      icon: palette.text.SUBTEXT2,
      iconDanger: palette.accents.RED,
      border: `solid 1px ${palette.border.BORDER1}`
    },
    dragbar: {
      border: palette.background.SURFACE2,
      activeBorder: palette.border.BORDER2
    },
    responseStatus: palette.text.SUBTEXT1,
    responseOk: palette.accents.GREEN,
    responseError: palette.accents.RED,
    responsePending: palette.accents.BLUE,
    responseOverlayBg: 'rgba(255, 255, 255, 0.6)',
    card: {
      bg: palette.background.BASE,
      border: palette.border.BORDER1,
      hr: palette.border.BORDER1
    },
    graphqlDocsExplorer: {
      bg: palette.background.BASE,
      color: palette.text.BASE
    }
  },

  notifications: {
    bg: palette.background.BASE,
    list: {
      bg: palette.background.SURFACE0,
      borderRight: 'transparent',
      borderBottom: palette.border.BORDER2,
      hoverBg: palette.background.SURFACE1,
      active: {
        border: palette.accents.BLUE,
        bg: palette.background.SURFACE1,
        hoverBg: palette.background.SURFACE2
      }
    }
  },

  modal: {
    title: {
      color: palette.text.BASE,
      bg: palette.background.SURFACE0
    },
    body: {
      color: palette.text.BASE,
      bg: palette.background.BASE
    },
    input: {
      bg: palette.background.BASE,
      border: palette.border.BORDER2,
      focusBorder: palette.overlay.OVERLAY2
    },
    backdrop: {
      opacity: 0.4
    }
  },

  button: {
    secondary: {
      color: '#212529',
      bg: '#e2e6ea',
      border: '#dae0e5',
      hoverBorder: '#696969'
    },
    close: {
      color: '#212529',
      bg: 'white',
      border: 'white',
      hoverBorder: ''
    },
    disabled: {
      color: '#9f9f9f',
      bg: palette.border.BORDER0,
      border: 'rgb(234, 234, 234)'
    },
    danger: {
      color: '#fff',
      bg: '#dc3545',
      border: '#dc3545'
    }
  },
  button2: {
    color: {
      primary: {
        bg: palette.accents.PRIMARY,
        text: palette.utility.WHITE,
        border: palette.accents.PRIMARY
      },
      secondary: {
        bg: palette.background.MANTLE,
        border: palette.border.BORDER2,
        text: palette.text.BASE
      },
      success: {
        bg: palette.accents.GREEN,
        text: palette.utility.WHITE,
        border: palette.accents.GREEN
      },
      warning: {
        bg: palette.accents.ORANGE,
        text: palette.utility.WHITE,
        border: palette.accents.ORANGE
      },
      danger: {
        bg: palette.accents.RED,
        text: palette.utility.WHITE,
        border: palette.accents.RED
      }
    }
  },
  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: palette.text.BASE,
      border: palette.accents.PRIMARY
    },
    secondary: {
      active: {
        bg: palette.background.BASE,
        color: palette.text.BASE
      },
      inactive: {
        bg: palette.background.SURFACE1,
        color: palette.text.BASE
      }
    }
  },

  requestTabs: {
    color: palette.text.BASE,
    bg: palette.background.CRUST,
    bottomBorder: palette.border.BORDER0,
    icon: {
      color: palette.text.SUBTEXT0,
      hoverColor: palette.text.BASE,
      hoverBg: palette.background.SURFACE1
    },
    example: {
      iconColor: palette.text.SUBTEXT2
    },
    shortTab: {
      color: palette.text.SUBTEXT1,
      bg: palette.utility.WHITE,
      hoverColor: palette.text.SUBTEXT2,
      hoverBg: palette.background.SURFACE1
    }
  },

  codemirror: {
    bg: palette.utility.WHITE,
    border: palette.utility.WHITE,
    placeholder: {
      color: palette.overlay.OVERLAY1,
      opacity: 0.75
    },
    gutter: {
      bg: palette.utility.WHITE
    },
    variable: {
      valid: palette.accents.GREEN,
      invalid: palette.accents.RED,
      prompt: palette.accents.BLUE,
      info: {
        color: palette.text.BASE,
        bg: palette.utility.WHITE,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.45)',
        editorBg: palette.background.CRUST,
        iconColor: palette.text.SUBTEXT0,
        editorBorder: palette.border.BORDER0,
        editorFocusBorder: palette.text.SUBTEXT0,
        editableDisplayHoverBg: 'rgba(0,0,0,0.02)',
        border: palette.border.BORDER0
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
    searchLineHighlightCurrent: 'rgba(120,120,120,0.10)',
    searchMatch: '#B8860B',
    searchMatchActive: '#DAA520'
  },

  table: {
    border: palette.border.BORDER0,
    thead: {
      color: palette.text.SUBTEXT2
    },
    striped: palette.background.SURFACE0,
    input: {
      color: palette.text.BASE
    }
  },

  plainGrid: {
    hoverBg: palette.background.CRUST
  },

  scrollbar: {
    color: 'rgb(152 151 149)'
  },

  dragAndDrop: {
    border: palette.overlay.OVERLAY2, // Using the same gray as focusBorder from input
    borderStyle: '2px solid',
    hoverBg: 'rgba(139, 139, 139, 0.05)', // Matching the border color with reduced opacity
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: 'white',
    border: palette.background.SURFACE1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },

  statusBar: {
    border: '#E9E9E9',
    color: 'rgb(100, 100, 100)'
  },
  console: {
    bg: '#f8f9fa',
    headerBg: '#f8f9fa',
    contentBg: '#ffffff',
    border: '#dee2e6',
    titleColor: '#212529',
    countColor: '#6c757d',
    buttonColor: '#495057',
    buttonHoverBg: '#e9ecef',
    buttonHoverColor: '#212529',
    messageColor: '#212529',
    timestampColor: '#6c757d',
    emptyColor: '#6c757d',
    logHoverBg: 'rgba(0, 0, 0, 0.03)',
    resizeHandleHover: '#0d6efd',
    resizeHandleActive: '#0d6efd',
    dropdownBg: '#ffffff',
    dropdownHeaderBg: '#f8f9fa',
    optionHoverBg: '#f8f9fa',
    optionLabelColor: '#212529',
    optionCountColor: '#6c757d',
    checkboxColor: palette.accents.PRIMARY,
    scrollbarTrack: '#f8f9fa',
    scrollbarThumb: '#ced4da',
    scrollbarThumbHover: '#adb5bd'
  },

  grpc: {
    tabNav: {
      container: {
        bg: '#f5f5f5'
      },
      button: {
        active: {
          bg: '#ffffff',
          color: '#000000'
        },
        inactive: {
          bg: 'transparent',
          color: '#525252'
        }
      }
    },
    importPaths: {
      header: {
        text: '#838383',
        button: {
          color: '#838383',
          hoverColor: '#343434'
        }
      },
      error: {
        bg: 'transparent',
        text: '#B91C1C',
        link: {
          color: '#B91C1C',
          hoverColor: '#dc2626'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(0, 0, 0, 0.05)',
        text: '#343434',
        icon: '#838383',
        checkbox: {
          color: '#343434'
        },
        invalid: {
          opacity: 0.6,
          text: '#B91C1C'
        }
      },
      empty: {
        text: '#838383'
      },
      button: {
        bg: '#e2e6ea',
        color: '#212529',
        border: '#dae0e5',
        hoverBorder: '#696969'
      }
    },
    protoFiles: {
      header: {
        text: '#838383',
        button: {
          color: '#838383',
          hoverColor: '#343434'
        }
      },
      error: {
        bg: 'transparent',
        text: '#B91C1C',
        link: {
          color: '#B91C1C',
          hoverColor: '#dc2626'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(0, 0, 0, 0.05)',
        selected: {
          bg: 'rgba(217, 119, 6, 0.2)',
          border: '#d97706'
        },
        text: '#343434',
        secondaryText: '#838383',
        icon: '#838383',
        invalid: {
          opacity: 0.6,
          text: '#B91C1C'
        }
      },
      empty: {
        text: '#838383'
      },
      button: {
        bg: '#e2e6ea',
        color: '#212529',
        border: '#dae0e5',
        hoverBorder: '#696969'
      }
    }
  },
  deprecationWarning: {
    bg: 'rgba(217, 31, 17, 0.1)',
    border: 'rgba(217, 31, 17, 0.1)',
    icon: '#D91F11',
    text: palette.text.BASE
  },

  preferences: {
    sidebar: {
      border: palette.border.BORDER0
    }
  },

  examples: {
    buttonBg: '#D977061A',
    buttonColor: '#D97706',
    buttonText: '#fff',
    buttonIconColor: '#000',
    border: palette.border.BORDER0,
    urlBar: {
      border: palette.border.BORDER0,
      bg: '#F5F5F5'
    },
    table: {
      thead: {
        bg: '#f8f9fa',
        color: '#212529'
      }
    },
    checkbox: {
      color: '#fff'
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: palette.utility.WHITE,
          border: palette.border.BORDER1,
          icon: palette.accents.PRIMARY,
          text: palette.text.BASE,
          caret: palette.overlay.OVERLAY1,
          separator: palette.border.BORDER1,
          hoverBg: palette.utility.WHITE,
          hoverBorder: palette.border.BORDER2,

          noEnvironment: {
            text: palette.text.SUBTEXT1,
            bg: palette.utility.WHITE,
            border: palette.border.BORDER2,
            hoverBg: palette.utility.WHITE,
            hoverBorder: palette.overlay.OVERLAY1
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(4, 120, 87, 0.12)',
            color: palette.accents.GREEN
          },
          developerMode: {
            bg: 'rgba(204, 145, 73, 0.15)',
            color: palette.accents.YELLOW
          }
        }
      }
    }
  }
};

export default lightTheme;
