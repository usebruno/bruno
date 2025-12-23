const colors = {
  BRAND: '#d9a342',
  TEXT: '#d4d4d4',
  TEXT_MUTED: '#858585',
  TEXT_LINK: '#569cd6',
  BG: '#1e1e1e',

  GREEN: '#4ec9b0',
  YELLOW: '#d9a342',

  GRAY_1: '#252526',
  GRAY_2: '#3D3D3D',
  GRAY_3: '#444444',
  GRAY_4: '#666666',
  GRAY_5: '#b0b0b0',
  GRAY_6: '#cbcbcb',
  GRAY_7: '#e5e5e5',
  GRAY_8: '#eaeaea',
  GRAY_9: '#f3f3f3',
  GRAY_10: '#f8f8f8',

  CODEMIRROR_TOKENS: {
    DEFINITION: '#9ccc9c', // Softer, brighter sage — better contrast
    PROPERTY: '#7dcfff', // Soft sky blue, high clarity without being loud
    STRING: '#d7ba7d', // VSCode-like warm string tone
    NUMBER: '#4ec9b0', // Standard teal with higher clarity
    ATOM: '#c586c0', // Brighter lavender, matches VSCode purple
    VARIABLE: '#4fc1ff', // Clear aqua-blue (used widely in dark themes)
    KEYWORD: '#c58679', // Coral-ish but muted to avoid eye strain
    COMMENT: '#6a9955', // Greenish-slate — very readable & subtle
    OPERATOR: '#d4d4d4' // Light gray — consistent with dark mode operators
  }
};

const darkTheme = {
  brand: colors.BRAND,
  text: colors.TEXT,
  textLink: colors.TEXT_LINK,
  bg: colors.BG,

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
    }
  },

  colors: {
    text: {
      green: colors.GREEN,
      danger: '#f06f57',
      muted: colors.TEXT_MUTED,
      purple: '#cd56d6',
      yellow: colors.YELLOW
    },
    bg: {
      danger: '#d03544'
    },
    accent: colors.BRAND
  },

  input: {
    bg: 'rgb(65, 65, 65)',
    border: 'rgb(65, 65, 65)',
    focusBorder: 'rgb(65, 65, 65)',
    placeholder: {
      color: '#a2a2a2',
      opacity: 0.75
    }
  },

  variables: {
    bg: 'rgb(48, 48, 49)',

    name: {
      color: '#569cd6'
    },

    runtime: {
      color: 'rgb(255, 255, 255)'
    }
  },

  menubar: {
    bg: '#333333'
  },

  sidebar: {
    color: '#ccc',
    muted: '#9d9d9d',
    bg: colors.GRAY_1,
    dragbar: {
      border: 'transparent',
      activeBorder: colors.GRAY_4
    },

    badge: {
      bg: colors.GRAY_2
    },

    search: {
      border: '1px solid transparent',
      bg: colors.GRAY_2
    },

    collection: {
      item: {
        bg: '#37373D',
        hoverBg: '#2A2D2F',
        focusBorder: '#4e4e4e',
        indentBorder: 'solid 1px #585858',
        active: {
          indentBorder: 'solid 1px #4c4c4c'
        },
        example: {
          iconColor: colors.GRAY_5
        }
      }
    },

    dropdownIcon: {
      color: '#ccc'
    }
  },

  welcome: {
    heading: '#569cd6',
    muted: '#9d9d9d'
  },

  dropdown: {
    color: 'rgb(204, 204, 204)',
    iconColor: 'rgb(204, 204, 204)',
    bg: 'rgb(48, 48, 49)',
    hoverBg: '#6A6A6A29',
    shadow: 'rgb(0 0 0 / 36%) 0px 2px 8px',
    separator: '#444',
    labelBg: '#4a4949',
    selectedBg: '#d9a34214',
    selectedColor: '#d9a342',
    mutedText: '#9B9B9B',
    primaryText: '#D4D4D4',
    secondaryText: '#9CA3AF',
    headingText: '#FFFFFF'
  },

  listItem: {
    hoverBg: '#2A2D2F',
    activeBg: colors.GRAY_3
  },

  workspace: {
    accent: '#D9A342',
    border: '#444',
    borderMuted: '#585858',
    card: {
      bg: '#2A2D2F'
    },
    button: {
      bg: '#242424'
    },
    collection: {
      header: {
        indentBorder: 'solid 1px #444444'
      },
      item: {
        indentBorder: 'solid 1px #313131'
      }
    },
    environments: {
      bg: '#212121',
      indentBorder: 'solid 1px #313131',
      activeBg: '#37373c',
      search: {
        bg: colors.GRAY_2
      }
    }
  },

  request: {
    methods: {
      get: '#5fbf7a', // Fresh jade — readable, calm success tone
      post: '#b58adf', // Soft amethyst — cool, composed accent
      put: '#d7a35a', // Warm amber-bronze — bridges BRAND + STRING
      delete: '#e06c75', // VSCode red — destructive but readable
      patch: '#d7a35a', // Same as PUT
      options: '#c8b072', // Muted olive-gold — neutral method
      head: '#9da5b4' // Cool gray-blue — subtle, low priority
    },

    grpc: '#5fb3c4', // Steel cyan — technical, protocol-heavy, calm
    ws: '#d9a342', // Brand gold — perfect as-is
    gql: '#c96ab1' // Softened GraphQL pink — less neon, still iconic
  },

  requestTabPanel: {
    url: {
      bg: colors.BG,
      icon: 'rgb(204, 204, 204)',
      iconDanger: '#fa5343',
      errorHoverBg: '#4a2a2a',
      border: `solid 1px ${colors.GRAY_3}`
    },
    dragbar: {
      border: '#444',
      activeBorder: '#8a8a8a'
    },
    bodyModeSelect: {
      color: 'transparent'
    },
    responseSendIcon: '#555',
    responseStatus: '#ccc',
    responseOk: '#8cd656',
    responseError: '#f06f57',
    responsePending: '#569cd6',
    responseOverlayBg: 'rgba(30, 30, 30, 0.6)',

    card: {
      bg: '#252526',
      border: 'transparent',
      borderDark: '#8cd656',
      hr: '#424242'
    },

    cardTable: {
      border: '#333',
      bg: '#252526',
      table: {
        thead: {
          bg: colors.GRAY_2,
          color: '#ccc'
        }
      }
    },
    graphqlDocsExplorer: {
      bg: '#1e1e1e',
      color: '#d4d4d4'
    }
  },

  collection: {
    environment: {
      bg: colors.GRAY_2,

      settings: {
        bg: colors.GRAY_2,
        sidebar: {
          bg: colors.GRAY_2,
          borderRight: '#4f4f4f'
        },
        item: {
          border: '#569cd6',
          hoverBg: 'transparent',
          active: {
            bg: 'transparent',
            hoverBg: 'transparent'
          }
        },
        gridBorder: '#4f4f4f'
      }
    }
  },

  notifications: {
    bg: colors.GRAY_3,
    list: {
      bg: '3D3D3D',
      borderRight: '#4f4f4f',
      borderBottom: '#545454',
      hoverBg: '#434343',
      active: {
        border: '#569cd6',
        bg: '#4f4f4f',
        hoverBg: '#4f4f4f'
      }
    }
  },

  modal: {
    title: {
      color: '#ccc',
      bg: 'rgb(38, 38, 39)',
      iconColor: '#ccc'
    },
    body: {
      color: '#ccc',
      bg: 'rgb(48, 48, 49)'
    },
    input: {
      bg: 'rgb(65, 65, 65)',
      border: 'rgb(65, 65, 65)',
      focusBorder: 'rgb(65, 65, 65)'
    },
    backdrop: {
      opacity: 0.2
    }
  },

  button: {
    secondary: {
      color: 'rgb(204, 204, 204)',
      bg: '#185387',
      border: '#185387',
      hoverBorder: '#696969'
    },
    close: {
      color: '#ccc',
      bg: 'transparent',
      border: 'transparent',
      hoverBorder: ''
    },
    disabled: {
      color: '#a5a5a5',
      bg: '#626262',
      border: '#626262'
    },
    danger: {
      color: '#fff',
      bg: '#dc3545',
      border: '#dc3545'
    }
  },

  tabs: {
    marginRight: '1.2rem',
    active: {
      fontWeight: 400,
      color: '#CCCCCC',
      border: '#d9a342'
    },
    secondary: {
      active: {
        bg: '#2D2D2D',
        color: '#CCCCCC'
      },
      inactive: {
        bg: '#3F3F3F',
        color: '#CCCCCC'
      }
    }
  },

  requestTabs: {
    color: '#ccc',
    bg: '#2A2D2F',
    bottomBorder: '#444',
    icon: {
      color: '#9f9f9f',
      hoverColor: 'rgb(204, 204, 204)',
      hoverBg: '#1e1e1e'
    },
    example: {
      iconColor: colors.GRAY_5
    },
    active: {
      bg: colors.GRAY_2
    },
    shortTab: {
      color: '#ccc',
      bg: 'transparent',
      hoverColor: '#ccc',
      hoverBg: colors.GRAY_3
    }
  },

  codemirror: {
    bg: colors.BG,
    border: colors.BG,
    placeholder: {
      color: '#a2a2a2',
      opacity: 0.5
    },
    gutter: {
      bg: colors.BG
    },
    variable: {
      valid: 'rgb(11 178 126)',
      invalid: '#f06f57',
      prompt: '#3D8DF5',
      info: {
        color: '#FFFFFF',
        bg: '#343434',
        boxShadow: 'rgb(0 0 0 / 36%) 0px 2px 8px',
        editorBg: '#292929',
        iconColor: '#989898',
        editorBorder: colors.GRAY_3,
        editorFocusBorder: '#CCCCCC',
        editableDisplayHoverBg: 'rgba(255,255,255,0.03)',
        border: '#4F4F4F'
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
    searchLineHighlightCurrent: 'rgba(120,120,120,0.18)',
    searchMatch: '#FFD700',
    searchMatchActive: '#FFFF00'
  },

  table: {
    border: '#333',
    thead: {
      color: 'rgb(204, 204, 204)'
    },
    striped: '#2A2D2F',
    input: {
      color: '#ccc'
    }
  },

  plainGrid: {
    hoverBg: colors.GRAY_3
  },

  scrollbar: {
    color: 'rgb(52 51 49)'
  },

  dragAndDrop: {
    border: '#666666',
    borderStyle: '2px solid',
    hoverBg: 'rgba(102, 102, 102, 0.08)',
    transition: 'all 0.1s ease'
  },
  tooltip: {
    bg: '#1f1f1f',
    color: '#ffffff',
    shortcutColor: '#d9a342'
  },

  infoTip: {
    bg: '#1f1f1f',
    border: '#333333',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
  },

  statusBar: {
    border: '#323233',
    color: 'rgb(169, 169, 169)'
  },

  console: {
    bg: '#1e1e1e',
    headerBg: '#2d2d30',
    contentBg: '#1e1e1e',
    border: '#3c3c3c',
    titleColor: '#cccccc',
    countColor: '#858585',
    buttonColor: '#cccccc',
    buttonHoverBg: 'rgba(255, 255, 255, 0.1)',
    buttonHoverColor: '#ffffff',
    messageColor: '#cccccc',
    timestampColor: '#858585',
    emptyColor: '#858585',
    logHoverBg: 'rgba(255, 255, 255, 0.05)',
    resizeHandleHover: '#0078d4',
    resizeHandleActive: '#0078d4',
    dropdownBg: '#2d2d30',
    dropdownHeaderBg: '#3c3c3c',
    optionHoverBg: 'rgba(255, 255, 255, 0.05)',
    optionLabelColor: '#cccccc',
    optionCountColor: '#858585',
    checkboxColor: colors.BRAND,
    scrollbarTrack: '#2d2d30',
    scrollbarThumb: '#5a5a5a',
    scrollbarThumbHover: '#6a6a6a'
  },

  grpc: {
    tabNav: {
      container: {
        bg: '#262626'
      },
      button: {
        active: {
          bg: '#404040',
          color: '#ffffff'
        },
        inactive: {
          bg: 'transparent',
          color: '#a3a3a3'
        }
      }
    },
    importPaths: {
      header: {
        text: '#9d9d9d',
        button: {
          color: '#9d9d9d',
          hoverColor: '#d4d4d4'
        }
      },
      error: {
        bg: 'transparent',
        text: '#f06f57',
        link: {
          color: '#f06f57',
          hoverColor: '#ff8a7a'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        text: '#d4d4d4',
        icon: '#9d9d9d',
        checkbox: {
          color: '#d4d4d4'
        },
        invalid: {
          opacity: 0.6,
          text: '#f06f57'
        }
      },
      empty: {
        text: '#9d9d9d'
      },
      button: {
        bg: '#185387',
        color: '#d4d4d4',
        border: '#185387',
        hoverBorder: '#696969'
      }
    },
    protoFiles: {
      header: {
        text: '#9d9d9d',
        button: {
          color: '#9d9d9d',
          hoverColor: '#d4d4d4'
        }
      },
      error: {
        bg: 'transparent',
        text: '#f06f57',
        link: {
          color: '#f06f57',
          hoverColor: '#ff8a7a'
        }
      },
      item: {
        bg: 'transparent',
        hoverBg: 'rgba(255, 255, 255, 0.05)',
        selected: {
          bg: 'rgba(245, 158, 11, 0.2)',
          border: '#d9a342'
        },
        text: '#d4d4d4',
        secondaryText: '#9d9d9d',
        icon: '#9d9d9d',
        invalid: {
          opacity: 0.6,
          text: '#f06f57'
        }
      },
      empty: {
        text: '#9d9d9d'
      },
      button: {
        bg: '#185387',
        color: '#d4d4d4',
        border: '#185387',
        hoverBorder: '#696969'
      }
    },
    protoFileDropdown: {
      text: colors.TEXT,
      border: colors.GRAY_4,
      description: colors.TEXT_MUTED
    },
    methodDropdown: {
      text: colors.TEXT,
      serviceHeader: {
        bg: colors.GRAY_2,
        text: colors.TEXT
      },
      methodName: colors.TEXT,
      selectedBg: 'rgba(234, 179, 8, 0.2)',
      hoverBg: 'rgba(255, 255, 255, 0.05)'
    },
    body: {
      emptyMessage: '#a1a1aa',
      addButton: {
        border: '#3f3f46',
        bg: '#3f3f46',
        hoverBg: '#52525b',
        text: colors.TEXT,
        icon: colors.TEXT
      },
      messageContainer: {
        border: '#3f3f46'
      },
      messageHeader: {
        bg: '#3f3f46'
      },
      icon: colors.TEXT,
      actionButton: {
        hoverBg: '#52525b'
      }
    },
    timelineItem: {
      request: {
        bg: 'rgba(251, 146, 60, 0.1)',
        label: '#fb923c',
        content: colors.GRAY_2
      },
      message: {
        bg: 'rgba(251, 146, 60, 0.1)',
        label: '#fb923c',
        content: colors.GRAY_2
      },
      metadata: {
        bg: 'rgba(59, 130, 246, 0.1)',
        label: '#60a5fa'
      },
      response: {
        bg: 'rgba(34, 197, 94, 0.1)',
        label: '#4ade80',
        content: colors.GRAY_2
      },
      status: {
        bg: 'rgba(168, 85, 247, 0.1)',
        label: '#a78bfa'
      },
      error: {
        bg: 'rgba(220, 38, 38, 0.1)',
        label: '#f87171'
      },
      end: {
        bg: 'rgba(107, 114, 128, 0.3)'
      },
      cancel: {
        bg: 'rgba(245, 158, 11, 0.1)',
        label: '#fbbf24'
      },
      methodBadge: {
        bg: 'rgba(251, 146, 60, 0.3)',
        text: '#fb923c'
      }
    },
    queryResult: {
      emptyMessage: colors.TEXT_MUTED
    },
    tabNavigation: {
      border: colors.GRAY_4
    }
  },

  ws: {
    body: {
      emptyMessage: '#a1a1aa',
      addButton: {
        border: '#3f3f46',
        bg: '#3f3f46',
        hoverBg: '#52525b',
        text: colors.TEXT,
        icon: colors.TEXT
      }
    },
    singleMessage: {
      container: {
        border: '#3f3f46'
      },
      header: {
        bg: '#3f3f46'
      },
      icon: colors.TEXT,
      actionButton: {
        hoverBg: '#52525b'
      }
    },
    messagesList: {
      chevron: '#d4d4d8'
    }
  },

  deprecationWarning: {
    bg: 'rgba(250, 83, 67, 0.1)',
    border: 'rgba(250, 83, 67, 0.1)',
    icon: '#FA5343',
    text: '#B8B8B8'
  },

  preferences: {
    sidebar: {
      border: '#444444'
    }
  },

  examples: {
    buttonBg: '#d9a3421A',
    buttonColor: '#d9a342',
    buttonText: '#fff',
    buttonIconColor: '#fff',
    border: '#444',
    urlBar: {
      border: colors.GRAY_3,
      bg: '#292929'
    },
    table: {
      thead: {
        bg: '#292929',
        color: '#969696'
      }
    },
    checkbox: {
      color: '#000'
    }
  },

  app: {
    collection: {
      toolbar: {
        environmentSelector: {
          bg: colors.BG,
          border: colors.GRAY_3,
          icon: colors.BRAND,
          text: colors.TEXT,
          caret: colors.TEXT_MUTED,
          separator: colors.GRAY_3,
          hoverBg: colors.BG,
          hoverBorder: colors.GRAY_4,

          noEnvironment: {
            text: colors.TEXT_MUTED,
            bg: colors.BG,
            border: colors.GRAY_3,
            hoverBg: colors.BG,
            hoverBorder: colors.GRAY_4
          }
        },
        sandboxMode: {
          safeMode: {
            bg: 'rgba(78, 201, 176, 0.12)',
            color: colors.GREEN
          },
          developerMode: {
            bg: 'rgba(217, 163, 66, 0.11)',
            color: colors.YELLOW
          }
        }
      }
    }
  },

  shareCollection: {
    exportOption: {
      border: colors.GRAY_4,
      hoverBg: 'rgba(180, 180, 180, 0.1)'
    },
    warning: {
      bg: 'rgba(217, 163, 66, 0.2)',
      text: '#fbbf24',
      border: 'rgba(217, 163, 66, 0.2)'
    }
  },

  collectionSettings: {
    infoIcon: {
      blue: {
        bg: 'rgba(59, 130, 246, 0.2)'
      },
      green: {
        bg: 'rgba(34, 197, 94, 0.2)'
      },
      purple: {
        bg: 'rgba(168, 85, 247, 0.2)'
      },
      indigo: {
        bg: 'rgba(99, 102, 241, 0.2)'
      }
    }
  },

  queryResultPreview: {
    noPreview: {
      heading: colors.TEXT,
      text: colors.TEXT_MUTED
    }
  },

  runnerResults: {
    filterButton: {
      active: {
        text: '#CCCCCC',
        border: '#F59E0B'
      },
      inactive: {
        text: 'rgba(204, 204, 204, 0.5)'
      }
    },
    filterBadge: {
      bg: '#242424',
      border: 'rgba(146, 146, 146, 0.2)',
      text: 'inherit'
    },
    sectionBorder: colors.GRAY_4,
    filterContainer: {
      border: 'rgba(146, 146, 146, 0.2)'
    },
    filterLabel: {
      bg: '#2B2D2F',
      text: colors.TEXT_MUTED
    },
    actionButton: {
      border: colors.GRAY_3,
      text: '#989898'
    },
    iconButton: {
      hoverBg: colors.GRAY_2
    },
    emptyState: {
      text: colors.TEXT_MUTED,
      description: colors.TEXT_MUTED
    }
  },

  scriptError: {
    separator: colors.GRAY_4
  },

  settingsInput: {
    label: '#f3f4f6',
    description: colors.TEXT_MUTED
  },

  timelineItem: {
    body: {
      headerText: 'rgba(99, 102, 241, 0.8)'
    }
  },

  collectionsList: {
    modal: {
      text: colors.TEXT,
      description: colors.TEXT_MUTED
    }
  },

  inheritableSettingsInput: {
    resetButton: {
      color: colors.TEXT_MUTED,
      hoverColor: colors.TEXT
    }
  },

  importModal: {
    heading: '#f3f4f6',
    dragZone: {
      border: colors.GRAY_4,
      activeBorder: '#60a5fa',
      activeBg: 'rgba(59, 130, 246, 0.2)'
    },
    icon: colors.TEXT_MUTED,
    text: colors.TEXT,
    description: colors.TEXT_MUTED,
    selectedFile: {
      border: colors.GRAY_4,
      bg: colors.GRAY_2,
      text: colors.TEXT
    }
  },

  fullscreenLoader: {
    backdrop: 'rgba(24, 24, 27, 0.8)',
    card: {
      bg: '#27272a',
      heading: '#fafafa',
      text: '#a1a1aa'
    }
  },

  oauth2: {
    badge: {
      bg: 'rgba(99, 102, 241, 0.1)'
    },
    icon: '#818cf8',
    label: colors.TEXT
  },

  importCollectionLocation: {
    groupingLabel: '#f3f4f6',
    groupingDescription: colors.TEXT_MUTED
  },

  requestNotLoaded: {
    warning: {
      bg: 'rgba(217, 163, 66, 0.2)'
    }
  },

  importEnvironment: {
    button: {
      bg: '#3f3f46',
      border: '#71717a',
      hoverBorder: '#a1a1aa'
    }
  },

  beta: {
    description: colors.TEXT_MUTED,
    featureDescription: colors.TEXT_MUTED
  },

  requestPaneSettings: {
    heading: '#f3f4f6'
  },

  exportEnvironmentModal: {
    border: colors.GRAY_4
  },

  toggleSelector: {
    label: '#f3f4f6',
    description: colors.TEXT_MUTED,
    switch: {
      checked: '#3b82f6',
      unchecked: colors.GRAY_4
    }
  },

  importEnvironmentModal: {
    zone: {
      bg: '#3f3f46',
      border: '#71717a',
      hoverBorder: '#a1a1aa',
      dragOverBorder: '#f59e0b',
      dragOverBg: 'rgba(245, 158, 11, 0.2)'
    }
  },

  cookies: {
    count: colors.TEXT,
    addButton: {
      color: '#ffffff',
      hoverColor: colors.TEXT
    },
    deleteButton: {
      color: '#ffffff',
      hoverColor: '#ef4444'
    },
    editButton: {
      color: '#ffffff',
      hoverColor: colors.TEXT
    },
    table: {
      headerBorder: colors.GRAY_4,
      headerText: colors.TEXT,
      rowBorder: colors.GRAY_4
    }
  },

  oauth2TokenViewer: {
    section: {
      border: colors.GRAY_4
    },
    header: {
      bg: colors.GRAY_2,
      hoverBg: '#3a3a3a'
    },
    copyButton: {
      bg: 'rgba(99, 102, 241, 0.2)',
      hoverBg: 'rgba(99, 102, 241, 0.3)'
    },
    content: {
      bg: colors.GRAY_2
    },
    label: colors.TEXT_MUTED,
    value: colors.TEXT,
    expiry: {
      expiring: {
        bg: 'rgba(220, 38, 38, 0.3)',
        text: '#f87171'
      },
      normal: {
        bg: 'rgba(37, 99, 235, 0.3)',
        text: '#60a5fa'
      }
    },
    error: {
      text: '#f87171'
    },
    infoContainer: {
      border: colors.GRAY_4
    },
    infoSection: {
      bg: colors.GRAY_2
    },
    empty: colors.TEXT_MUTED
  },

  protobuf: {
    errorMessage: '#f87171',
    table: {
      headerText: colors.TEXT,
      border: colors.GRAY_4
    },
    emptyMessage: colors.TEXT_MUTED,
    fileIcon: colors.TEXT_MUTED,
    fileName: colors.TEXT,
    filePath: colors.TEXT_MUTED,
    invalidIcon: '#f87171',
    replaceButton: {
      color: '#f87171',
      hoverColor: '#fca5a5'
    },
    removeButton: {
      color: colors.TEXT_MUTED,
      hoverColor: colors.TEXT
    },
    checkbox: {
      border: colors.GRAY_4
    }
  }
};

export default darkTheme;
