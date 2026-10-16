// The first two characters with an articulated, live conversation portrait.
export const hasAnimatedCharacter = (id: string) => id === 'tran-hung-dao' || id === 'ngo-quyen'

export type CharacterActivity = 'idle' | 'listening' | 'thinking' | 'loading' | 'speaking'
