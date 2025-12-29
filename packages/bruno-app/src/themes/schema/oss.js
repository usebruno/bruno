export const ossSchema = {
  type: 'object',
  properties: {
    mode: { type: 'string', description: 'Theme mode', enum: ['light', 'dark'] },
    brand: { type: 'string', description: 'Primary brand color' },
    text: { type: 'string', description: 'Default text color' },
    textLink: { type: 'string', description: 'Link text color' },
    bg: { type: 'string', description: 'Background color' },

    accents: {
      type: 'object',
      properties: {
        primary: { type: 'string', description: 'Primary accent color' }
      },
      required: ['primary'],
      additionalProperties: false
    },

    background: {
      type: 'object',
      properties: {
        base: { type: 'string', description: 'App canvas background' },
        mantle: { type: 'string', description: 'Sidebars background' },
        crust: { type: 'string', description: 'Panels background' },
        surface0: { type: 'string', description: 'Cards background' },
        surface1: { type: 'string', description: 'Raised elements background' },
        surface2: { type: 'string', description: 'Borders / dividers' }
      },
      required: ['base', 'mantle', 'crust', 'surface0', 'surface1', 'surface2'],
      additionalProperties: false
    },

    overlay: {
      type: 'object',
      properties: {
        overlay2: { type: 'string', description: 'Overlay level 2' },
        overlay1: { type: 'string', description: 'Overlay level 1' },
        overlay0: { type: 'string', description: 'Overlay level 0' }
      },
      required: ['overlay2', 'overlay1', 'overlay0'],
      additionalProperties: false
    },

    font: {
      type: 'object',
      properties: {
        size: {
          type: 'object',
          properties: {
            xs: { type: 'string', description: 'Extra small font size (11px)' },
            sm: { type: 'string', description: 'Small font size (12px)' },
            base: { type: 'string', description: 'Base font size (13px)' },
            md: { type: 'string', description: 'Medium font size (14px)' },
            lg: { type: 'string', description: 'Large font size (16px)' },
            xl: { type: 'string', description: 'Extra large font size (18px)' }
          },
          required: ['xs', 'sm', 'base', 'md', 'lg', 'xl'],
          additionalProperties: false
        }
      },
      required: ['size'],
      additionalProperties: false
    },

    shadow: {
      type: 'object',
      properties: {
        sm: { type: 'string', description: 'Small shadow' },
        md: { type: 'string', description: 'Medium shadow' },
        lg: { type: 'string', description: 'Large shadow' }
      },
      required: ['sm', 'md', 'lg'],
      additionalProperties: false
    },

    border: {
      type: 'object',
      properties: {
        radius: {
          type: 'object',
          properties: {
            sm: { type: 'string' },
            base: { type: 'string' },
            md: { type: 'string' },
            lg: { type: 'string' },
            xl: { type: 'string' }
          },
          required: ['sm', 'base', 'md', 'lg', 'xl'],
          additionalProperties: false
        },
        border2: { type: 'string' },
        border1: { type: 'string' },
        border0: { type: 'string' }
      },
      required: ['radius', 'border2', 'border1', 'border0'],
      additionalProperties: false
    },

    colors: {
      type: 'object',
      properties: {
        text: {
          type: 'object',
          properties: {
            white: { type: 'string' },
            green: { type: 'string' },
            danger: { type: 'string' },
            warning: { type: 'string' },
            muted: { type: 'string' },
            purple: { type: 'string' },
            yellow: { type: 'string' },
            subtext2: { type: 'string' },
            subtext1: { type: 'string' },
            subtext0: { type: 'string' }
          },
          required: ['white', 'green', 'danger', 'warning', 'muted', 'purple', 'yellow', 'subtext2', 'subtext1', 'subtext0'],
          additionalProperties: false
        },
        bg: {
          type: 'object',
          properties: {
            danger: { type: 'string' }
          },
          required: ['danger'],
          additionalProperties: false
        },
        accent: { type: 'string' }
      },
      required: ['text', 'bg', 'accent'],
      additionalProperties: false
    },

    input: {
      type: 'object',
      properties: {
        bg: { type: 'string' },
        border: { type: 'string' },
        focusBorder: { type: 'string' },
        placeholder: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            opacity: { type: 'number' }
          },
          required: ['color', 'opacity'],
          additionalProperties: false
        }
      },
      required: ['bg', 'border', 'focusBorder', 'placeholder'],
      additionalProperties: false
    },

    sidebar: {
      type: 'object',
      properties: {
        color: { type: 'string' },
        muted: { type: 'string' },
        bg: { type: 'string' },
        dragbar: {
          type: 'object',
          properties: {
            border: { type: 'string' },
            activeBorder: { type: 'string' }
          },
          required: ['border', 'activeBorder'],
          additionalProperties: false
        },
        collection: {
          type: 'object',
          properties: {
            item: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                hoverBg: { type: 'string' },
                focusBorder: { type: 'string' },
                indentBorder: { type: 'string' },
                active: {
                  type: 'object',
                  properties: {
                    indentBorder: { type: 'string' }
                  },
                  required: ['indentBorder'],
                  additionalProperties: false
                },
                example: {
                  type: 'object',
                  properties: {
                    iconColor: { type: 'string' }
                  },
                  required: ['iconColor'],
                  additionalProperties: false
                }
              },
              required: ['bg', 'hoverBg', 'focusBorder', 'indentBorder', 'active', 'example'],
              additionalProperties: false
            }
          },
          required: ['item'],
          additionalProperties: false
        },
        dropdownIcon: {
          type: 'object',
          properties: {
            color: { type: 'string' }
          },
          required: ['color'],
          additionalProperties: false
        }
      },
      required: ['color', 'muted', 'bg', 'dragbar', 'collection', 'dropdownIcon'],
      additionalProperties: false
    },

    dropdown: {
      type: 'object',
      properties: {
        color: { type: 'string' },
        iconColor: { type: 'string' },
        bg: { type: 'string' },
        hoverBg: { type: 'string' },
        shadow: { type: 'string', description: 'Box shadow. Use "none" for no shadow.' },
        separator: { type: 'string' },
        selectedColor: { type: 'string' },
        mutedText: { type: 'string' },
        border: { type: 'string', description: 'Border color. Use "none" for no border.' }
      },
      required: ['color', 'iconColor', 'bg', 'hoverBg', 'shadow', 'separator', 'selectedColor', 'mutedText', 'border'],
      additionalProperties: false
    },

    workspace: {
      type: 'object',
      properties: {
        accent: { type: 'string' },
        border: { type: 'string' },
        button: {
          type: 'object',
          properties: {
            bg: { type: 'string' }
          },
          required: ['bg'],
          additionalProperties: false
        }
      },
      required: ['accent', 'border', 'button'],
      additionalProperties: false
    },

    request: {
      type: 'object',
      properties: {
        methods: {
          type: 'object',
          properties: {
            get: { type: 'string' },
            post: { type: 'string' },
            put: { type: 'string' },
            delete: { type: 'string' },
            patch: { type: 'string' },
            options: { type: 'string' },
            head: { type: 'string' }
          },
          required: ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'],
          additionalProperties: false
        },
        grpc: { type: 'string' },
        ws: { type: 'string' },
        gql: { type: 'string' }
      },
      required: ['methods', 'grpc', 'ws', 'gql'],
      additionalProperties: false
    },

    requestTabPanel: {
      type: 'object',
      properties: {
        url: {
          type: 'object',
          properties: {
            bg: { type: 'string' },
            icon: { type: 'string' },
            iconDanger: { type: 'string' },
            border: { type: 'string' }
          },
          required: ['bg', 'icon', 'iconDanger', 'border'],
          additionalProperties: false
        },
        dragbar: {
          type: 'object',
          properties: {
            border: { type: 'string' },
            activeBorder: { type: 'string' }
          },
          required: ['border', 'activeBorder'],
          additionalProperties: false
        },
        responseStatus: { type: 'string' },
        responseOk: { type: 'string' },
        responseError: { type: 'string' },
        responsePending: { type: 'string' },
        responseOverlayBg: { type: 'string' },
        card: {
          type: 'object',
          properties: {
            bg: { type: 'string' },
            border: { type: 'string' },
            hr: { type: 'string' }
          },
          required: ['bg', 'border', 'hr'],
          additionalProperties: false
        },
        graphqlDocsExplorer: {
          type: 'object',
          properties: {
            bg: { type: 'string' },
            color: { type: 'string' }
          },
          required: ['bg', 'color'],
          additionalProperties: false
        }
      },
      required: ['url', 'dragbar', 'responseStatus', 'responseOk', 'responseError', 'responsePending', 'responseOverlayBg', 'card', 'graphqlDocsExplorer'],
      additionalProperties: false
    },

    notifications: {
      type: 'object',
      properties: {
        bg: { type: 'string' },
        list: {
          type: 'object',
          properties: {
            bg: { type: 'string' },
            borderRight: { type: 'string' },
            borderBottom: { type: 'string' },
            hoverBg: { type: 'string' },
            active: {
              type: 'object',
              properties: {
                border: { type: 'string' },
                bg: { type: 'string' },
                hoverBg: { type: 'string' }
              },
              required: ['border', 'bg', 'hoverBg'],
              additionalProperties: false
            }
          },
          required: ['bg', 'borderRight', 'borderBottom', 'hoverBg', 'active'],
          additionalProperties: false
        }
      },
      required: ['bg', 'list'],
      additionalProperties: false
    },

    modal: {
      type: 'object',
      properties: {
        title: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            bg: { type: 'string' }
          },
          required: ['color', 'bg'],
          additionalProperties: false
        },
        body: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            bg: { type: 'string' }
          },
          required: ['color', 'bg'],
          additionalProperties: false
        },
        input: {
          type: 'object',
          properties: {
            bg: { type: 'string' },
            border: { type: 'string' },
            focusBorder: { type: 'string' }
          },
          required: ['bg', 'border', 'focusBorder'],
          additionalProperties: false
        },
        backdrop: {
          type: 'object',
          properties: {
            opacity: { type: 'number' }
          },
          required: ['opacity'],
          additionalProperties: false
        }
      },
      required: ['title', 'body', 'input', 'backdrop'],
      additionalProperties: false
    },

    button: {
      type: 'object',
      properties: {
        secondary: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            bg: { type: 'string' },
            border: { type: 'string' },
            hoverBorder: { type: 'string' }
          },
          required: ['color', 'bg', 'border', 'hoverBorder'],
          additionalProperties: false
        },
        close: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            bg: { type: 'string' },
            border: { type: 'string' },
            hoverBorder: { type: 'string' }
          },
          required: ['color', 'bg', 'border', 'hoverBorder'],
          additionalProperties: false
        },
        disabled: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            bg: { type: 'string' },
            border: { type: 'string' }
          },
          required: ['color', 'bg', 'border'],
          additionalProperties: false
        },
        danger: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            bg: { type: 'string' },
            border: { type: 'string' }
          },
          required: ['color', 'bg', 'border'],
          additionalProperties: false
        }
      },
      required: ['secondary', 'close', 'disabled', 'danger'],
      additionalProperties: false
    },

    button2: {
      type: 'object',
      properties: {
        color: {
          type: 'object',
          properties: {
            primary: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                text: { type: 'string' },
                border: { type: 'string' }
              },
              required: ['bg', 'text', 'border'],
              additionalProperties: false
            },
            secondary: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                text: { type: 'string' },
                border: { type: 'string' }
              },
              required: ['bg', 'text', 'border'],
              additionalProperties: false
            },
            success: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                text: { type: 'string' },
                border: { type: 'string' }
              },
              required: ['bg', 'text', 'border'],
              additionalProperties: false
            },
            warning: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                text: { type: 'string' },
                border: { type: 'string' }
              },
              required: ['bg', 'text', 'border'],
              additionalProperties: false
            },
            danger: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                text: { type: 'string' },
                border: { type: 'string' }
              },
              required: ['bg', 'text', 'border'],
              additionalProperties: false
            }
          },
          required: ['primary', 'secondary', 'success', 'warning', 'danger'],
          additionalProperties: false
        }
      },
      required: ['color'],
      additionalProperties: false
    },

    tabs: {
      type: 'object',
      properties: {
        marginRight: { type: 'string' },
        active: {
          type: 'object',
          properties: {
            fontWeight: { type: 'number' },
            color: { type: 'string' },
            border: { type: 'string' }
          },
          required: ['fontWeight', 'color', 'border'],
          additionalProperties: false
        },
        secondary: {
          type: 'object',
          properties: {
            active: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                color: { type: 'string' }
              },
              required: ['bg', 'color'],
              additionalProperties: false
            },
            inactive: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                color: { type: 'string' }
              },
              required: ['bg', 'color'],
              additionalProperties: false
            }
          },
          required: ['active', 'inactive'],
          additionalProperties: false
        }
      },
      required: ['marginRight', 'active', 'secondary'],
      additionalProperties: false
    },

    requestTabs: {
      type: 'object',
      properties: {
        color: { type: 'string' },
        bg: { type: 'string' },
        bottomBorder: { type: 'string' },
        icon: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            hoverColor: { type: 'string' },
            hoverBg: { type: 'string' }
          },
          required: ['color', 'hoverColor', 'hoverBg'],
          additionalProperties: false
        },
        example: {
          type: 'object',
          properties: {
            iconColor: { type: 'string' }
          },
          required: ['iconColor'],
          additionalProperties: false
        },
        shortTab: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            bg: { type: 'string' },
            hoverColor: { type: 'string' },
            hoverBg: { type: 'string' }
          },
          required: ['color', 'bg', 'hoverColor', 'hoverBg'],
          additionalProperties: false
        }
      },
      required: ['color', 'bg', 'bottomBorder', 'icon', 'example', 'shortTab'],
      additionalProperties: false
    },

    codemirror: {
      type: 'object',
      properties: {
        bg: { type: 'string' },
        border: { type: 'string' },
        placeholder: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            opacity: { type: 'number' }
          },
          required: ['color', 'opacity'],
          additionalProperties: false
        },
        gutter: {
          type: 'object',
          properties: {
            bg: { type: 'string' }
          },
          required: ['bg'],
          additionalProperties: false
        },
        variable: {
          type: 'object',
          properties: {
            valid: { type: 'string' },
            invalid: { type: 'string' },
            prompt: { type: 'string' },
            info: {
              type: 'object',
              properties: {
                color: { type: 'string' },
                bg: { type: 'string' },
                boxShadow: { type: 'string' },
                editorBg: { type: 'string' },
                iconColor: { type: 'string' },
                editorBorder: { type: 'string' },
                editorFocusBorder: { type: 'string' },
                editableDisplayHoverBg: { type: 'string' },
                border: { type: 'string' }
              },
              required: ['color', 'bg', 'boxShadow', 'editorBg', 'iconColor', 'editorBorder', 'editorFocusBorder', 'editableDisplayHoverBg', 'border'],
              additionalProperties: false
            }
          },
          required: ['valid', 'invalid', 'prompt', 'info'],
          additionalProperties: false
        },
        tokens: {
          type: 'object',
          properties: {
            definition: { type: 'string' },
            property: { type: 'string' },
            string: { type: 'string' },
            number: { type: 'string' },
            atom: { type: 'string' },
            variable: { type: 'string' },
            keyword: { type: 'string' },
            comment: { type: 'string' },
            operator: { type: 'string' }
          },
          required: ['definition', 'property', 'string', 'number', 'atom', 'variable', 'keyword', 'comment', 'operator'],
          additionalProperties: false
        },
        searchLineHighlightCurrent: { type: 'string' },
        searchMatch: { type: 'string' },
        searchMatchActive: { type: 'string' }
      },
      required: ['bg', 'border', 'placeholder', 'gutter', 'variable', 'tokens', 'searchLineHighlightCurrent', 'searchMatch', 'searchMatchActive'],
      additionalProperties: false
    },

    table: {
      type: 'object',
      properties: {
        border: { type: 'string' },
        thead: {
          type: 'object',
          properties: {
            color: { type: 'string' }
          },
          required: ['color'],
          additionalProperties: false
        },
        striped: { type: 'string' },
        input: {
          type: 'object',
          properties: {
            color: { type: 'string' }
          },
          required: ['color'],
          additionalProperties: false
        }
      },
      required: ['border', 'thead', 'striped', 'input'],
      additionalProperties: false
    },

    plainGrid: {
      type: 'object',
      properties: {
        hoverBg: { type: 'string' }
      },
      required: ['hoverBg'],
      additionalProperties: false
    },

    scrollbar: {
      type: 'object',
      properties: {
        color: { type: 'string' }
      },
      required: ['color'],
      additionalProperties: false
    },

    dragAndDrop: {
      type: 'object',
      properties: {
        border: { type: 'string' },
        borderStyle: { type: 'string' },
        hoverBg: { type: 'string' },
        transition: { type: 'string' }
      },
      required: ['border', 'borderStyle', 'hoverBg', 'transition'],
      additionalProperties: false
    },

    infoTip: {
      type: 'object',
      properties: {
        bg: { type: 'string' },
        border: { type: 'string' },
        boxShadow: { type: 'string' }
      },
      required: ['bg', 'border', 'boxShadow'],
      additionalProperties: false
    },

    statusBar: {
      type: 'object',
      properties: {
        border: { type: 'string' },
        color: { type: 'string' }
      },
      required: ['border', 'color'],
      additionalProperties: false
    },

    console: {
      type: 'object',
      properties: {
        bg: { type: 'string' },
        headerBg: { type: 'string' },
        contentBg: { type: 'string' },
        border: { type: 'string' },
        titleColor: { type: 'string' },
        countColor: { type: 'string' },
        buttonColor: { type: 'string' },
        buttonHoverBg: { type: 'string' },
        buttonHoverColor: { type: 'string' },
        messageColor: { type: 'string' },
        timestampColor: { type: 'string' },
        emptyColor: { type: 'string' },
        logHoverBg: { type: 'string' },
        resizeHandleHover: { type: 'string' },
        resizeHandleActive: { type: 'string' },
        dropdownBg: { type: 'string' },
        dropdownHeaderBg: { type: 'string' },
        optionHoverBg: { type: 'string' },
        optionLabelColor: { type: 'string' },
        optionCountColor: { type: 'string' },
        checkboxColor: { type: 'string' },
        scrollbarTrack: { type: 'string' },
        scrollbarThumb: { type: 'string' },
        scrollbarThumbHover: { type: 'string' }
      },
      required: ['bg', 'headerBg', 'contentBg', 'border', 'titleColor', 'countColor', 'buttonColor', 'buttonHoverBg', 'buttonHoverColor', 'messageColor', 'timestampColor', 'emptyColor', 'logHoverBg', 'resizeHandleHover', 'resizeHandleActive', 'dropdownBg', 'dropdownHeaderBg', 'optionHoverBg', 'optionLabelColor', 'optionCountColor', 'checkboxColor', 'scrollbarTrack', 'scrollbarThumb', 'scrollbarThumbHover'],
      additionalProperties: false
    },

    grpc: {
      type: 'object',
      properties: {
        tabNav: {
          type: 'object',
          properties: {
            container: {
              type: 'object',
              properties: {
                bg: { type: 'string' }
              },
              required: ['bg'],
              additionalProperties: false
            },
            button: {
              type: 'object',
              properties: {
                active: {
                  type: 'object',
                  properties: {
                    bg: { type: 'string' },
                    color: { type: 'string' }
                  },
                  required: ['bg', 'color'],
                  additionalProperties: false
                },
                inactive: {
                  type: 'object',
                  properties: {
                    bg: { type: 'string' },
                    color: { type: 'string' }
                  },
                  required: ['bg', 'color'],
                  additionalProperties: false
                }
              },
              required: ['active', 'inactive'],
              additionalProperties: false
            }
          },
          required: ['container', 'button'],
          additionalProperties: false
        },
        importPaths: {
          type: 'object',
          properties: {
            header: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                button: {
                  type: 'object',
                  properties: {
                    color: { type: 'string' },
                    hoverColor: { type: 'string' }
                  },
                  required: ['color', 'hoverColor'],
                  additionalProperties: false
                }
              },
              required: ['text', 'button'],
              additionalProperties: false
            },
            error: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                text: { type: 'string' },
                link: {
                  type: 'object',
                  properties: {
                    color: { type: 'string' },
                    hoverColor: { type: 'string' }
                  },
                  required: ['color', 'hoverColor'],
                  additionalProperties: false
                }
              },
              required: ['bg', 'text', 'link'],
              additionalProperties: false
            },
            item: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                hoverBg: { type: 'string' },
                text: { type: 'string' },
                icon: { type: 'string' },
                checkbox: {
                  type: 'object',
                  properties: {
                    color: { type: 'string' }
                  },
                  required: ['color'],
                  additionalProperties: false
                },
                invalid: {
                  type: 'object',
                  properties: {
                    opacity: { type: 'number' },
                    text: { type: 'string' }
                  },
                  required: ['opacity', 'text'],
                  additionalProperties: false
                }
              },
              required: ['bg', 'hoverBg', 'text', 'icon', 'checkbox', 'invalid'],
              additionalProperties: false
            },
            empty: {
              type: 'object',
              properties: {
                text: { type: 'string' }
              },
              required: ['text'],
              additionalProperties: false
            },
            button: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                color: { type: 'string' },
                border: { type: 'string' },
                hoverBorder: { type: 'string' }
              },
              required: ['bg', 'color', 'border', 'hoverBorder'],
              additionalProperties: false
            }
          },
          required: ['header', 'error', 'item', 'empty', 'button'],
          additionalProperties: false
        },
        protoFiles: {
          type: 'object',
          properties: {
            header: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                button: {
                  type: 'object',
                  properties: {
                    color: { type: 'string' },
                    hoverColor: { type: 'string' }
                  },
                  required: ['color', 'hoverColor'],
                  additionalProperties: false
                }
              },
              required: ['text', 'button'],
              additionalProperties: false
            },
            error: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                text: { type: 'string' },
                link: {
                  type: 'object',
                  properties: {
                    color: { type: 'string' },
                    hoverColor: { type: 'string' }
                  },
                  required: ['color', 'hoverColor'],
                  additionalProperties: false
                }
              },
              required: ['bg', 'text', 'link'],
              additionalProperties: false
            },
            item: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                hoverBg: { type: 'string' },
                selected: {
                  type: 'object',
                  properties: {
                    bg: { type: 'string' },
                    border: { type: 'string' }
                  },
                  required: ['bg', 'border'],
                  additionalProperties: false
                },
                text: { type: 'string' },
                secondaryText: { type: 'string' },
                icon: { type: 'string' },
                invalid: {
                  type: 'object',
                  properties: {
                    opacity: { type: 'number' },
                    text: { type: 'string' }
                  },
                  required: ['opacity', 'text'],
                  additionalProperties: false
                }
              },
              required: ['bg', 'hoverBg', 'selected', 'text', 'secondaryText', 'icon', 'invalid'],
              additionalProperties: false
            },
            empty: {
              type: 'object',
              properties: {
                text: { type: 'string' }
              },
              required: ['text'],
              additionalProperties: false
            },
            button: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                color: { type: 'string' },
                border: { type: 'string' },
                hoverBorder: { type: 'string' }
              },
              required: ['bg', 'color', 'border', 'hoverBorder'],
              additionalProperties: false
            }
          },
          required: ['header', 'error', 'item', 'empty', 'button'],
          additionalProperties: false
        }
      },
      required: ['tabNav', 'importPaths', 'protoFiles'],
      additionalProperties: false
    },

    deprecationWarning: {
      type: 'object',
      properties: {
        bg: { type: 'string' },
        border: { type: 'string' },
        icon: { type: 'string' },
        text: { type: 'string' }
      },
      required: ['bg', 'border', 'icon', 'text'],
      additionalProperties: false
    },

    examples: {
      type: 'object',
      properties: {
        buttonBg: { type: 'string' },
        buttonColor: { type: 'string' },
        buttonText: { type: 'string' },
        buttonIconColor: { type: 'string' },
        border: { type: 'string' },
        urlBar: {
          type: 'object',
          properties: {
            border: { type: 'string' },
            bg: { type: 'string' }
          },
          required: ['border', 'bg'],
          additionalProperties: false
        },
        table: {
          type: 'object',
          properties: {
            thead: {
              type: 'object',
              properties: {
                bg: { type: 'string' },
                color: { type: 'string' }
              },
              required: ['bg', 'color'],
              additionalProperties: false
            }
          },
          required: ['thead'],
          additionalProperties: false
        },
        checkbox: {
          type: 'object',
          properties: {
            color: { type: 'string' }
          },
          required: ['color'],
          additionalProperties: false
        }
      },
      required: ['buttonBg', 'buttonColor', 'buttonText', 'buttonIconColor', 'border', 'urlBar', 'table', 'checkbox'],
      additionalProperties: false
    },

    app: {
      type: 'object',
      properties: {
        collection: {
          type: 'object',
          properties: {
            toolbar: {
              type: 'object',
              properties: {
                environmentSelector: {
                  type: 'object',
                  properties: {
                    bg: { type: 'string' },
                    border: { type: 'string' },
                    icon: { type: 'string' },
                    text: { type: 'string' },
                    caret: { type: 'string' },
                    separator: { type: 'string' },
                    hoverBg: { type: 'string' },
                    hoverBorder: { type: 'string' },
                    noEnvironment: {
                      type: 'object',
                      properties: {
                        text: { type: 'string' },
                        bg: { type: 'string' },
                        border: { type: 'string' },
                        hoverBg: { type: 'string' },
                        hoverBorder: { type: 'string' }
                      },
                      required: ['text', 'bg', 'border', 'hoverBg', 'hoverBorder'],
                      additionalProperties: false
                    }
                  },
                  required: ['bg', 'border', 'icon', 'text', 'caret', 'separator', 'hoverBg', 'hoverBorder', 'noEnvironment'],
                  additionalProperties: false
                },
                sandboxMode: {
                  type: 'object',
                  properties: {
                    safeMode: {
                      type: 'object',
                      properties: {
                        bg: { type: 'string' },
                        color: { type: 'string' }
                      },
                      required: ['bg', 'color'],
                      additionalProperties: false
                    },
                    developerMode: {
                      type: 'object',
                      properties: {
                        bg: { type: 'string' },
                        color: { type: 'string' }
                      },
                      required: ['bg', 'color'],
                      additionalProperties: false
                    }
                  },
                  required: ['safeMode', 'developerMode'],
                  additionalProperties: false
                }
              },
              required: ['environmentSelector', 'sandboxMode'],
              additionalProperties: false
            }
          },
          required: ['toolbar'],
          additionalProperties: false
        }
      },
      required: ['collection'],
      additionalProperties: false
    }
  },
  required: [
    'mode', 'brand', 'text', 'textLink', 'bg', 'accents', 'background', 'overlay', 'font', 'shadow', 'border', 'colors', 'input',
    'sidebar', 'dropdown', 'workspace', 'request',
    'requestTabPanel', 'notifications', 'modal', 'button', 'button2', 'tabs',
    'requestTabs', 'codemirror', 'table', 'plainGrid', 'scrollbar', 'dragAndDrop',
    'infoTip', 'statusBar', 'console', 'grpc', 'deprecationWarning', 'examples', 'app'
  ],
  additionalProperties: false
};
