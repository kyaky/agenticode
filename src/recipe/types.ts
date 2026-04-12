// AGENTICODE: Recipe system types — inspired by Goose
// YAML-based portable workflow configurations that bundle instructions,
// extensions, parameters, and sub-recipes into shareable configs.

import z from "zod"

/** A parameter that can be templated into the recipe */
export const RecipeParameter = z.object({
  name: z.string(),
  description: z.string().optional(),
  default: z.string().optional(),
  required: z.boolean().default(true),
})
export type RecipeParameter = z.infer<typeof RecipeParameter>

/** A step in a recipe */
export const RecipeStep = z.object({
  name: z.string(),
  prompt: z.string(),
  agent: z.string().default("build"),
  /** Continue from previous step's context */
  continueFrom: z.boolean().default(false),
})
export type RecipeStep = z.infer<typeof RecipeStep>

/** A sub-recipe reference */
export const SubRecipe = z.object({
  path: z.string().describe("Path to sub-recipe YAML file"),
  parameters: z.record(z.string(), z.string()).optional(),
})
export type SubRecipe = z.infer<typeof SubRecipe>

/** Full recipe definition */
export const Recipe = z.object({
  name: z.string(),
  version: z.string().default("1"),
  description: z.string().optional(),
  /** Template parameters (substituted with {{ param_name }} syntax) */
  parameters: z.array(RecipeParameter).default([]),
  /** MCP servers to enable for this recipe */
  extensions: z.array(z.string()).default([]),
  /** Steps to execute in order */
  steps: z.array(RecipeStep),
  /** Sub-recipes to compose */
  subRecipes: z.array(SubRecipe).default([]),
  /** Retry configuration */
  retry: z
    .object({
      maxAttempts: z.number().default(1),
      onFailure: z.enum(["stop", "retry", "skip"]).default("stop"),
    })
    .default({ maxAttempts: 1, onFailure: "stop" }),
})
export type Recipe = z.infer<typeof Recipe>

/** Result of running a recipe */
export interface RecipeRunResult {
  recipeName: string
  success: boolean
  stepsCompleted: number
  totalSteps: number
  outputs: Array<{
    stepName: string
    status: "completed" | "failed" | "skipped"
    output?: string
    error?: string
    duration: number
  }>
  totalDuration: number
}
