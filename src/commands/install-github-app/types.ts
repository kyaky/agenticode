export interface Workflow { name: string; path: string; content: string }
export interface State { step: string; data: Record<string, unknown> }
export interface Warning { message: string; severity: 'low' | 'medium' | 'high' }
