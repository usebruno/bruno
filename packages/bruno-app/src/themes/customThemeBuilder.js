/**
 * Builds a complete theme object from custom theme colors
 * This function takes color tokens and creates the full theme structure
 */
const buildCustomTheme = (colors) => {
  return {
    // Core colors
    text: colors.text,
    textLink: colors.textLink,
    bg: colors.surfaceSubtle,

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
        opacity: 0.75
      }
    },

    variables: {
      runtime: {
        color: colors.white
      }
    },

    sidebar: {
      color: colors.textSecondary,
      muted: colors.textMuted,
      bg: colors.surface,
      dragbar: colors.additional.sidebarDragbar,

      badge: {
        bg: colors.surfaceElevated
      },

      search: {
        border: colors.additional.sidebarSearchBorder,
        bg: colors.surfaceElevated
      },

      collection: {
        item: {
          bg: colors.surfaceAlt2,
          hoverBg: colors.surfaceAlt,
          indentBorder: colors.additional.sidebarIndentBorder,
          active: {
            indentBorder: colors.additional.sidebarIndentBorderActive
          }
        }
      },

      dropdownIcon: {
        color: colors.textSecondary
      }
    },

    welcome: {
      heading: colors.additional.welcomeHeading,
      muted: colors.textMuted
    },

    dropdown: {
      color: colors.textSecondary,
      iconColor: colors.textSecondary,
      bg: colors.surfaceHigher,
      hoverBg: colors.additional.dropdownHoverBg,
      shadow: colors.shadowLight,
      separator: colors.borderLight,
      labelBg: colors.additional.dropdownLabelBg,
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
        icon: colors.textSecondary,
        iconDanger: colors.additional.requestUrlIconDanger,
        errorHoverBg: colors.additional.requestUrlErrorHoverBg
      },
      dragbar: {
        border: colors.borderLight,
        activeBorder: colors.borderFocus
      },
      responseSendIcon: colors.additional.requestSendIcon,
      responseStatus: colors.textSecondary,
      responseOk: colors.success,
      responseError: colors.error,
      responsePending: colors.info,
      responseOverlayBg: colors.overlayBg,

      card: {
        bg: colors.surface,
        border: colors.transparent,
        hr: colors.borderDivider
      },

      cardTable: {
        border: colors.border,
        table: {
          thead: {
            bg: colors.surfaceElevated,
            color: colors.textSecondary
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
          bg: colors.surfaceElevated,
          sidebar: {
            bg: colors.surfaceElevated,
            borderRight: colors.borderMid
          },
          item: {
            border: colors.textLink,
            hoverBg: colors.transparent,
            active: {
              bg: colors.transparent,
              hoverBg: colors.transparent
            }
          },
          gridBorder: colors.borderMid
        }
      }
    },

    notifications: {
      bg: colors.surfaceElevated,
      list: {
        bg: colors.surfaceElevated,
        borderRight: colors.borderMid,
        borderBottom: colors.borderDark,
        hoverBg: colors.additional.notificationHoverBg,
        active: {
          border: colors.textLink,
          bg: colors.borderMid,
          hoverBg: colors.borderMid
        }
      }
    },

    modal: {
      title: {
        color: colors.textSecondary,
        bg: colors.additional.modalTitleBg
      },
      body: {
        color: colors.textSecondary,
        bg: colors.surfaceHigher
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
        color: colors.textSecondary,
        bg: colors.buttonSecondaryBg,
        border: colors.buttonSecondaryBorder,
        hoverBorder: colors.buttonSecondaryHoverBorder
      },
      close: {
        color: colors.textSecondary,
        bg: colors.transparent,
        border: colors.transparent
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
        color: colors.textSecondary,
        border: colors.accent
      },
      secondary: {
        active: {
          bg: colors.additional.tabSecondaryActiveBg,
          color: colors.textSecondary
        },
        inactive: {
          bg: colors.additional.tabSecondaryInactiveBg,
          color: colors.textSecondary
        }
      }
    },

    requestTabs: {
      color: colors.textSecondary,
      bg: colors.surfaceAlt,
      bottomBorder: colors.borderLight,
      icon: {
        color: colors.additional.requestTabIconColor,
        hoverColor: colors.textSecondary,
        hoverBg: colors.codeBg
      },
      active: {
        bg: colors.surfaceElevated
      },
      shortTab: {
        color: colors.textSecondary,
        bg: colors.transparent,
        hoverColor: colors.textSecondary,
        hoverBg: colors.surfaceElevated
      }
    },

    codemirror: {
      bg: colors.codeBg,
      border: colors.codeBorder,
      placeholder: {
        color: colors.inputPlaceholder,
        opacity: 0.5
      },
      gutter: {
        bg: colors.codeGutter
      },
      variable: {
        valid: colors.textSuccess,
        invalid: colors.error,
        prompt: colors.interactive,
        info: {
          color: colors.white,
          bg: colors.surfaceElevated,
          boxShadow: colors.shadowLight,
          editorBg: colors.codeGutter,
          iconColor: colors.textSubtle,
          editorBorder: colors.surfaceElevated,
          editorFocusBorder: colors.textSecondary,
          border: colors.borderMid
        }
      },
      searchLineHighlightCurrent: colors.codeHighlight
    },

    table: {
      border: colors.border,
      thead: {
        color: colors.additional.tableHeadColor
      },
      striped: colors.surfaceAlt,
      input: {
        color: colors.textSecondary
      }
    },

    plainGrid: {
      hoverBg: colors.surfaceElevated
    },

    scrollbar: {
      color: colors.scrollbar
    },

    dragAndDrop: {
      border: colors.additional.dragDropBorder,
      borderStyle: '2px solid',
      hoverBg: colors.additional.dragDropHoverBg,
      transition: colors.additional.dragDropTransition
    },

    infoTip: {
      bg: colors.additional.infoTipBg,
      border: colors.border,
      boxShadow: colors.shadowMedium
    },

    statusBar: {
      border: colors.additional.statusBarBorder,
      color: colors.additional.statusBarColor
    },

    console: {
      bg: colors.codeBg,
      headerBg: colors.surfaceHigher,
      contentBg: colors.codeBg,
      border: colors.borderSubtle,
      titleColor: colors.textSecondary,
      countColor: colors.textFaint,
      buttonColor: colors.textSecondary,
      buttonHoverBg: colors.whiteAlpha10,
      buttonHoverColor: colors.white,
      messageColor: colors.textSecondary,
      timestampColor: colors.textFaint,
      emptyColor: colors.textFaint,
      logHoverBg: colors.whiteAlpha05,
      dropdownBg: colors.surfaceHigher,
      dropdownHeaderBg: colors.borderSubtle,
      optionHoverBg: colors.whiteAlpha05,
      optionLabelColor: colors.textSecondary,
      optionCountColor: colors.textFaint,
      checkboxColor: colors.additional.consoleCheckbox,
      scrollbarThumb: colors.scrollbarThumb,
      scrollbarThumbHover: colors.scrollbarThumbHover
    },

    grpc: {
      tabNav: {
        container: {
          bg: colors.codeGutter
        },
        button: {
          active: {
            bg: colors.additional.grpcTabNavActiveBg,
            color: colors.white
          },
          inactive: {
            bg: colors.transparent,
            color: colors.additional.grpcTabNavInactiveColor
          }
        }
      },
      importPaths: {
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
          hoverBg: colors.whiteAlpha05,
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
          color: colors.text,
          border: colors.buttonSecondaryBorder,
          hoverBorder: colors.buttonSecondaryHoverBorder
        }
      },
      protoFiles: {
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
          hoverBg: colors.whiteAlpha05,
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
          color: colors.text,
          border: colors.buttonSecondaryBorder,
          hoverBorder: colors.buttonSecondaryHoverBorder
        }
      }
    },

    deprecationWarning: {
      bg: colors.additional.deprecationBg,
      border: colors.additional.deprecationBg,
      icon: colors.additional.deprecationIcon,
      text: colors.additional.deprecationText
    },

    examples: {
      buttonColor: colors.accent,
      buttonText: colors.white,
      buttonIconColor: colors.white,
      border: colors.borderLight,
      urlBar: {
        border: colors.surfaceElevated,
        bg: colors.additional.examplesTableBg
      },
      table: {
        thead: {
          bg: colors.additional.examplesTableBg,
          color: colors.additional.examplesTableColor
        }
      },
      checkbox: {
        color: colors.additional.examplesCheckboxColor
      }
    }
  };
};

export default buildCustomTheme;
