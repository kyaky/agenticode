// Build-time macros — replaced by bundler in production, defined here for dev/compile
export const MACRO = {
  VERSION: '1.0.0',
  BUILD_TIME: new Date().toISOString(),
  PACKAGE_URL: 'agenticode',
  NATIVE_PACKAGE_URL: '',
  FEEDBACK_CHANNEL: 'https://github.com/kyaky/agenticode/issues',
  ISSUES_EXPLAINER: 'Report issues at https://github.com/kyaky/agenticode/issues',
  VERSION_CHANGELOG: '',
}
