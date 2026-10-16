import { characterPortraits } from '../data/characterPortraits'

export const hasAnimatedCharacter = (id: string) => Object.prototype.hasOwnProperty.call(characterPortraits, id)

export type CharacterActivity = 'idle' | 'listening' | 'thinking' | 'loading' | 'speaking'
