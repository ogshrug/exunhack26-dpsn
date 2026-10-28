export const EMOJI = { heart: '❤️', thumbs_up: '👍', smile: '😊', laugh: '😂', cry: '😢' } as const
export type EmojiKey = keyof typeof EMOJI
export const KEYS = Object.keys(EMOJI) as EmojiKey[]
