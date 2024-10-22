import { BaseCommand } from '@adonisjs/ace'

type AskString = (question: string, defaultValue?: string, hint?: string) => Promise<string>
type AskBoolean = (question: string, defaultValue?: boolean, hint?: string) => Promise<boolean>

type AskChoice = (
  question: string,
  options: string[],
  defaultValue?: string,
  hint?: string
) => Promise<string>

type AskMultiple = (
  question: string,
  options: string[],
  defaultValue?: string[],
  hint?: string
) => Promise<string[]>

type Step<T> = {
  key: keyof T
  when?: (state: T) => Promise<boolean> | boolean
  question: string
  hint?: string
} & (
  | { type: 'string'; defaultValue?: string }
  | { type: 'boolean'; defaultValue?: boolean }
  | { type: 'choice'; options: string[]; defaultValue?: string }
  | { type: 'multiple'; options: string[]; defaultValue?: string[] }
)

interface TaskClass {
  string: AskString
  boolean: AskBoolean
  choice: AskChoice
  multiple: AskMultiple
}

export default class TaskPlanner<T extends Record<string, any>> implements TaskClass {
  constructor(private command: BaseCommand) {}

  async string(question: string, defaultValue?: string, hint?: string) {
    return this.command.prompt.ask(question, {
      default: defaultValue,
      hint,
    })
  }

  async boolean(question: string, defaultValue?: boolean, hint?: string) {
    return this.command.prompt.confirm(question, {
      default: defaultValue,
      hint,
    })
  }

  async choice(question: string, options: string[], defaultValue?: string, hint?: string) {
    return this.command.prompt.choice(question, options, {
      default: defaultValue,
      hint,
    })
  }

  async multiple(question: string, options: string[], defaultValue?: string[], hint?: string) {
    return this.command.prompt.multiple(question, options, {
      default: defaultValue,
      hint,
    })
  }

  async script(steps: Step<T>[]): Promise<T> {
    const state = {} as T

    for (const step of steps) {
      if (step.when && !(await step.when(state))) {
        continue
      }

      if (step.type === 'string') {
        state[step.key] = (await this.string(
          step.question,
          step.defaultValue,
          step.hint
        )) as T[keyof T]
      } else if (step.type === 'boolean') {
        state[step.key] = (await this.boolean(
          step.question,
          step.defaultValue,
          step.hint
        )) as T[keyof T]
      } else if (step.type === 'choice') {
        state[step.key] = (await this.choice(
          step.question,
          step.options,
          step.defaultValue,
          step.hint
        )) as T[keyof T]
      } else if (step.type === 'multiple') {
        state[step.key] = (await this.multiple(
          step.question,
          step.options,
          step.defaultValue,
          step.hint
        )) as T[keyof T]
      }
    }
    return state
  }
}
