// Kanagawa - Wave Theme
// Based on the Kanagawa palette from rebelot/kanagawa.nvim

import { rgba } from 'polished';

const colors = {
  FUJI_WHITE: '#DCD7BA',
  OLD_WHITE: '#C8C093',
  SUMI_INK_0: '#16161D',
  SUMI_INK_1: '#1F1F28',
  SUMI_INK_2: '#2A2A37',
  SUMI_INK_3: '#363646',
  SUMI_INK_4: '#54546D',
  WINTER_BLUE: '#252535',
  WINTER_GREEN: '#2B3328',
  WINTER_YELLOW: '#49443C',
  WINTER_RED: '#43242B',
  WAVE_BLUE_1: '#223249',
  WAVE_BLUE_2: '#2D4F67',
  KATANA_GRAY: '#717C7C',
  DRAGON_BLUE: '#658594',
  SPRING_BLUE: '#7FB4CA',
  CRYSTAL_BLUE: '#7E9CD8',
  LIGHT_BLUE: '#A3D4D5',
  WAVE_AQUA_1: '#6A9589',
  WAVE_AQUA_2: '#7AA89F',
  ONI_VIOLET: '#957FB8',
  SPRING_VIOLET_1: '#938AA9',
  SPRING_VIOLET_2: '#9CABCA',
  SPRING_GREEN: '#98BB6C',
  AUTUMN_GREEN: '#76946A',
  AUTUMN_RED: '#C34043',
  SAMURAI_RED: '#E82424',
  SAKURA_PINK: '#D27E99',
  SURIMI_ORANGE: '#FFA066',
  RONIN_YELLOW: '#FF9E3B',
  CARP_YELLOW: '#E6C384',
  BOAT_YELLOW_1: '#938056',
  BOAT_YELLOW_2: '#C0A36E',
  WHITE: '#FFFFFF',
  BLACK: '#000000',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#98BB6C',
    PROPERTY: '#7E9CD8',
    STRING: '#E6C384',
    NUMBER: '#FFA066',
    ATOM: '#957FB8',
    VARIABLE: '#7FB4CA',
    KEYWORD: '#957FB8',
    COMMENT: '#717C7C',
    OPERATOR: '#6A9589',
    TAG: '#7FB4CA',
    TAG_BRACKET: '#54546D'
  }
};

export const palette = {};

palette.intent = {
  INFO: colors.CRYSTAL_BLUE,
  SUCCESS: colors.SPRING_GREEN,
  WARNING: colors.CARP_YELLOW,
  DANGER: colors.AUTUMN_RED
};

const kanagawaTheme = {
  mode: 'dark',
  brand: colors.ONI_VIOLET,
  text: colors.FUJI_WHITE,
  textLink: colors.SPRING_BLUE,
  draftColor: colors.RONIN_YELLOW,
  bg: colors.SUMI_INK_1,

  primary: {
    solid: colors.ONI_VIOLET,
    text: colors.ONI_VIOLET,
    strong: colors.ONI_VIOLET,
    subtle: colors.SPRING_VIOLET_1
  },

  accents: {
    primary: colors.ONI_VIOLET
  },

  background: {
    base: colors.SUMI_INK_1,
    mantle: colors.SUMI_INK_0,
    crust: colors.WINTER_BLUE,
    surface0: colors.SUMI_INK_2,
    surface1: colors.SUMI_INK_3,
    surface2: colors.SUMI_INK_4
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
    overlay2: colors.SPRING_VIOLET_2,
    overlay1: colors.KATANA_GRAY,
    overlay0: colors.SUMI_INK_4
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
    sm: '0 1px 3px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.2)',
    md: '0 2px 8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.3)',
    lg: '0 2px 12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(0, 0, 0, 0.35)'
  },

  border: {
    radius: {
      sm: '4px',
      base: '6px',
      md: '8px',
      lg: '10px',
      xl: '12px'
    },
    border2: colors.SUMI_INK_4,
    border1: colors.SUMI_INK_3,
    border0: colors.SUMI_INK_2
  },

  colors: {
    text: {
      white: colors.WHITE,
      green: colors.SPRING_GREEN,
      danger: colors.AUTUMN_RED,
      warning: colors.CARP_YELLOW,
      muted: colors.KATANA_GRAY,
      purple: colors.ONI_VIOLET,
      yellow: colors.CARP_YELLOW,
      subtext2: colors.FUJI_WHITE,
      subtext1: colors.OLD_WHITE,
      subtext0: colors.KATANA_GRAY
    },
    bg: {
      danger: colors.WINTER_RED
    },
    accent: colors.ONI_VIOLET
  },

  input: {
    bg: 'transparent',
    border: colors.SUMI_INK_3,
    focusBorder: colors.SPRING_BLUE,
    placeholder: {
      color: colors.KATANA_GRAY,
      opacity: 0.7
    }
  },

  sidebar: {
    color: colors.FUJI_WHITE,
    muted: colors.KATANA_GRAY,
    bg: colors.SUMI_INK_1,
    dragbar: {
      border: colors.SUMI_INK_2,
      activeBorder: colors.WAVE_BLUE_2
    },

    collection: {
      item: {
        bg: colors.SUMI_INK_2,
        hoverBg: colors.SUMI_INK_3,
        focusBorder: colors.WAVE_BLUE_2,
        indentBorder: colors.SUMI_INK_3,
        active: {
          indentBorder: colors.ONI_VIOLET
        },
        example: {
          iconColor: colors.KATANA_GRAY
        }
      }
    },

    dropdownIcon: {
      color: colors.FUJI_WHITE
    }
  },

  dropdown: {
    color: colors.FUJI_WHITE,
    iconColor: colors.OLD_WHITE,
    bg: colors.SUMI_INK_2,
    hoverBg: rgba(colors.WAVE_BLUE_2, 0.22),
    shadow: 'none',
    border: rgba(colors.SUMI_INK_4, 0.75),
    separator: colors.SUMI_INK_3,
    selectedColor: colors.ONI_VIOLET,
    mutedText: colors.KATANA_GRAY
  },

  workspace: {
    accent: colors.ONI_VIOLET,
    border: colors.SUMI_INK_3,
    button: {
      bg: colors.SUMI_INK_2
    }
  },

  request: {
    methods: {
      get: colors.SPRING_GREEN,
      post: colors.CRYSTAL_BLUE,
      put: colors.CARP_YELLOW,
      delete: colors.AUTUMN_RED,
      patch: colors.SURIMI_ORANGE,
      options: colors.WAVE_AQUA_2,
      head: colors.DRAGON_BLUE
    },

    grpc: colors.LIGHT_BLUE,
    ws: colors.ONI_VIOLET,
    gql: colors.SAKURA_PINK
  },

  requestTabPanel: {
    url: {
      bg: colors.SUMI_INK_1,
      icon: colors.FUJI_WHITE,
      iconDanger: colors.AUTUMN_RED,
      border: `solid 1px ${colors.SUMI_INK_2}`
    },
    dragbar: {
      border: colors.SUMI_INK_2,
      activeBorder: colors.WAVE_BLUE_2
    },
    responseStatus: colors.FUJI_WHITE,
    responseOk: colors.SPRING_GREEN,
    responseError: colors.AUTUMN_RED,
    responsePending: colors.CRYSTAL_BLUE,
    responseOverlayBg: rgba(colors.SUMI_INK_1, 0.72),

    card: {
      bg: colors.SUMI_INK_0,
      border: 'transparent',
      hr: colors.SUMI_INK_2
    },

    graphqlDocsExplorer: {
      bg: colors.SUMI_INK_1,
      color: colors.FUJI_WHITE
    }
  },

  notifications: {
    bg: colors.SUMI_INK_2,
    list: {
      bg: colors.SUMI_INK_2,
      borderRight: colors.SUMI_INK_4,
      borderBottom: colors.SUMI_INK_3,
      hoverBg: colors.SUMI_INK_3,
      active: {
        border: colors.CRYSTAL_BLUE,
        bg: colors.WAVE_BLUE_1,
        hoverBg: colors.WAVE_BLUE_1
      }
    }
  },

  modal: {
    title: {
      color: colors.FUJI_WHITE,
      bg: colors.SUMI_INK_0
    },
    body: {
      color: colors.FUJI_WHITE,
      bg: colors.SUMI_INK_1
    },
    input: {
      bg: 'transparent',
      border: colors.SUMI_INK_3,
      focusBorder: colors.SPRING_BLUE
    },
    backdrop: {
      opacity: 0.24
    }
  },

  button: {
    secondary: {
      color: colors.FUJI_WHITE,
      bg: colors.SUMI_INK_2,
      border: colors.SUMI_INK_2,
      hoverBorder: colors.WAVE_BLUE_2
    },
    close: {
      color: colors.FUJI_WHITE,
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: ''
    },
    disabled: {
      color: colors.KATANA_GRAY,
      bg: colors.SUMI_INK_3,
      border: colors.SUMI_INK_3
    },
    danger: {
      color: colors.FUJI_WHITE,
      bg: colors.AUTUMN_RED,
      border: colors.AUTUMN_RED
    }
  },

  button2: {
    color: {
      primary: {
        bg: colors.ONI_VIOLET,
        text: colors.FUJI_WHITE,
        border: colors.ONI_VIOLET
      },
      light: {
        bg: rgba(colors.ONI_VIOLET, 0.14),
        text: colors.ONI_VIOLET,
        border: rgba(colors.ONI_VIOLET, 0.18)
      },
      secondary: {
        bg: colors.SUMI_INK_2,
        text: colors.FUJI_WHITE,
        border: colors.SUMI_INK_3
      },
      success: {
        bg: colors.SPRING_GREEN,
        text: colors.SUMI_INK_0,
        border: colors.SPRING_GREEN
      },
      warning: {
        bg: colors.CARP_YELLOW,
        text: colors.SUMI_INK_0,
        border: colors.CARP_YELLOW
      },
      danger: {
        bg: colors.AUTUMN_RED,
        text: colors.FUJI_WHITE,
        border: colors.AUTUMN_RED
      }
    }
  },

  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: colors.FUJI_WHITE,
      border: colors.ONI_VIOLET
    },
    secondary: {
      active: {
        bg: colors.SUMI_INK_2,
        color: colors.FUJI_WHITE
      },
      inactive: {
        bg: colors.SUMI_INK_2,
        color: colors.KATANA_GRAY
      }
    }
  },

  requestTabs: {
    color: colors.FUJI_WHITE,
    bg: colors.SUMI_INK_2,
    bottomBorder: colors.SUMI_INK_3,
    icon: {
      color: colors.KATANA_GRAY,
      hoverColor: colors.FUJI_WHITE,
      hoverBg: colors.SUMI_INK_1
    },
    example: {
      iconColor: colors.KATANA_GRAY
    }
  },

  codemirror: {
    bg: colors.SUMI_INK_1,
    border: colors.SUMI_INK_1,
    placeholder: {
      color: colors.KATANA_GRAY,
      opacity: 0.5
    },
    gutter: {
      bg: colors.SUMI_INK_1
    },
    variable: {
      valid: colors.SPRING_GREEN,
      invalid: colors.AUTUMN_RED,
      prompt: colors.CRYSTAL_BLUE
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
    searchLineHighlightCurrent: rgba(colors.WAVE_BLUE_2, 0.28),
    searchMatch: colors.CARP_YELLOW,
    searchMatchActive: colors.RONIN_YELLOW
  },

  table: {
    border: colors.SUMI_INK_2,
    thead: {
      color: colors.FUJI_WHITE
    },
    striped: colors.SUMI_INK_2,
    input: {
      color: colors.FUJI_WHITE
    }
  },

  plainGrid: {
    hoverBg: colors.SUMI_INK_2
  },

  scrollbar: {
    color: colors.SUMI_INK_3
  },

  dragAndDrop: {
    border: colors.SPRING_BLUE,
    borderStyle: '2px solid',
    hoverBg: rgba(colors.SPRING_BLUE, 0.08),
    transition: 'all 0.1s ease'
  },

  infoTip: {
    bg: colors.SUMI_INK_2,
    border: colors.SUMI_INK_3,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)'
  },

  statusBar: {
    border: colors.SUMI_INK_2,
    color: colors.KATANA_GRAY
  },

  console: {
    bg: colors.SUMI_INK_1,
    headerBg: colors.SUMI_INK_0,
    contentBg: colors.SUMI_INK_1,
    border: colors.SUMI_INK_2,
    titleColor: colors.FUJI_WHITE,
    countColor: colors.KATANA_GRAY,
    buttonColor: colors.FUJI_WHITE,
    buttonHoverBg: rgba(colors.FUJI_WHITE, 0.08),
    buttonHoverColor: colors.FUJI_WHITE,
    messageColor: colors.FUJI_WHITE,
    timestampColor: colors.KATANA_GRAY,
    emptyColor: colors.KATANA_GRAY,
    logHoverBg: rgba(colors.FUJI_WHITE, 0.04),
    resizeHandleHover: colors.CRYSTAL_BLUE,
    resizeHandleActive: colors.CRYSTAL_BLUE,
    dropdownBg: colors.SUMI_INK_0,
    dropdownHeaderBg: colors.SUMI_INK_2,
    optionHoverBg: rgba(colors.FUJI_WHITE, 0.04),
    optionLabelColor: colors.FUJI_WHITE,
    optionCountColor: colors.KATANA_GRAY,
    checkboxColor: colors.ONI_VIOLET,
    scrollbarTrack: colors.SUMI_INK_0,
    scrollbarThumb: colors.SUMI_INK_4,
    scrollbarThumbHover: colors.KATANA_GRAY
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.WINTER_BLUE
      },
      button: {
        active: {
          bg: colors.SUMI_INK_2,
          color: colors.FUJI_WHITE
        },
        inactive: {
          bg: 'transparent',
          color: colors.KATANA_GRAY
        }
      }
    },
    importPaths: {
      header: {
        text: colors.KATANA_GRAY,
        button: {
          color: colors.KATANA_GRAY,
          hoverColor: colors.FUJI_WHITE
        }
      },
      error: {
        bg: 'transparent',
        text: colors.AUTUMN_RED,
        link: {
          color: colors.AUTUMN_RED,
          hoverColor: colors.SAMURAI_RED
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(colors.FUJI_WHITE, 0.04),
        text: colors.FUJI_WHITE,
        icon: colors.KATANA_GRAY,
        checkbox: {
          color: colors.FUJI_WHITE
        },
        invalid: {
          opacity: 0.6,
          text: colors.AUTUMN_RED
        }
      },
      empty: {
        text: colors.KATANA_GRAY
      },
      button: {
        bg: colors.SUMI_INK_2,
        color: colors.FUJI_WHITE,
        border: colors.SUMI_INK_2,
        hoverBorder: colors.WAVE_BLUE_2
      }
    },
    protoFiles: {
      header: {
        text: colors.KATANA_GRAY,
        button: {
          color: colors.KATANA_GRAY,
          hoverColor: colors.FUJI_WHITE
        }
      },
      error: {
        bg: 'transparent',
        text: colors.AUTUMN_RED,
        link: {
          color: colors.AUTUMN_RED,
          hoverColor: colors.SAMURAI_RED
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: rgba(colors.FUJI_WHITE, 0.04),
        selected: {
          bg: rgba(colors.ONI_VIOLET, 0.18),
          border: colors.ONI_VIOLET
        },
        text: colors.FUJI_WHITE,
        secondaryText: colors.KATANA_GRAY,
        icon: colors.KATANA_GRAY,
        invalid: {
          opacity: 0.6,
          text: colors.AUTUMN_RED
        }
      },
      empty: {
        text: colors.KATANA_GRAY
      },
      button: {
        bg: colors.SUMI_INK_2,
        color: colors.FUJI_WHITE,
        border: colors.SUMI_INK_2,
        hoverBorder: colors.WAVE_BLUE_2
      }
    }
  },

  deprecationWarning: {
    bg: rgba(colors.AUTUMN_RED, 0.1),
    border: rgba(colors.AUTUMN_RED, 0.14),
    icon: colors.AUTUMN_RED,
    text: colors.OLD_WHITE
  },

  examples: {
    buttonBg: rgba(colors.ONI_VIOLET, 0.12),
    buttonColor: colors.ONI_VIOLET,
    buttonText: colors.FUJI_WHITE,
    buttonIconColor: colors.FUJI_WHITE,
    border: colors.SUMI_INK_3,
    urlBar: {
      border: colors.SUMI_INK_2,
      bg: colors.SUMI_INK_0
    },
    table: {
      thead: {
        bg: colors.SUMI_INK_0,
        color: colors.KATANA_GRAY
      }
    },
    checkbox: {
      color: colors.SUMI_INK_0
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.SUMI_INK_1,
          border: colors.SUMI_INK_2,
          icon: colors.CRYSTAL_BLUE,
          text: colors.FUJI_WHITE,
          caret: colors.KATANA_GRAY,
          separator: colors.SUMI_INK_2,
          hoverBg: colors.SUMI_INK_1,
          hoverBorder: colors.SUMI_INK_3,

          noEnvironment: {
            text: colors.KATANA_GRAY,
            bg: colors.SUMI_INK_1,
            border: colors.SUMI_INK_2,
            hoverBg: colors.SUMI_INK_1,
            hoverBorder: colors.SUMI_INK_3
          }
        },
        sandboxMode: {
          safeMode: {
            bg: rgba(colors.SPRING_GREEN, 0.12),
            color: colors.SPRING_GREEN
          },
          developerMode: {
            bg: rgba(colors.CARP_YELLOW, 0.12),
            color: colors.CARP_YELLOW
          }
        }
      }
    }
  }
};

export default kanagawaTheme;
