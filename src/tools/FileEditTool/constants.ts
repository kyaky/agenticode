// In its own file to avoid circular dependencies
export const FILE_EDIT_TOOL_NAME = 'Edit'

// Permission pattern for granting session-level access to the project's .agenticode/ folder
export const AGENTICODE_FOLDER_PERMISSION_PATTERN = '/.agenticode/**'

// Permission pattern for granting session-level access to the global ~/.agenticode/ folder
export const GLOBAL_AGENTICODE_FOLDER_PERMISSION_PATTERN = '~/.agenticode/**'

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
