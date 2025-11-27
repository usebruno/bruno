import colors from './light-main';

const lightTheme = {
  // Core colors
  text: colors.text,
  textLink: colors.textLink,
  bg: colors.surface,

  colors: {
    text: {
      green: colors.textSuccess,
      danger: colors.textDanger,
      muted: colors.textMuted,
      purple: colors.methodPost,
      yellow: colors.accent
    },
    bg: {
      danger: colors.danger
    }
  },

  input: {
    bg: colors.inputBg,
    border: colors.inputBorder,
    focusBorder: colors.inputFocusBorder,
    placeholder: {
      color: colors.inputPlaceholder,
      opacity: 0.8
    }
  },

  variables: {
    runtime: {
      color: colors.black
    }
  },

  sidebar: {
    color: colors.text,
    muted: colors.additional.sidebarColor,
    bg: colors.surfaceElevated,
    dragbar: colors.additional.sidebarDragbar,

    badge: {
      bg: colors.borderMid
    },

    search: {
      border: colors.additional.sidebarSearchBorder,
      bg: colors.surface
    },

    collection: {
      item: {
        bg: colors.borderMid,
        hoverBg: colors.additional.sidebarItemHoverBg,
        indentBorder: colors.additional.sidebarIndentBorder,
        active: {
          indentBorder: colors.additional.sidebarIndentBorderActive
        }
      }
    },

    dropdownIcon: {
      color: colors.additional.sidebarDropdownIconColor
    }
  },

  welcome: {
    heading: colors.additional.welcomeHeading,
    muted: colors.additional.welcomeMuted
  },

  dropdown: {
    color: colors.additional.dropdownColor,
    iconColor: colors.additional.dropdownIconColor,
    bg: colors.surface,
    hoverBg: colors.additional.dropdownHoverBg,
    shadow: colors.shadowLight,
    separator: colors.borderSubtle,
    labelBg: colors.surfaceElevated,
    selectedBg: colors.accentSubtle,
    selectedColor: colors.accentBorder,
    mutedText: colors.additional.dropdownMutedText,
    primaryText: colors.text,
    secondaryText: colors.additional.dropdownSecondaryText
  },

  request: {
    methods: {
      get: colors.methodGet,
      post: colors.methodPost,
      put: colors.methodPut,
      delete: colors.methodDelete,
      patch: colors.methodPatch,
      options: colors.methodOptions,
      head: colors.methodHead
    },
    grpc: colors.requestGrpc,
    ws: colors.requestWs,
    gql: colors.requestGql
  },

  requestTabPanel: {
    url: {
      bg: colors.surfaceElevated,
      icon: colors.additional.requestUrlIcon,
      iconDanger: colors.additional.requestUrlIconDanger,
      errorHoverBg: colors.additional.requestUrlErrorHoverBg
    },
    dragbar: {
      border: colors.border,
      activeBorder: colors.additional.sidebarDragbar
    },
    responseSendIcon: colors.additional.requestSendIcon,
    responseStatus: colors.additional.requestStatusColor,
    responseOk: colors.success,
    responseError: colors.error,
    responsePending: colors.info,
    responseOverlayBg: colors.overlayBg,
    card: {
      bg: colors.surface,
      border: colors.borderLight,
      hr: colors.borderDivider
    },
    cardTable: {
      border: colors.border,
      table: {
        thead: {
          bg: colors.additional.tableHeadBg,
          color: colors.additional.tableHeadFgColor
        }
      }
    },
    graphqlDocsExplorer: {
      bg: colors.codeBg,
      color: colors.text
    }
  },

  collection: {
    environment: {
      settings: {
        bg: colors.surface,
        sidebar: {
          bg: colors.additional.collectionSettingsSidebarBg,
          borderRight: colors.transparent
        },
        item: {
          border: colors.brand,
          hoverBg: colors.additional.notificationHoverBg,
          active: {
            bg: colors.additional.notificationActiveBg,
            hoverBg: colors.additional.notificationActiveBg
          }
        },
        gridBorder: colors.borderLight
      }
    },

    sidebar: {
      bg: colors.additional.collectionSidebarBg
    }
  },

  notifications: {
    bg: colors.surface,
    list: {
      bg: colors.additional.notificationSidebarBg,
      borderRight: colors.transparent,
      borderBottom: colors.borderDark,
      hoverBg: colors.additional.notificationHoverBg,
      active: {
        border: colors.brand,
        bg: colors.additional.notificationActiveBg,
        hoverBg: colors.additional.notificationActiveBg
      }
    }
  },

  modal: {
    title: {
      color: colors.additional.modalTitleColor,
      bg: colors.additional.modalTitleBg
    },
    body: {
      color: colors.text,
      bg: colors.surface
    },
    input: {
      bg: colors.inputBg,
      border: colors.inputBorder,
      focusBorder: colors.inputFocusBorder
    },
    backdrop: {
      opacity: colors.additional.modalBackdropOpacity
    }
  },

  button: {
    secondary: {
      color: colors.buttonSecondaryColor,
      bg: colors.buttonSecondaryBg,
      border: colors.buttonSecondaryBorder,
      hoverBorder: colors.buttonSecondaryHoverBorder
    },
    close: {
      color: colors.textSecondary,
      bg: colors.surface,
      border: colors.surface
    },
    disabled: {
      color: colors.buttonDisabledColor,
      bg: colors.buttonDisabledBg,
      border: colors.buttonDisabledBorder
    },
    danger: {
      color: colors.white,
      bg: colors.danger,
      border: colors.danger
    }
  },

  tabs: {
    active: {
      color: colors.text,
      border: colors.accent
    },
    secondary: {
      active: {
        bg: colors.surface,
        color: colors.text
      },
      inactive: {
        bg: colors.surfaceAlt3,
        color: colors.additional.tabSecondaryInactiveColor
      }
    }
  },

  requestTabs: {
    color: colors.text,
    bg: colors.surfaceSubtle,
    bottomBorder: colors.border,
    icon: {
      color: colors.additional.requestTabIconColor,
      hoverColor: colors.additional.requestTabIconHoverColor,
      hoverBg: colors.additional.requestTabIconHoverBg
    },
    active: {
      bg: colors.activeBg
    },
    shortTab: {
      color: colors.additional.requestTabShortTabColor,
      bg: colors.surface,
      hoverColor: colors.additional.requestTabIconHoverColor,
      hoverBg: colors.additional.requestTabShortTabHoverBg
    }
  },

  codemirror: {
    bg: colors.codeBg,
    border: colors.codeBorder,
    placeholder: {
      color: colors.inputPlaceholder,
      opacity: 0.75
    },
    gutter: {
      bg: colors.codeGutter
    },
    variable: {
      valid: colors.textSuccess,
      invalid: colors.error,
      prompt: colors.additional.codemirrorPrompt,
      info: {
        color: colors.text,
        bg: colors.surface,
        boxShadow: colors.additional.codemirrorEditorBoxShadow,
        editorBg: colors.additional.codemirrorEditorBg,
        iconColor: colors.textSubtle,
        editorBorder: colors.border,
        editorFocusBorder: colors.textSubtle,
        border: colors.border
      }
    },
    searchLineHighlightCurrent: colors.codeHighlight
  },

  table: {
    border: colors.border,
    thead: {
      color: colors.additional.tableHeadColor
    },
    striped: colors.surfaceElevated,
    input: {
      color: colors.black
    }
  },

  plainGrid: {
    hoverBg: colors.borderLight
  },

  scrollbar: {
    color: colors.scrollbar
  },

  dragAndDrop: {
    border: colors.inputFocusBorder,
    borderStyle: '2px solid',
    hoverBg: colors.additional.dragDropHoverBg,
    transition: colors.additional.dragDropTransition
  },

  infoTip: {
    bg: colors.surface,
    border: colors.additional.infoTipBorder,
    boxShadow: colors.shadowMedium
  },

  statusBar: {
    border: colors.additional.statusBarBorder,
    color: colors.additional.statusBarColor
  },

  console: {
    bg: colors.surface,
    headerBg: colors.additional.consoleHeaderBg,
    contentBg: colors.surface,
    border: colors.borderDark,
    titleColor: colors.textSecondary,
    countColor: colors.textFaint,
    buttonColor: colors.additional.consoleButtonColor,
    buttonHoverBg: colors.additional.consoleButtonHoverBg,
    buttonHoverColor: colors.textSecondary,
    messageColor: colors.textSecondary,
    timestampColor: colors.textFaint,
    emptyColor: colors.textFaint,
    logHoverBg: colors.hoverBg,
    dropdownBg: colors.surface,
    dropdownHeaderBg: colors.additional.consoleHeaderBg,
    optionHoverBg: colors.additional.consoleHeaderBg,
    optionLabelColor: colors.textSecondary,
    optionCountColor: colors.textFaint,
    checkboxColor: colors.additional.consoleCheckbox,
    scrollbarThumb: colors.scrollbarThumb,
    scrollbarThumbHover: colors.scrollbarThumbHover
  },

  grpc: {
    tabNav: {
      container: {
        bg: colors.additional.grpcTabNavBg
      },
      button: {
        active: {
          bg: colors.surface,
          color: colors.black
        },
        inactive: {
          bg: colors.transparent,
          color: colors.additional.grpcTabNavInactiveColor
        }
      }
    },
    importPaths: {
      container: {
        bg: colors.surface
      },
      header: {
        text: colors.textMuted,
        button: {
          color: colors.textMuted,
          hoverColor: colors.text
        }
      },
      error: {
        bg: colors.transparent,
        text: colors.error,
        link: {
          color: colors.error,
          hoverColor: colors.additional.grpcErrorHoverColor
        }
      },
      item: {
        hoverBg: colors.hoverBgLight,
        checkbox: {
          color: colors.text
        },
        invalid: {
          opacity: 0.6,
          text: colors.error
        }
      },
      empty: {
        text: colors.textMuted
      },
      button: {
        bg: colors.buttonSecondaryBg,
        color: colors.buttonSecondaryColor,
        border: colors.buttonSecondaryBorder,
        hoverBorder: colors.buttonSecondaryHoverBorder
      }
    },
    protoFiles: {
      container: {
        bg: colors.surface
      },
      header: {
        text: colors.textMuted,
        button: {
          color: colors.textMuted,
          hoverColor: colors.text
        }
      },
      error: {
        bg: colors.transparent,
        text: colors.error,
        link: {
          color: colors.error,
          hoverColor: colors.additional.grpcErrorHoverColor
        }
      },
      item: {
        hoverBg: colors.hoverBgLight,
        selected: {
          bg: colors.accentSubtle,
          border: colors.accentBorder
        },
        text: colors.text,
        secondaryText: colors.textMuted,
        invalid: {
          opacity: 0.6,
          text: colors.error
        }
      },
      empty: {
        text: colors.textMuted
      },
      button: {
        bg: colors.buttonSecondaryBg,
        color: colors.buttonSecondaryColor,
        border: colors.buttonSecondaryBorder,
        hoverBorder: colors.buttonSecondaryHoverBorder
      }
    }
  },

  examples: {
    buttonColor: colors.accent,
    buttonText: colors.white,
    buttonIconColor: colors.black,
    border: colors.border,
    urlBar: {
      border: colors.border,
      bg: colors.additional.examplesUrlBarBg
    },
    table: {
      thead: {
        bg: colors.additional.examplesTableBg,
        color: colors.textSecondary
      }
    },
    checkbox: {
      color: colors.white
    }
  }
};

export default lightTheme;
