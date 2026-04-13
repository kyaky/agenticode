// Global MACRO — injected at build time, defined here for dev/compile
;(globalThis as any).MACRO = {
  VERSION: '1.0.0',
  BUILD_TIME: new Date().toISOString(),
  PACKAGE_URL: 'agenticode',
  NATIVE_PACKAGE_URL: '',
  FEEDBACK_CHANNEL: 'https://github.com/kyaky/agenticode/issues',
  ISSUES_EXPLAINER: 'Report issues at https://github.com/kyaky/agenticode/issues',
  VERSION_CHANGELOG: '',
}
