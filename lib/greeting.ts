// Shared, environment-neutral code: no DOM, no Node APIs.
// Both the Vue app and the CLI import from here.

export enum Mood {
  Cheerful = 'cheerful',
  Formal = 'formal',
  Pirate = 'pirate',
}

export const allMoods: Mood[] = Object.values(Mood)

export function isMood(value: string): value is Mood {
  return (allMoods as string[]).includes(value)
}

export interface GreetOptions {
  name: string
  mood?: Mood
}

export function greet({ name, mood = Mood.Cheerful }: GreetOptions): string {
  switch (mood) {
    case Mood.Formal:
      return `Good day, ${name}.`
    case Mood.Pirate:
      return `Ahoy, ${name}!`
    case Mood.Cheerful:
      return `Hey ${name}, great to see you!`
  }
}
