const lightMainColors = {
  // Primary Brand Colors
  brand: '#546de5',
  brandHover: '#4a5fc9',

  // Status Colors
  success: '#047857',
  warning: '#d97706',
  error: '#b91c1c',
  info: '#1663bb',
  danger: '#dc3545',

  // Accent Colors
  accent: '#d97706',
  accentSubtle: 'rgba(217, 119, 6, 0.2)',
  accentBorder: '#d97706',

  // Surface Colors (backgrounds)
  surface: '#ffffff',
  surfaceElevated: '#f3f3f3',
  surfaceHigher: '#efefef',
  surfaceSubtle: '#f7f7f7',
  surfaceAlt: '#e7e7e7',
  surfaceAlt2: '#e1e1e1',
  surfaceAlt3: '#ececee',
  surfaceAlt4: '#f4f4f4',

  // Border Colors
  border: '#efefef',
  borderLight: '#f4f4f4',
  borderMid: '#e1e1e1',
  borderDark: '#d3d3d3',
  borderSubtle: '#e7e7e7',
  borderFocus: '#8b8b8b',
  borderDivider: '#f4f4f4',

  // Text Colors
  text: '#343434',
  textSecondary: '#212529',
  textMuted: '#838383',
  textSubtle: '#989898',
  textFaint: '#6c757d',
  textLink: '#1663bb',
  textDanger: '#b91c1c',
  textSuccess: '#047857',
  textWarning: '#d97706',
  textDisabled: '#9f9f9f',

  // Interactive Colors
  interactive: '#1663bb',
  interactiveHover: '#1455a3',
  interactiveActive: '#0d4a8b',

  // Input Colors
  inputBg: '#ffffff',
  inputBorder: '#cccccc',
  inputFocusBorder: '#8b8b8b',
  inputPlaceholder: '#a2a2a2',

  // Hover & Focus States
  hoverBg: 'rgba(0, 0, 0, 0.03)',
  hoverBgLight: 'rgba(0, 0, 0, 0.05)',
  hoverBgMedium: '#e9ecef',
  activeBg: '#e7e7e7',

  // Code Editor Colors
  codeBg: '#ffffff',
  codeGutter: '#f3f3f3',
  codeBorder: '#efefef',
  codeHighlight: 'rgba(120,120,120,0.10)',

  // Request Method Colors
  methodGet: 'rgb(5, 150, 105)',
  methodPost: '#8e44ad',
  methodPut: '#ca7811',
  methodPatch: '#ca7811',
  methodDelete: 'rgb(185, 28, 28)',
  methodOptions: '#ca7811',
  methodHead: '#ca7811',

  // Request Type Colors
  requestGrpc: '#6366f1',
  requestWs: '#f59e0b',
  requestGql: '#e535ab',

  // Base Colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Opacity Variants
  whiteAlpha03: 'rgba(255, 255, 255, 0.03)',
  whiteAlpha05: 'rgba(255, 255, 255, 0.05)',
  whiteAlpha10: 'rgba(255, 255, 255, 0.1)',
  blackAlpha20: 'rgba(0, 0, 0, 0.2)',
  overlayBg: 'rgba(255, 255, 255, 0.6)',

  // Shadow
  shadowLight: 'rgb(50 50 93 / 25%) 0px 6px 12px -2px, rgb(0 0 0 / 30%) 0px 3px 7px -3px',
  shadowMedium: '0 4px 12px rgba(0, 0, 0, 0.15)',

  // Scrollbar
  scrollbar: 'rgb(152 151 149)',
  scrollbarThumb: '#ced4da',
  scrollbarThumbHover: '#adb5bd',

  // Button Colors
  buttonSecondaryBg: '#e2e6ea',
  buttonSecondaryColor: '#212529',
  buttonSecondaryBorder: '#dae0e5',
  buttonSecondaryHoverBorder: '#696969',
  buttonDisabledBg: '#efefef',
  buttonDisabledColor: '#9f9f9f',
  buttonDisabledBorder: 'rgb(234, 234, 234)',

  // Specific component colors that don't fit semantic categories
  additional: {
    // Modal
    modalTitleColor: 'rgb(86 86 86)',
    modalTitleBg: '#f1f1f1',
    modalBackdropOpacity: 0.4,

    // Dropdown
    dropdownColor: 'rgb(48 48 48)',
    dropdownIconColor: 'rgb(75, 85, 99)',
    dropdownHoverBg: '#e9ecef',
    dropdownMutedText: '#9b9b9b',
    dropdownSecondaryText: '#6b7280',

    // Sidebar
    sidebarColor: '#4b5563',
    sidebarDragbar: 'rgb(200, 200, 200)',
    sidebarSearchBorder: '1px solid rgb(211 211 211)',
    sidebarItemHoverBg: '#e7e7e7',
    sidebarIndentBorder: 'solid 1px #e1e1e1',
    sidebarIndentBorderActive: 'solid 1px #d0d0d0',
    sidebarDropdownIconColor: 'rgb(110 110 110)',

    // Tab specific
    tabSecondaryInactiveColor: '#989898',

    // Request tabs
    requestTabIconColor: '#9f9f9f',
    requestTabIconHoverColor: 'rgb(76 76 76)',
    requestTabIconHoverBg: 'rgb(234, 234, 234)',
    requestTabShortTabColor: 'rgb(117 117 117)',
    requestTabShortTabHoverBg: '#eaeaea',
    requestSendIcon: 'rgb(209, 213, 219)',
    requestStatusColor: 'rgb(117 117 117)',

    // Grpc
    grpcTabNavBg: '#f5f5f5',
    grpcTabNavInactiveColor: '#525252',
    grpcErrorHoverColor: '#dc2626',

    // Console
    consoleHeaderBg: '#f8f9fa',
    consoleButtonColor: '#495057',
    consoleButtonHoverBg: '#e9ecef',
    consoleCheckbox: '#0d6efd',
    consoleScrollbarTrack: '#f8f9fa',

    // Table
    tableHeadColor: '#616161',
    tableHeadBg: 'rgb(249, 250, 251)',
    tableHeadFgColor: 'rgb(75 85 99)',

    // Examples
    examplesTableBg: '#f8f9fa',
    examplesUrlBarBg: '#f5f5f5',

    // Notifications
    notificationSidebarBg: '#eaeaea',
    notificationHoverBg: '#e4e4e4',
    notificationActiveBg: '#dcdcdc',

    // Status bar
    statusBarBorder: '#e9e9e9',
    statusBarColor: 'rgb(100, 100, 100)',

    // Drag and drop
    dragDropHoverBg: 'rgba(139, 139, 139, 0.05)',
    dragDropTransition: 'all 0.1s ease',

    // Info tip
    infoTipBorder: '#e0e0e0',

    // Request specific
    requestUrlIcon: '#515151',
    requestUrlIconDanger: '#d91f11',
    requestUrlErrorHoverBg: '#fef2f2',

    // Deprecation
    deprecationBg: 'rgba(185, 28, 28, 0.1)',
    deprecationIcon: '#b91c1c',

    // Welcome
    welcomeHeading: '#737373',
    welcomeMuted: '#4b5563',

    // Collection
    collectionSidebarBg: '#eaeaea',
    collectionSettingsSidebarBg: '#eaeaea',

    // Codemirror
    codemirrorPrompt: '#186ade',
    codemirrorEditorBg: '#f7f7f7',
    codemirrorEditorBoxShadow: '0 1px 3px rgba(0, 0, 0, 0.45)'
  }
};

export default lightMainColors;
