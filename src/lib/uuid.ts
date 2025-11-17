import { nanoid } from 'nanoid';

export const uuid = (length: number = 36) => nanoid(length);