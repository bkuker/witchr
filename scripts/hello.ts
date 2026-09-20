import { allMoods, greet, isMood, Mood } from '@lib/greeting'

const [name = 'world', moodArg = Mood.Cheerful] = process.argv.slice(2)

if (!isMood(moodArg)) {
  console.error(`Unknown mood "${moodArg}". Choose one of: ${allMoods.join(', ')}`)
  process.exit(1)
}

console.log(greet({ name, mood: moodArg }))
